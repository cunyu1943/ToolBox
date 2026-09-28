<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import CopyButton from '~/components/CopyButton.vue'
import { useStored } from '~/composables/useStored'
import {
  LOAN_MODE_LABELS,
  MORTGAGE_SAMPLES,
  computeMortgage,
  planToCsv,
  type LoanMode,
  type MortgageResult
} from '~/tools/mortgage'

const principalWan = useStored('tool.mortgage.principalWan', 100)
const annualRatePct = useStored('tool.mortgage.rate', 3.1)
const years = useStored('tool.mortgage.years', 30)
const mode = useStored<LoanMode>('tool.mortgage.mode', 'annuity')
const showMonthly = useStored('tool.mortgage.showMonthly', false)

const result = computed<MortgageResult>(() =>
  computeMortgage({
    principalWan: principalWan.value ?? 0,
    annualRatePct: annualRatePct.value ?? 0,
    years: years.value ?? 0,
    mode: mode.value
  })
)
const ok = computed(() => (result.value.ok ? result.value : null))
const selected = computed(() => ok.value?.selected ?? null)
const isAnnuity = computed(() => mode.value === 'annuity')

const fmt = (value: number): string =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const modeDetail = computed(
  () => LOAN_MODE_LABELS.find((item) => item.value === mode.value)?.detail ?? ''
)

const copyText = computed(() => {
  const r = ok.value
  if (!r?.selected) return ''
  const p = r.selected
  return [
    `贷款总额：${fmt(r.principalYuan)} 元`,
    `还款方式：${isAnnuity.value ? '等额本息' : '等额本金'}`,
    `年利率：${annualRatePct.value}% · ${years.value} 年（${p.months} 期）`,
    isAnnuity.value ? `月供：${fmt(p.firstPayment)} 元` : `首月月供：${fmt(p.firstPayment)} 元，每月递减 ${fmt(p.monthlyDecrease)} 元，末月 ${fmt(p.lastPayment)} 元`,
    `支付总利息：${fmt(p.totalInterest)} 元`,
    `还款总额：${fmt(p.totalPayment)} 元`,
    `利息占还款总额：${p.interestSharePct}%`
  ].join('\n')
})

