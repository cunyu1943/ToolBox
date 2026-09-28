<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import CopyButton from '~/components/CopyButton.vue'
import { useStored } from '~/composables/useStored'
import {
  DEFAULT_ITEMS,
  HOUSING_PCT_OPTIONS,
  computeInsurance,
  withHousingPct,
  type InsuranceItem,
  type InsuranceResult
} from '~/tools/social-insurance'

const base = useStored('tool.social-insurance.base', 12000)
const salary = useStored<number | null>('tool.social-insurance.salary', null)
// 深拷贝一份：useStored 在没有存档时直接把初始值当 ref 的当前值，
// 用模块级 DEFAULT_ITEMS 本身会让页面上的编辑改到共享常量。
const items = useStored<InsuranceItem[]>(
  'tool.social-insurance.items',
  DEFAULT_ITEMS.map((item) => ({ ...item }))
)

const showRates = ref(false)

const housingPct = computed({
  get: () => items.value.find((item) => item.id === 'housing')?.personalPct ?? 12,
  set: (value: number) => {
    items.value = withHousingPct(items.value, value)
  }
})

const housingItems = computed(() => HOUSING_PCT_OPTIONS.map((pct) => ({ label: `${pct}%`, value: pct })))

const result = computed<InsuranceResult>(() =>
  computeInsurance({ base: base.value ?? 0, items: items.value, salary: salary.value ?? null })
)
const ok = computed(() => (result.value.ok ? result.value : null))

const money = (value: number): string =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function resetRates(): void {
  items.value = DEFAULT_ITEMS.map((item) => ({ ...item }))
}

const copyText = computed(() => {
  const r = ok.value
  if (!r) return ''
  return [
    `缴费基数：${money(r.base)} 元`,
    ...r.monthlyTable.map(
      (row) => `${row.label}：个人 ${money(row.personal)} / 单位 ${money(row.company)}`
    ),
    `个人合计：${money(r.personalTotal)} 元（占基数 ${r.personalPct}%）`,
    `单位合计：${money(r.companyTotal)} 元`,
    `公积金账户入账：${money(r.housingCredit)} 元`,
    `扣完五险一金（未扣个税）：${money(r.beforeTax)} 元`
  ].join('\n')
})
</script>

