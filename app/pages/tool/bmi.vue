<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="flex justify-center">
        <div class="inline-flex rounded-xl border border-slate-200/70 p-1 dark:border-white/10">
          <button
            v-for="opt in unitOptions"
            :key="opt.value"
            type="button"
            class="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
            :class="unitSystem === opt.value
              ? 'bg-vue-500 text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
            @click="unitSystem = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <template v-if="unitSystem === 'metric'">
        <NumberField v-model="heightCm" label="身高" unit="cm" :min="50" :max="250" />
        <NumberField v-model="weightKg" label="体重" unit="kg" :min="2" :max="400" />
      </template>
      <template v-else>
        <div class="grid grid-cols-2 gap-3">
          <NumberField v-model="feet" label="身高-英尺" unit="ft" :min="1" :max="8" integer />
          <NumberField v-model="inches" label="身高-英寸" unit="in" :min="0" :max="11" integer />
        </div>
        <NumberField v-model="weightLb" label="体重" unit="lb" :min="5" :max="880" />
      </template>
    </GlassCard>

    <GlassCard v-if="bmi !== null" custom-class="p-5">
      <div class="flex items-end justify-between">
        <div>
          <p class="text-xs text-slate-400">你的 BMI</p>
          <p class="text-4xl font-bold tabular-nums" :class="levelTextClass">{{ bmi }}</p>
        </div>
        <UBadge :label="level.label" :color="badgeColor" size="lg" variant="subtle" />
      </div>

      <!-- 可视化色条 + 指针 -->
      <div class="relative mt-4 h-3 w-full overflow-hidden rounded-full">
        <div class="flex h-full w-full">
          <div class="bg-sky-400" style="width: 46.25%" />
          <div class="bg-green-500" style="width: 13.75%" />
          <div class="bg-amber-400" style="width: 10%" />
          <div class="bg-red-500" style="width: 30%" />
        </div>
        <div
          class="absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 ring-2 ring-white dark:bg-white dark:ring-slate-900 transition-all duration-200"
          :style="{ left: position + '%' }"
          aria-hidden="true"
        />
      </div>
      <div class="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>0</span><span>18.5</span><span>24</span><span>28</span><span>40</span>
      </div>

      <p v-if="range" class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        健康体重区间（BMI 18.5–23.9）：<span class="font-medium text-slate-700 dark:text-slate-200">{{ range.min }}–{{ range.max }} {{ weightUnitLabel }}</span>
      </p>
      <p class="mt-2 text-xs text-slate-400">
        分级采用中国成人标准，仅供参考。数据来源：WHO《BMI 分级》及《中国成人超重和预防指南》。
      </p>
    </GlassCard>
    <p v-else class="text-center text-sm text-amber-600 dark:text-amber-400">请填写身高与体重。</p>
  </div>
</template>

<script setup lang="ts">
import { bmiLevel, bmiPosition, calcBmi, ftInToCm, healthyWeightRange, lbToKg } from '~/utils/bmi'
import { roundFloat } from '~/utils/number'

definePageMeta({ layout: 'tool' })

const unitSystem = ref<'metric' | 'imperial'>('metric')
const unitOptions = [
  { label: '公制 cm/kg', value: 'metric' as const },
  { label: '英制 ft/lb', value: 'imperial' as const }
]

const heightCm = ref<number | null>(170)
const weightKg = ref<number | null>(65)
const feet = ref<number | null>(5)
const inches = ref<number | null>(7)
const weightLb = ref<number | null>(143)

const heightM = computed(() =>
  unitSystem.value === 'metric' ? (heightCm.value ?? 0) : ftInToCm(feet.value ?? 0, inches.value ?? 0)
)
const weightK = computed(() =>
  unitSystem.value === 'metric' ? (weightKg.value ?? 0) : lbToKg(weightLb.value ?? 0)
)

const bmi = computed(() => {
  const v = calcBmi(heightM.value, weightK.value)
  return v === null ? null : roundFloat(v, 1)
})
const level = computed(() => bmiLevel(bmi.value ?? 0))
// 将分级色映射为 @nuxt/ui v4 语义色
const badgeColor = computed(
  () => (({ sky: 'info', green: 'success', amber: 'warning', red: 'error' }) as Record<string, 'info' | 'success' | 'warning' | 'error'>)[level.value.color] ?? 'neutral'
)
const position = computed(() => bmiPosition(bmi.value ?? 0))
const range = computed(() => {
  const r = healthyWeightRange(heightM.value)
  if (!r) return null
  return unitSystem.value === 'metric'
    ? { min: r.min, max: r.max }
    : { min: roundFloat(r.min / 0.45359237, 1), max: roundFloat(r.max / 0.45359237, 1) }
})
const weightUnitLabel = computed(() => (unitSystem.value === 'metric' ? 'kg' : 'lb'))
const levelTextClass = computed(
  () =>
    ({
      sky: 'text-sky-500',
      green: 'text-green-600 dark:text-green-400',
      amber: 'text-amber-500',
      red: 'text-red-500'
    })[level.value.color] ?? 'text-slate-800'
)
</script>