function downloadCsv(): void {
  const plan = selected.value
  if (!plan) return
  const csv = planToCsv(plan)
  const blob = new Blob(['' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `还款计划_${isAnnuity.value ? '等额本息' : '等额本金'}_${principalWan.value}万_${years.value}年.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function fillSample(label: string): void {
  const sample = MORTGAGE_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  principalWan.value = sample.input.principalWan
  annualRatePct.value = sample.input.annualRatePct
  years.value = sample.input.years
  mode.value = sample.input.mode
}
</script>

<template>
  <ToolShell tool-id="mortgage">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="贷款总额（万元）" class="w-40">
        <UInputNumber v-model="principalWan" :step="5" :min="1" :max="100000" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="年利率（%）" class="w-32">
        <UInputNumber v-model="annualRatePct" :step="0.05" :min="0" :max="30" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="贷款年限（年）" class="w-32">
        <UInputNumber v-model="years" :step="5" :min="1" :max="40" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="还款方式" class="w-64">
        <USelect v-model="mode" :items="LOAN_MODE_LABELS" size="lg" class="w-full" aria-label="还款方式" />
      </UFormField>
      <UButton
        v-for="sample in MORTGAGE_SAMPLES"
        :key="sample.label"
        :label="sample.label"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="fillSample(sample.label)"
      />
    </div>

    <UAlert
      v-if="!ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="无法计算"
      :description="result.error"
    />

    <template v-if="ok && selected">
      <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p class="text-xs text-muted">{{ isAnnuity ? '每月还' : '首月月供（逐月递减）' }}</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">
            {{ fmt(selected.firstPayment) }} 元
          </p>
        </div>
        <div class="flex flex-col gap-1 text-xs">
          <UBadge :label="`总利息 ${fmt(selected.totalInterest)} 元`" color="primary" variant="subtle" />
          <UBadge :label="`还款总额 ${fmt(selected.totalPayment)} 元`" color="neutral" variant="ghost" />
          <UBadge v-if="!isAnnuity" :label="`每月递减 ${fmt(selected.monthlyDecrease)} 元`" color="neutral" variant="ghost" />
        </div>
        <p class="min-w-0 basis-full text-xs text-dimmed">{{ modeDetail }}</p>
      </div>

      <dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <div class="flex gap-1.5">
          <dt class="text-muted">期数</dt>
          <dd class="font-mono text-default">{{ selected.months }} 期</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="text-muted">利息占比</dt>
          <dd class="font-mono text-default">{{ selected.interestSharePct }}%</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="text-muted">实际年成本</dt>
          <dd class="font-mono text-default">{{ selected.effectiveAnnualPct }}%</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="text-muted">建议月收入</dt>
          <dd class="font-mono text-default">≥ {{ ok.incomeHint?.toLocaleString('en-US') }} 元</dd>
        </div>
      </dl>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">两种还款方式对比</h2>
        <div class="overflow-x-auto rounded-xl border border-default">
          <table class="w-full min-w-105 text-left text-xs">
            <thead class="bg-elevated text-muted">
              <tr>
                <th class="p-2 font-medium">方式</th>
                <th class="p-2 text-right font-medium">月供</th>
                <th class="p-2 text-right font-medium">总利息</th>
                <th class="p-2 text-right font-medium">还款总额</th>
                <th class="p-2 text-right font-medium">利息占比</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="plan in [ok.comparison.annuity, ok.comparison.principal]"
                :key="plan?.mode"
                class="border-t border-default even:bg-elevated/50"
                :class="plan?.mode === mode ? 'bg-primary/5' : ''"
              >
                <td class="p-2 font-medium text-default">
                  {{ plan?.mode === 'annuity' ? '等额本息' : '等额本金' }}
                  <span v-if="plan?.mode === mode" class="ml-1 text-primary">（当前）</span>
                </td>
                <td class="p-2 text-right font-mono tabular-nums">
                  {{ plan?.mode === 'annuity' ? `${fmt(plan?.firstPayment ?? 0)} 元` : `${fmt(plan?.firstPayment ?? 0)} → ${fmt(plan?.lastPayment ?? 0)} 元` }}
                </td>
                <td class="p-2 text-right font-mono tabular-nums">{{ fmt(plan?.totalInterest ?? 0) }}</td>
                <td class="p-2 text-right font-mono tabular-nums">{{ fmt(plan?.totalPayment ?? 0) }}</td>
                <td class="p-2 text-right font-mono tabular-nums">{{ plan?.interestSharePct }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-dimmed">
          同样本金与利率下，等额本息比等额本金多付
          <span class="font-mono text-default">{{ fmt(ok.interestDiff) }}</span> 元利息。
        </p>
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">年度还款汇总</h2>
          <UButton
            :label="showMonthly ? '只看年度汇总' : '看逐月明细'"
            :icon="showMonthly ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            size="xs"
            color="neutral"
            variant="subtle"
            @click="showMonthly = !showMonthly"
          />
          <UButton label="导出逐月 CSV" icon="lucide:download" size="xs" color="neutral" variant="subtle" @click="downloadCsv" />
          <CopyButton :text="copyText" label="复制摘要" size="xs" />
        </div>

        <div v-if="!showMonthly" class="max-h-96 overflow-auto rounded-xl border border-default">
          <table class="w-full min-w-115 text-right text-xs tabular-nums">
            <thead class="sticky top-0 bg-elevated text-muted">
              <tr>
                <th class="p-2 text-left font-medium">年份</th>
                <th class="p-2 font-medium">年还款额</th>
                <th class="p-2 font-medium">其中本金</th>
                <th class="p-2 font-medium">其中利息</th>
                <th class="p-2 font-medium">年末剩余</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in selected.years" :key="row.year" class="border-t border-default">
                <td class="p-2 text-left font-medium text-default">第 {{ row.year }} 年</td>
                <td class="p-2">{{ fmt(row.payment) }}</td>
                <td class="p-2">{{ fmt(row.principal) }}</td>
                <td class="p-2">{{ fmt(row.interest) }}</td>
                <td class="p-2 text-muted">{{ fmt(row.remaining) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="max-h-96 overflow-auto rounded-xl border border-default">
          <table class="w-full min-w-115 text-right text-xs tabular-nums">
            <thead class="sticky top-0 bg-elevated text-muted">
              <tr>
                <th class="p-2 text-left font-medium">期数</th>
                <th class="p-2 font-medium">月供</th>
                <th class="p-2 font-medium">本金</th>
                <th class="p-2 font-medium">利息</th>
                <th class="p-2 font-medium">剩余本金</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in selected.rows" :key="row.period" class="border-t border-default">
                <td class="p-2 text-left font-medium text-default">{{ row.period }}</td>
                <td class="p-2">{{ fmt(row.payment) }}</td>
                <td class="p-2">{{ fmt(row.principal) }}</td>
                <td class="p-2">{{ fmt(row.interest) }}</td>
                <td class="p-2 text-muted">{{ fmt(row.remaining) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>
  </ToolShell>
</template>