<template>
  <ToolShell tool-id="social-insurance">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="缴费基数（元/月）" class="w-44">
        <UInputNumber v-model="base" :step="500" :min="1" :max="1000000" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="实际月薪（元，可空）" class="w-44">
        <UInputNumber v-model="salary" :step="500" :min="0" size="lg" class="w-full" placeholder="用于对比基数是否被压低" />
      </UFormField>
      <UFormField label="公积金比例" class="w-32">
        <USelect v-model="housingPct" :items="housingItems" size="lg" class="w-full" aria-label="公积金比例" />
      </UFormField>
      <UButton
        :label="showRates ? '收起比例编辑' : '按当地比例调整'"
        :icon="showRates ? 'lucide:chevron-up' : 'lucide:sliders-horizontal'"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="showRates = !showRates"
      />
      <UButton label="恢复默认比例" icon="lucide:rotate-ccw" size="xs" color="neutral" variant="ghost" @click="resetRates" />
    </div>

    <section v-if="showRates" class="flex flex-col gap-2">
      <h2 class="text-sm font-medium text-highlighted">各险种比例（%）</h2>
      <ul class="overflow-hidden rounded-xl border border-default">
        <li
          v-for="item in items"
          :key="item.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
        >
          <span class="w-24 shrink-0 text-xs font-medium text-default">{{ item.label }}</span>
          <label class="flex items-center gap-1.5 text-xs text-muted">
            个人
            <UInputNumber v-model="item.personalPct" :step="0.1" :min="0" :max="50" size="sm" class="w-24" />
          </label>
          <label class="flex items-center gap-1.5 text-xs text-muted">
            单位
            <UInputNumber v-model="item.companyPct" :step="0.1" :min="0" :max="50" size="sm" class="w-24" />
          </label>
          <span class="min-w-0 flex-1 text-[11px] text-dimmed">{{ item.note }}</span>
        </li>
      </ul>
      <p class="text-xs text-dimmed">改完的比例存在本地，下次打开还在；要回到全国常见档位点「恢复默认比例」。</p>
    </section>

    <UAlert
      v-if="!ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="无法计算"
      :description="result.error"
    />

    <template v-if="ok">
      <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p class="text-xs text-muted">个人每月缴纳</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">{{ money(ok.personalTotal) }} 元</p>
        </div>
        <div class="flex flex-col gap-1 text-xs">
          <UBadge :label="`占基数 ${ok.personalPct}%`" color="primary" variant="subtle" />
          <UBadge :label="`单位缴纳 ${money(ok.companyTotal)} 元`" color="neutral" variant="ghost" />
          <UBadge v-if="ok.personalSharePct !== null" :label="`占月薪 ${ok.personalSharePct}%`" color="neutral" variant="ghost" />
        </div>
      </div>

      <dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <div class="flex gap-1.5">
          <dt class="text-muted">扣完五险一金</dt>
          <dd class="font-mono text-default">{{ money(ok.beforeTax) }} 元（还没扣个税）</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="text-muted">公积金账户入账</dt>
          <dd class="font-mono text-default">{{ money(ok.housingCredit) }} 元/月</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="text-muted">公司人力成本</dt>
          <dd class="font-mono text-default">{{ money(ok.employerCost) }} 元</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="text-muted">一年双边合计</dt>
          <dd class="font-mono text-default">{{ money(ok.grandTotal * 12) }} 元</dd>
        </div>
      </dl>

      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">逐项明细</h2>
          <CopyButton :text="copyText" label="复制明细" size="xs" />
        </div>
        <div class="overflow-x-auto rounded-xl border border-default">
          <table class="w-full min-w-90 text-right text-xs tabular-nums">
            <thead class="bg-elevated text-muted">
              <tr>
                <th class="p-2 text-left font-medium">项目</th>
                <th class="p-2 font-medium">个人比例</th>
                <th class="p-2 font-medium">个人</th>
                <th class="p-2 font-medium">单位比例</th>
                <th class="p-2 font-medium">单位</th>
                <th class="p-2 font-medium">合计</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in ok.rows" :key="row.id" class="border-t border-default">
                <td class="p-2 text-left font-medium text-default">{{ row.label }}</td>
                <td class="p-2 text-muted">{{ row.personalPct }}%</td>
                <td class="p-2">{{ row.personal > 0 ? money(row.personal) : '—' }}</td>
                <td class="p-2 text-muted">{{ row.companyPct }}%</td>
                <td class="p-2">{{ money(row.company) }}</td>
                <td class="p-2 font-medium">{{ money(row.personal + row.company) }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t border-default bg-elevated">
              <tr>
                <td class="p-2 text-left font-medium text-highlighted">合计</td>
                <td class="p-2 text-muted">{{ ok.personalPct }}%</td>
                <td class="p-2 font-medium text-highlighted">{{ money(ok.personalTotal) }}</td>
                <td class="p-2 text-muted">{{ ((ok.companyTotal / ok.base) * 100).toFixed(2) }}%</td>
                <td class="p-2 font-medium text-highlighted">{{ money(ok.companyTotal) }}</td>
                <td class="p-2 font-medium text-highlighted">{{ money(ok.grandTotal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">公积金比例档位对照（同基数）</h2>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="row in ok.housingLadder"
            :key="row.pct"
            class="rounded-lg border border-default bg-elevated px-3 py-1.5 text-center"
            :class="row.pct === housingPct ? 'border-primary/50 bg-primary/5' : ''"
          >
            <p class="font-mono text-[11px] text-dimmed">{{ row.pct }}%</p>
            <p class="font-mono text-sm text-default">入账 {{ Math.round(row.housingCredit) }}</p>
            <p class="font-mono text-[11px] text-muted">到手 {{ Math.round(row.beforeTax) }}</p>
          </li>
        </ul>
        <p class="text-xs text-dimmed">「入账」是个人 + 单位双边进公积金账户的钱；「到手」是扣完五险一金、未扣个税的月额。</p>
      </section>

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>
  </ToolShell>
</template>
