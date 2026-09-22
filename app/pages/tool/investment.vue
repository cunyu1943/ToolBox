<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField v-model="principal" label="初始本金" unit="元" :min="0" />
        <NumberField v-model="rate" label="预期年化收益率" unit="%" :min="0" :max="100" />
        <NumberField v-model="years" label="投资年限" unit="年" :min="0" :max="100" />
        <NumberField v-model="monthly" label="每月定投（可选）" unit="元" :min="0" />
      </div>
    </GlassCard>

    <ResultPanel
      title="投资收益"
      :value="formatMoney(result.finalValue) + ' 元'"
      value-label="期末总资产"
      :rows="rows"
      note="按月复利，定投按期末投入估算；结果为理论值，不构成投资建议。"
      :copy-text="copyText"
    />
  </div>
</template>

<script setup lang="ts">
import { computeInvestment } from '~/utils/investment'
import { formatNumber } from '~/utils/number'


const principal = ref<number | null>(10000)
const rate = ref<number | null>(10)
const years = ref<number | null>(5)
const monthly = ref<number | null>(0)

function formatMoney(v: number): string {
  return formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const result = computed(() =>
  computeInvestment({
    principal: principal.value ?? 0,
    annualRatePct: rate.value ?? 0,
    years: years.value ?? 0,
    monthlyContribution: monthly.value ?? 0
  })
)

const rows = computed(() => [
  { label: '累计投入本金', value: `${formatMoney(result.value.contributed)} 元` },
  { label: '累计收益', value: `${formatMoney(result.value.totalGain)} 元` },
  { label: '总收益率', value: `${result.value.returnPct}%` },
  { label: '投资期', value: `${result.value.months} 个月` }
])

const copyText = computed(
  () =>
    `期末总资产：${formatMoney(result.value.finalValue)} 元\n` +
    rows.value.map((r) => `${r.label}：${r.value}`).join('\n')
)
</script>
