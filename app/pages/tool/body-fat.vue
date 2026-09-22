<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <label class="space-y-1">
          <span class="text-xs text-slate-500 dark:text-slate-400">性别</span>
          <USelect v-model="genderLabel" :items="genderOptions" class="w-full" />
        </label>
        <NumberField v-model="age" label="年龄" unit="岁" :min="10" :max="120" integer />
      </div>
      <NumberField v-model="heightCm" label="身高" unit="cm" :min="100" :max="250" />
      <NumberField v-model="weightKg" label="体重" unit="kg" :min="20" :max="300" />
    </GlassCard>

    <GlassCard v-if="bodyFat !== null" custom-class="p-5 space-y-3">
      <div class="flex items-end justify-between">
        <div>
          <p class="text-xs text-slate-400">估算体脂率</p>
          <p class="text-4xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{{ bodyFat }}<span class="text-lg">%</span></p>
        </div>
        <UBadge :label="level.label" color="primary" size="lg" variant="subtle" />
      </div>
      <div class="space-y-1.5">
        <div
          v-for="l in levels"
          :key="l.label"
          class="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm"
          :class="l.label === level.label ? 'bg-vue-500/10 font-medium text-vue-700 ring-1 ring-vue-500/30 dark:text-vue-300' : 'text-slate-500 dark:text-slate-400'"
        >
          <span>{{ l.label }}</span>
          <span class="tabular-nums text-xs">{{ rangeLabel(l) }}</span>
        </div>
      </div>
      <p class="text-xs text-slate-400">
        采用 Deurenberg 公式（基于 BMI 估算），分级参考 American Council on Exercise 标准；与DEXA等实测会有偏差，仅供参考。
      </p>
    </GlassCard>
    <p v-else class="text-center text-sm text-amber-600 dark:text-amber-400">请填写有效的性别、年龄、身高与体重。</p>
  </div>
</template>

<script setup lang="ts">
import { bodyFatLevel, bodyFatLevels, calcBodyFat } from '~/utils/body-fat'

definePageMeta({ layout: 'tool' })

const genderOptions = ['男', '女']
const genderLabel = ref('男')
const age = ref<number | null>(30)
const heightCm = ref<number | null>(175)
const weightKg = ref<number | null>(70)

const gender = computed(() => (genderLabel.value === '男' ? 'male' : 'female'))
const bodyFat = computed(() =>
  calcBodyFat({ gender: gender.value, weightKg: weightKg.value ?? 0, heightCm: heightCm.value ?? 0, age: age.value ?? 0 })
)
const levels = computed(() => bodyFatLevels[gender.value])
const level = computed(() => bodyFatLevel(gender.value, bodyFat.value ?? 0))

function rangeLabel(l: { min: number; max: number }): string {
  return Number.isFinite(l.max) ? `${l.min}% – ${l.max}%` : `≥ ${l.min}%`
}
</script>
