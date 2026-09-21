<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">求一个数的百分之几</p>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <UInput v-model="p1" size="lg" class="w-28 font-mono" placeholder="15" />
        <span class="text-slate-400">% 的</span>
        <UInput v-model="v1" size="lg" class="w-32 font-mono" placeholder="200" />
        <span class="text-slate-400">是</span>
        <span class="text-2xl font-semibold text-vue-600">{{ fmt(r1) }}</span>
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">一个数是另一个数的百分之几</p>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <UInput v-model="x2" size="lg" class="w-28 font-mono" placeholder="30" />
        <span class="text-slate-400">是</span>
        <UInput v-model="y2" size="lg" class="w-28 font-mono" placeholder="150" />
        <span class="text-slate-400">的</span>
        <span class="text-2xl font-semibold text-vue-600">{{ pct2 === null ? '—' : fmt(pct2) + '%' }}</span>
      </div>
      <p v-if="pct2 === null && x2 && y2" class="text-sm text-red-500">基数不能为 0</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">变化百分比（增幅 / 降幅）</p>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <UInput v-model="a3" size="lg" class="w-28 font-mono" placeholder="50" />
        <span class="text-slate-400">→</span>
        <UInput v-model="b3" size="lg" class="w-28 font-mono" placeholder="75" />
        <template v-if="change">
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="change.direction === 'increase'
              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
              : change.direction === 'decrease'
                ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'bg-slate-100 text-slate-500 dark:bg-white/5'"
          >{{ change.direction === 'increase' ? '增长' : change.direction === 'decrease' ? '下降' : '持平' }}</span>
          <span class="text-2xl font-semibold text-vue-600">{{ fmt(Math.abs(change.percent)) }}%</span>
        </template>
        <span v-else class="text-2xl font-semibold text-slate-300 dark:text-slate-600">—</span>
      </div>
      <p v-if="!change && a3 && b3 && toNum(a3) === 0" class="text-sm text-red-500">起始值不能为 0</p>
    </GlassCard>
    <p class="text-xs text-slate-400">公式：a% × b；x ÷ y × 100；(b − a) ÷ a × 100。结果实时计算，保留最多 10 位有效小数。</p>
  </div>
</template>

<script setup lang="ts">
import { partOf, percentOf, changePercent } from '~/utils/percent-tool'
import { formatNumber } from '~/utils/number'

definePageMeta({ layout: 'tool' })

const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s))
const p1 = ref('15')
const v1 = ref('200')
const x2 = ref('30')
const y2 = ref('150')
const a3 = ref('50')
const b3 = ref('75')

function fmt(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—'
  return formatNumber(n, { maximumFractionDigits: 6 })
}

const r1 = computed(() => {
  const v = partOf(toNum(p1.value), toNum(v1.value))
  return Number.isFinite(v) ? v : null
})
const pct2 = computed(() => {
  const v = percentOf(toNum(x2.value), toNum(y2.value))
  return Number.isFinite(v) ? v : null
})
const change = computed(() => changePercent(toNum(a3.value), toNum(b3.value)))
</script>
