<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="principal" label="贷款总额" unit="万元" :min="0" :max="100000" />
      <NumberField v-model="annualRate" label="年利率" unit="%" :min="0" :max="30" />
      <NumberField v-model="years" label="贷款年限" unit="年" :min="1" :max="40" integer />

      <div>
        <p class="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">还款方式</p>
        <USwitch v-model="isInstallment" color="primary" />
        <span class="ml-2 text-sm text-slate-500 dark:text-slate-400">
          {{ isInstallment ? '等额本息（月供固定）' : '等额本金（逐月递减）' }}
        </span>
      </div>
    </GlassCard>

    <ResultPanel
      v-if="valid && result"
      :title="isInstallment ? '等额本息' : '等额本金'"
      :value="monthlyText"
      value-label="月供"
      :rows="rows"
      :note="'月供为估算，实际以银行核定为准。'"
      :copy-text="copyText"
    />

    <GlassCard v-if="valid && result" custom-class="p-5">
      <div class="flex items-center justify-between">
        <h3 class="font-medium">两种方案对比</h3>
        <UButton
          label="导出还款计划 CSV"
          icon="i-lucide-download"
          color="neutral"
          variant="soft"
          size="sm"
          :disabled="!result.schedule.length"
          @click="exportCsv"
        />
      </div>
      <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div class="rounded-xl bg-vue-500/5 p-3 dark:bg-white/5">
          <p class="text-slate-500 dark:text-slate-400">等额本息总利息</p>
          <p class="font-semibold tabular-nums">{{ fmt(installment.totalInterest) }} 元</p>
        </div>
        <div class="rounded-xl bg-vue-500/5 p-3 dark:bg-white/5">
          <p class="text-slate-500 dark:text-slate-400">等额本金总利息</p>
          <p class="font-semibold tabular-nums">{{ fmt(principalMode.totalInterest) }} 元</p>
        </div>
      </div>

      <!-- 可展开的还款计划表 -->
      <UButton
        class="mt-4"
        :label="showSchedule ? '收起还款计划' : '展开还款计划'"
        :icon="showSchedule ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="showSchedule = !showSchedule"
      />
      <div v-if="showSchedule" class="mt-2 max-h-80 overflow-auto rounded-xl border border-slate-200/60 dark:border-white/10">
        <table class="w-full text-right text-xs">
          <thead class="sticky top-0 bg-slate-100/80 backdrop-blur dark:bg-slate-900/80">
            <tr class="text-slate-500 dark:text-slate-400">
              <th class="p-2 text-left">期数</th>
              <th class="p-2">月供</th>
              <th class="p-2">本金</th>
              <th class="p-2">利息</th>
              <th class="p-2">剩余</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in result.schedule" :key="r.period" class="border-t border-slate-100 dark:border-white/5">
              <td class="p-2 text-left tabular-nums">{{ r.period }}</td>
              <td class="p-2 tabular-nums">{{ r.payment }}</td>
              <td class="p-2 tabular-nums">{{ r.principal }}</td>
              <td class="p-2 tabular-nums">{{ r.interest }}</td>
              <td class="p-2 tabular-nums">{{ r.remaining }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <p v-if="!valid" class="text-center text-sm text-amber-600 dark:text-amber-400">
      请填写完整的贷款金额、年利率与年限。
    </p>
  </div>
</template>

<script setup lang="ts">
import { calcEqualInstallment, calcEqualPrincipal, scheduleToCsv } from '~/utils/loan'
import type { LoanResult } from '~/types'
import { formatNumber } from '~/utils/number'


const principal = ref<number | null>(100) // 万元
const annualRate = ref<number | null>(4.9)
const years = ref<number | null>(30)
const isInstallment = ref(true)
const showSchedule = ref(false)

const principalYuan = computed(() => (principal.value ?? 0) * 10000)
const valid = computed(
  () => principalYuan.value > 0 && annualRate.value !== null && (years.value ?? 0) > 0
)

const installment = computed<LoanResult>(() =>
  calcEqualInstallment(principalYuan.value, annualRate.value ?? 0, years.value ?? 0)
)
const principalMode = computed<LoanResult>(() =>
  calcEqualPrincipal(principalYuan.value, annualRate.value ?? 0, years.value ?? 0)
)
const result = computed(() => (isInstallment.value ? installment.value : principalMode.value))

function fmt(n: number): string {
  return formatNumber(n, { maximumFractionDigits: 2 })
}

const monthlyText = computed(() => {
  if (!result.value) return ''
  if (isInstallment.value) return `${fmt(result.value.monthlyPayment)} 元`
  return `${fmt(result.value.monthlyPayment)} 元起（逐月递减）`
})

const rows = computed(() => {
  const r = result.value
  if (!r) return []
  const base = [
    { label: '贷款总额', value: `${fmt(principalYuan.value)} 元` },
    { label: '支付总利息', value: `${fmt(r.totalInterest)} 元` },
    { label: '还款总额', value: `${fmt(r.totalPayment)} 元` }
  ]
  if (!isInstallment.value) {
    base.unshift(
      { label: '首月月供', value: `${fmt(r.monthlyPayment)} 元` },
      { label: '每月递减', value: `${fmt(r.monthlyDecrease)} 元` },
      { label: '末月月供', value: `${fmt(r.lastPayment)} 元` }
    )
  }
  return base
})

const copyText = computed(() =>
  rows.value.map((r) => `${r.label}：${r.value}`).join('\n')
)

function exportCsv() {
  const csv = scheduleToCsv(result.value)
  const blob = new Blob(['' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `还款计划_${isInstallment.value ? '等额本息' : '等额本金'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
