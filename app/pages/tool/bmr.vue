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
      <label class="block space-y-1">
        <span class="text-xs text-slate-500 dark:text-slate-400">日常活动量</span>
        <USelect v-model="activityLabel" :items="activityOptions" class="w-full" />
      </label>
    </GlassCard>

    <GlassCard v-if="bmr !== null" custom-class="p-5 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg bg-slate-50 p-4 dark:bg-white/5">
          <p class="text-xs text-slate-400">基础代谢率 BMR</p>
          <p class="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{{ bmr }} <span class="text-sm font-medium">kcal/天</span></p>
          <p class="mt-1 text-xs text-slate-400">完全静息时每日最低热量消耗</p>
        </div>
        <div class="rounded-lg bg-vue-500/10 p-4 ring-1 ring-vue-500/20">
          <p class="text-xs text-slate-400">每日总消耗 TDEE</p>
          <p class="text-2xl font-bold tabular-nums text-vue-600 dark:text-vue-300">{{ tdee }} <span class="text-sm font-medium">kcal/天</span></p>
          <p class="mt-1 text-xs text-slate-400">按「{{ activityLabel }}」折算</p>
        </div>
      </div>
      <p class="text-xs text-slate-400">
        BMR 采用 Mifflin-St Jeor 公式（当前国际通用度最高），TDEE = BMR × 活动系数；摄入长期低于 BMR 不利于健康，仅供参考。
      </p>
    </GlassCard>
    <p v-else class="text-center text-sm text-amber-600 dark:text-amber-400">请填写有效的年龄、身高与体重（年龄限 10–120 岁）。</p>
  </div>
</template>

<script setup lang="ts">
import { activityLevels, calcBmr, calcTdee } from '~/utils/bmr'

definePageMeta({ layout: 'tool' })

const genderOptions = ['男', '女']
const activityOptions = activityLevels.map((a) => a.label)

const genderLabel = ref('男')
const activityLabel = ref(activityOptions[0]!)
const age = ref<number | null>(30)
const heightCm = ref<number | null>(175)
const weightKg = ref<number | null>(70)

const bmr = computed(() =>
  calcBmr({
    gender: genderLabel.value === '男' ? 'male' : 'female',
    weightKg: weightKg.value ?? 0,
    heightCm: heightCm.value ?? 0,
    age: age.value ?? 0
  })
)
const tdee = computed(() => {
  if (bmr.value === null) return null
  const mult = activityLevels.find((a) => a.label === activityLabel.value)?.mult ?? 1.2
  return calcTdee(bmr.value, mult)
})
</script>
