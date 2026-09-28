<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import CopyButton from '~/components/CopyButton.vue'
import { useStored } from '~/composables/useStored'
import {
  CAR_LOAN_MODE_LABELS,
  CAR_LOAN_SAMPLES,
  computeCarLoan,
  estimatePurchaseTax,
  type CarLoanMode,
  type CarLoanResult
} from '~/tools/car-loan'

const priceWan = useStored('tool.car-loan.priceWan', 20)
const downPercent = useStored('tool.car-loan.downPercent', 30)
const years = useStored('tool.car-loan.years', 3)
const ratePct = useStored('tool.car-loan.ratePct', 4.5)
const mode = useStored<CarLoanMode>('tool.car-loan.mode', 'annuity')
const purchaseTax = useStored('tool.car-loan.purchaseTax', 0)
const insurance = useStored('tool.car-loan.insurance', 0)
const plateFee = useStored('tool.car-loan.plateFee', 0)

const result = computed<CarLoanResult>(() =>
  computeCarLoan({
    priceWan: priceWan.value ?? 0,
    downPercent: downPercent.value ?? 0,
    years: years.value ?? 0,
    ratePct: ratePct.value ?? 0,
    mode: mode.value,
    purchaseTax: purchaseTax.value ?? 0,
    insurance: insurance.value ?? 0,
    plateFee: plateFee.value ?? 0
  })
)
const ok = computed(() => (result.value.ok ? result.value : null))
const isFlat = computed(() => mode.value === 'flat')

const fmt = (value: number): string =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const rateLabel = computed(() => (isFlat.value ? '月费率（%）' : '年利率（%）'))

function switchMode(next: CarLoanMode): void {
  mode.value = next
}

function fillSample(label: string): void {
  const sample = CAR_LOAN_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  priceWan.value = sample.input.priceWan
  downPercent.value = sample.input.downPercent
  years.value = sample.input.years
  ratePct.value = sample.input.ratePct
  mode.value = sample.input.mode
  purchaseTax.value = sample.input.purchaseTax
  insurance.value = sample.input.insurance
  plateFee.value = sample.input.plateFee
}

const copyText = computed(() => {
  const r = ok.value
  if (!r) return ''
  return [
    `车价：${fmt(r.priceYuan)} 元`,
    `首付 ${downPercent.value}%：${fmt(r.downPayment)} 元`,
    `贷款：${fmt(r.loanYuan)} 元 / ${r.months} 期`,
    `月供：${fmt(r.monthlyPayment)} 元`,
    `总利息：${fmt(r.totalInterest)} 元`,
    r.effective ? `真实年化：${r.effective.nominalAprPct}%（实际年成本 ${r.effective.effectiveAnnualPct}%）` : '',
    `杂费：${fmt(r.extraFees)} 元`,
    `落地价：${fmt(r.landingPrice)} 元`,
    `总花费：${fmt(r.totalCost)} 元`
  ]
    .filter(Boolean)
    .join('\n')
})
</script>

<template>
  <ToolShell tool-id="car-loan">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="车价（万元）" class="w-36">
        <UInputNumber v-model="priceWan" :step="1" :min="0.1" :max="2000" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="首付比例（%）" class="w-32">
        <UInputNumber v-model="downPercent" :step="5" :min="0" :max="100" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="贷款年限（年）" class="w-32">
        <UInputNumber v-model="years" :step="1" :min="1" :max="10" size="lg" class="w-full" />
      </UFormField>
      <UFormField :label="rateLabel" class="w-32">
        <UInputNumber v-model="ratePct" :step="0.05" :min="0" :max="30" size="lg" class="w-full" />
      </UFormField>
      <UButton
        v-for="sample in CAR_LOAN_SAMPLES"
        :key="sample.label"
        :label="sample.label"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="fillSample(sample.label)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted">计息方式</span>
      <UButton
        v-for="item in CAR_LOAN_MODE_LABELS"
        :key="item.value"
        :label="item.label"
        size="xs"
        :color="mode === item.value ? 'primary' : 'neutral'"
        :variant="mode === item.value ? 'subtle' : 'outline'"
        @click="switchMode(item.value)"
      />
      <span class="min-w-0 basis-full text-xs text-dimmed">
        {{ CAR_LOAN_MODE_LABELS.find((item) => item.value === mode)?.detail }}
      </span>
    </div>

    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="购置税（元）" class="w-36">
        <UInputNumber v-model="purchaseTax" :step="500" :min="0" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="保险（元）" class="w-32">
        <UInputNumber v-model="insurance" :step="500" :min="0" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="上牌等费用（元）" class="w-36">
        <UInputNumber v-model="plateFee" :step="100" :min="0" size="lg" class="w-full" />
      </UFormField>
      <UButton
        label="按 10% 估算购置税"
        icon="lucide:calculator"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="purchaseTax = estimatePurchaseTax((priceWan ?? 0) * 10000)"
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

    <template v-if="ok">
      <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p class="text-xs text-muted">月供</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">{{ fmt(ok.monthlyPayment) }} 元</p>
        </div>
        <div class="flex flex-col gap-1 text-xs">
          <UBadge :label="`首付 ${fmt(ok.downPayment)} 元`" color="primary" variant="subtle" />
          <UBadge :label="`贷款 ${fmt(ok.loanYuan)} 元 / ${ok.months} 期`" color="neutral" variant="ghost" />
          <UBadge :label="`总利息 ${fmt(ok.totalInterest)} 元`" color="neutral" variant="ghost" />
        </div>
      </div>

      <UAlert
        v-if="ok.effective"
        color="warning"
        variant="subtle"
        icon="lucide:triangle-alert"
        title="费率口径的真实成本更高"
        :description="`月费率 ${ok.effective.feePct}% 反解出的真实年化是 ${ok.effective.nominalAprPct}%，实际年成本 ${ok.effective.effectiveAnnualPct}%。销售说的「年利率 3 厘」通常就是这个费率乘以 12。`"
      />

      <dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <div class="flex gap-1.5">
          <dt class="text-muted">落地价估算</dt>
          <dd class="font-mono text-default">{{ fmt(ok.landingPrice) }} 元</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="text-muted">杂费合计</dt>
          <dd class="font-mono text-default">{{ fmt(ok.extraFees) }} 元</dd>
        </div>
        <div class="flex gap-1.5">
          <dt class="text-muted">总花费</dt>
          <dd class="font-mono text-highlighted">{{ fmt(ok.totalCost) }} 元</dd>
        </div>
        <div v-if="ok.annuityCompare" class="flex gap-1.5">
          <dt class="text-muted">同真实年化改等额本息</dt>
          <dd class="font-mono text-default">
            月供 {{ fmt(ok.annuityCompare.firstPayment) }} 元 / 利息 {{ fmt(ok.annuityCompare.totalInterest) }} 元
          </dd>
        </div>
      </dl>

      <div class="flex items-center gap-2">
        <CopyButton :text="copyText" label="复制方案" size="xs" />
        <span class="text-xs text-dimmed">按 20% 首付起算，多数银行低于 20% 首付会加价或要求保证金。</span>
      </div>

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>
  </ToolShell>
</template>
