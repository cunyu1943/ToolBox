<template>
  <div class="space-y-4">
    <!-- 两日期相差 -->
    <GlassCard custom-class="p-5 space-y-4">
      <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">两个日期相差</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">起始日期</label>
          <UInput v-model="from" type="date" class="w-full" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">结束日期</label>
          <UInput v-model="to" type="date" class="w-full" />
        </div>
      </div>
    </GlassCard>

    <ResultPanel
      v-if="betweenRows.length"
      title="相差"
      :rows="betweenRows"
      :copy-text="betweenCopy"
    />

    <!-- 日期加减 -->
    <GlassCard custom-class="p-5 space-y-4">
      <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">日期加减天数</h2>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">基准日期</label>
          <UInput v-model="baseDate" type="date" class="w-full" />
        </div>
        <NumberField v-model="offsetDays" label="增减天数（负数为往前）" :integer="true" placeholder="如 30 或 -7" />
      </div>
    </GlassCard>

    <ResultPanel v-if="shiftRows.length" title="结果" :rows="shiftRows" :copy-text="shiftCopy" />
  </div>
</template>

<script setup lang="ts">
import { addDays, daysBetween, diffComponents, weekday } from '~/utils/date-calc'

definePageMeta({ layout: 'tool' })

const today = new Date().toISOString().slice(0, 10)
const from = ref(today)
const to = ref(today)
const baseDate = ref(today)
const offsetDays = ref<number | null>(30)

const betweenRows = computed(() => {
  const d = daysBetween(from.value, to.value)
  if (d === null) return []
  const c = diffComponents(from.value, to.value)
  const rows = [
    { label: `共相差天数`, value: `${d} 天` },
    { label: '起始日星期', value: weekday(from.value) ?? '—' },
    { label: '结束日星期', value: weekday(to.value) ?? '—' }
  ]
  if (c) rows.splice(1, 0, { label: '年 / 月 / 日', value: `${c.years} 年 ${Math.abs(c.months)} 个月 ${Math.abs(c.days)} 天` })
  return rows
})

const betweenCopy = computed(
  () => `${from.value} → ${to.value}\n共相差 ${daysBetween(from.value, to.value) ?? '—'} 天`
)

const shiftRows = computed(() => {
  const r = addDays(baseDate.value, offsetDays.value ?? 0)
  if (r === null) return []
  return [
    { label: baseDate.value, value: weekday(baseDate.value) ?? '' },
    { label: `${(offsetDays.value ?? 0) >= 0 ? '+' : ''}${offsetDays.value ?? 0} 天后`, value: `${r}（${weekday(r) ?? ''}）` }
  ]
})

const shiftCopy = computed(() => shiftRows.value.map((r) => `${r.label}：${r.value}`).join('\n'))
</script>
