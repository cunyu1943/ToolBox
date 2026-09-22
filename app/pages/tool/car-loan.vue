<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="price" label="车价" unit="万元" :min="0" :max="2000" />

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-sm font-medium text-slate-600 dark:text-slate-300">首付比例</label>
          <span class="text-sm font-semibold text-vue-600 dark:text-vue-300">{{ downPctWanLabel }}</span>
        </div>
        <div class="flex items-center gap-3">
          <USlider v-model="downPercent" :min="0" :max="100" :step="5" class="flex-1" />
          <UInput
            v-model.number="downPercentInput"
            type="text"
            inputmode="numeric"
            class="w-20"
            @update:model-value="onPercentInput"
          />
          <span class="text-sm text-slate-400">%</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <NumberField v-model="years" label="贷款年限" unit="年" :min="1" :max="10" integer />
        <NumberField v-model="annualRate" label="年利率" unit="%" :min="0" :max="30" />
      </div>

      <UPopover>
        <UButton label="落地价估算（可选）" icon="i-lucide-sliders-horizontal" color="neutral" variant="soft" size="sm" />
        <template #content>
          <div class="p-4 space-y-3 w-64">
            <NumberField v-model="tax" label="购置税" unit="元" :min="0" />
            <NumberField v-model="insurance" label="保险" unit="元" :min="0" />
            <NumberField v-model="plate" label="上牌等费用" unit="元" :min="0" />
          </div>
        </template>
      </UPopover>
    </GlassCard>

    <ResultPanel
      v-if="valid"
      title="车贷方案"
      :value="`${fmt(monthly)} 元`"
      value-label="月供"
      :rows="rows"
      note="月供按等额本息估算，仅供参考。"
      :copy-text="copyText"
    />
    <p v-else class="text-center text-sm text-amber-600 dark:text-amber-400">
      请填写车价、年限与年利率。
    </p>
  </div>
</template>

<script setup lang="ts">
import { calcEqualInstallment } from '~/utils/loan'
import { formatNumber, roundFloat } from '~/utils/number'


const price = ref<number | null>(20) // 万元
const downPercent = ref(30)
const downPercentInput = ref<string | number>(30)
const years = ref<number | null>(3)
const annualRate = ref<number | null>(4.5)

// 落地价估算
const tax = ref<number | null>(0)
const insurance = ref<number | null>(0)
const plate = ref<number | null>(0)

// 滑杆 ↔ 输入框 联动
watch(downPercent, (v) => { downPercentInput.value = v })
function onPercentInput(v: string | number) {
  const n = Math.min(100, Math.max(0, Number(v) || 0))
  downPercent.value = n
}

const priceYuan = computed(() => (price.value ?? 0) * 10000)
const downPayment = computed(() => roundFloat(priceYuan.value * (downPercent.value / 100), 2))
const loanAmount = computed(() => roundFloat(priceYuan.value - downPayment.value, 2))
const valid = computed(() => priceYuan.value > 0 && (years.value ?? 0) > 0 && annualRate.value !== null)

const loan = computed(() =>
  calcEqualInstallment(loanAmount.value, annualRate.value ?? 0, years.value ?? 0)
)
const monthly = computed(() => loan.value.monthlyPayment)

const extraCost = computed(() => (tax.value ?? 0) + (insurance.value ?? 0) + (plate.value ?? 0))
const landingPrice = computed(() => roundFloat(priceYuan.value + extraCost.value, 2))
const totalCost = computed(() => roundFloat(downPayment.value + loan.value.totalPayment + extraCost.value, 2))

const downPctWanLabel = computed(
  () => `${downPercent.value}% （${fmt(downPayment.value)} 元）`
)

function fmt(n: number) {
  return formatNumber(n, { maximumFractionDigits: 2 })
}

const rows = computed(() => [
  { label: '首付金额', value: `${fmt(downPayment.value)} 元` },
  { label: '贷款金额', value: `${fmt(loanAmount.value)} 元` },
  { label: '支付总利息', value: `${fmt(loan.value.totalInterest)} 元` },
  { label: '落地价估算', value: `${fmt(landingPrice.value)} 元` },
  { label: '总花费（首付+还款+杂费）', value: `${fmt(totalCost.value)} 元` }
])

const copyText = computed(() => rows.value.map((r) => `${r.label}：${r.value}`).join('\n'))
</script>
