<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <NumberField v-model="age" label="年龄" unit="岁" :min="10" :max="120" integer />
        <NumberField v-model="restingHr" label="静息心率" unit="bpm" :min="30" :max="220" integer />
      </div>
      <p class="text-xs text-slate-400">静息心率建议早晨清醒后静坐 1 分钟再测，常用参考值 60–75 bpm。</p>
    </GlassCard>

    <GlassCard v-if="result" custom-class="p-5 space-y-3">
      <p class="text-sm text-slate-500 dark:text-slate-400">
        预估最大心率：<span class="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{{ result.max }} bpm</span>（220 − 年龄）
      </p>
      <div class="space-y-2">
        <div
          v-for="z in result.zones"
          :key="z.zone.key"
          class="flex items-center gap-3 rounded-lg px-3 py-2"
        >
          <span class="h-8 w-1.5 shrink-0 rounded-full" :class="barClass(z.zone.key)" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ z.zone.label }}
              <span class="ml-1 text-xs font-normal text-slate-400">{{ Math.round(z.zone.low * 100) }}%–{{ Math.round(z.zone.high * 100) }}%</span>
            </p>
            <p class="text-xs text-slate-400">{{ z.zone.desc }}</p>
          </div>
          <span class="shrink-0 tabular-nums text-sm font-semibold text-slate-600 dark:text-slate-300">{{ z.min }}–{{ z.max }} bpm</span>
        </div>
      </div>
      <p class="text-xs text-slate-400">按 Karvonen 储备心率法计算：目标心率 = 静息 + (最大 − 静息) × 强度%。用药（如 β 受体阻滞剂）会压低心率，请遵医嘱。</p>
    </GlassCard>
    <p v-else class="text-center text-sm text-amber-600 dark:text-amber-400">请填写有效的年龄与静息心率（静息心率需小于最大心率）。</p>
  </div>
</template>

<script setup lang="ts">
import { heartRateZonesFor } from '~/utils/heart-rate'

definePageMeta({ layout: 'tool' })

const age = ref<number | null>(30)
const restingHr = ref<number | null>(65)

const result = computed(() => heartRateZonesFor(age.value ?? 0, restingHr.value ?? 0))

// 五档固定静态色阶（Tailwind JIT 不支持动态拼接类名）
function barClass(key: string): string {
  return {
    warmup: 'bg-sky-400',
    fatburn: 'bg-green-500',
    aerobic: 'bg-amber-400',
    anaerobic: 'bg-orange-500',
    maximum: 'bg-red-500'
  }[key] ?? 'bg-slate-300'
}
</script>
