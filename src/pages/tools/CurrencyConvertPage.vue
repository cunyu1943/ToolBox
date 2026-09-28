<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import CopyButton from '~/components/CopyButton.vue'
import { useStored } from '~/composables/useStored'
import {
  DEFAULT_CURRENCIES,
  DEFAULT_UPDATED,
  convert,
  crossTable,
  findCurrency,
  formatByCurrency,
  validateRates,
  type Currency
} from '~/tools/currency-convert'

const amount = useStored('tool.currency-convert.amount', 100)
const from = useStored('tool.currency-convert.from', 'USD')
const to = useStored('tool.currency-convert.to', 'CNY')
const updatedAt = useStored('tool.currency-convert.updatedAt', DEFAULT_UPDATED)
const currencies = useStored<Currency[]>(
  'tool.currency-convert.rates',
  DEFAULT_CURRENCIES.map((item) => ({ ...item }))
)

const showRates = ref(false)

const options = computed(() =>
  currencies.value.map((item) => ({ label: `${item.code} ${item.name}`, value: item.code }))
)

const result = computed(() => convert(amount.value ?? 0, from.value, to.value, currencies.value))
const ok = computed(() => (result.value.ok ? result.value : null))
const problems = computed(() => validateRates(currencies.value))
const table = computed(() => crossTable(from.value, currencies.value))

const decimals = computed(() => findCurrency(currencies.value, to.value)?.decimals ?? 2)
const formatted = computed(() => (ok.value ? formatByCurrency(ok.value.value, ok.value.to) : ''))

function swap(): void {
  const next = to.value
  to.value = from.value
  from.value = next
}

function resetRates(): void {
  currencies.value = DEFAULT_CURRENCIES.map((item) => ({ ...item }))
  updatedAt.value = DEFAULT_UPDATED
}

const copyText = computed(() => {
  const r = ok.value
  if (!r) return ''
  return `${amount.value ?? 0} ${r.from?.code} = ${formatted.value} ${r.to?.code}（1 ${r.from?.code} = ${r.per1.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${r.to?.code}，汇率快照 ${updatedAt.value}）`
})
</script>

<template>
  <ToolShell tool-id="currency-convert">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="金额" class="w-44">
        <UInputNumber v-model="amount" :step="100" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="从" class="w-52">
        <USelect v-model="from" :items="options" size="lg" class="w-full" aria-label="源币种" />
      </UFormField>
      <UButton
        icon="lucide:arrow-left-right"
        color="neutral"
        variant="subtle"
        square
        size="lg"
        aria-label="交换币种"
        class="mb-0.5"
        @click="swap"
      />
      <UFormField label="到" class="w-52">
        <USelect v-model="to" :items="options" size="lg" class="w-full" aria-label="目标币种" />
      </UFormField>
      <UButton
        :label="showRates ? '收起汇率表' : '编辑汇率'"
        :icon="showRates ? 'lucide:chevron-up' : 'lucide:sliders-horizontal'"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="showRates = !showRates"
      />
    </div>

    <UAlert
      v-if="!ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="无法换算"
      :description="result.error"
    />

    <template v-if="ok">
      <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p class="text-xs text-muted">{{ amount }} {{ ok.from?.code }} =</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">
            {{ formatted }} <span class="text-2xl">{{ ok.to?.code }}</span>
          </p>
        </div>
        <div class="flex flex-col gap-1 text-xs">
          <UBadge :label="`1 ${ok.from?.code} = ${ok.per1.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${ok.to?.code}`" color="primary" variant="subtle" />
          <UBadge :label="`反向 1 ${ok.to?.code} = ${ok.perBack.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${ok.from?.code}`" color="neutral" variant="ghost" />
          <UBadge :label="`汇率快照 ${updatedAt}`" color="warning" variant="subtle" />
        </div>
        <p class="min-w-0 basis-full text-xs text-dimmed">
          交叉汇率由「对 CNY 的比值」算出；结果按 {{ ok.to?.code }} 的习惯保留 {{ decimals }} 位小数（日元、韩元面值小，不显示小数）。
        </p>
      </div>

      <div class="flex items-center gap-2">
        <CopyButton :text="copyText" label="复制结果" size="xs" />
      </div>

      <section v-if="showRates" class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">汇率表（1 单位折合 CNY）</h2>
          <UFormField label="最后更新" class="w-44">
            <UInput v-model="updatedAt" type="date" size="xs" class="w-40" />
          </UFormField>
          <UButton label="恢复出厂值" icon="lucide:rotate-ccw" size="xs" color="neutral" variant="ghost" @click="resetRates" />
        </div>

        <UAlert
          v-if="problems.length"
          color="error"
          variant="subtle"
          icon="lucide:circle-alert"
          title="汇率表有问题"
          :description="problems.join('；')"
        />

        <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="item in currencies" :key="item.code" class="flex items-center gap-2 rounded-lg border border-default bg-elevated px-2.5 py-1.5">
            <span class="w-11 shrink-0 font-mono text-xs text-highlighted">{{ item.code }}</span>
            <span class="min-w-0 flex-1 truncate text-[11px] text-dimmed">{{ item.name }}</span>
            <UInputNumber
              v-if="item.code === 'CNY'"
              :model-value="1"
              disabled
              size="xs"
              class="w-20"
              :controls="false"
            />
            <UInputNumber
              v-else
              v-model="item.rateToCny"
              :step="0.01"
              :min="0"
              size="xs"
              class="w-24"
              :controls="false"
            />
          </li>
        </ul>
        <p class="text-xs text-dimmed">
          这一页拿不到实时行情：表里的数字是出厂参考快照，请对着银行或交易所的牌价自己改，改完存本地、下次打开还在。CNY 固定为 1，是其他币种的锚。
        </p>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">1 {{ ok.from?.code }} 能换多少</h2>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="row in table"
            :key="row.code"
            class="min-w-24 rounded-lg border border-default bg-elevated px-3 py-1.5 text-center"
            :class="row.code === to ? 'border-primary/50 bg-primary/5' : ''"
          >
            <p class="font-mono text-[11px] text-dimmed">{{ row.code }}</p>
            <p class="font-mono text-sm text-default tabular-nums">
              {{ row.per1.toLocaleString('en-US', { maximumFractionDigits: row.per1 < 1 ? 6 : 4 }) }}
            </p>
          </li>
        </ul>
      </section>

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li>· 页面上的换算不是实时行情，也不含银行卖出价与现钞汇差 —— 实际结售汇通常比中间价差 0.3%–1%。</li>
        <li>· 信用卡境外消费还可能收 1%–3% 的货币转换费，报价看着便宜不等于到手便宜。</li>
        <li>· 日元、韩元、卢布面值小，1 单位折合的人民币本来就在 1 元以下，比对时看清小数点位置。</li>
      </ul>
    </template>
  </ToolShell>
</template>
