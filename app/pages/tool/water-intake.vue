<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="weightKg" label="体重" unit="kg" :min="20" :max="300" />
      <NumberField v-model="exerciseHours" label="每日运动量" unit="小时" :min="0" :max="12" />
      <NumberField v-model="cupMl" label="每杯容量" unit="ml" :min="100" :max="1000" integer />
    </GlassCard>

    <GlassCard v-if="ml !== null" custom-class="p-5 space-y-3">
      <div class="flex items-end justify-between">
        <div>
          <p class="text-xs text-slate-400">每日建议饮水量</p>
          <p class="text-4xl font-bold tabular-nums text-sky-600 dark:text-sky-400">{{ liters }} <span class="text-lg">L</span></p>
        </div>
        <UBadge :label="`约 ${cups} 杯（${cupMl}ml/杯）`" color="info" size="lg" variant="subtle" />
      </div>
      <!-- 水杯进度条观感：按杯数点亮 -->
      <div class="flex flex-wrap gap-1.5">
        <div
          v-for="i in Math.min(cups, 16)"
          :key="i"
          class="h-6 w-4 rounded-b-lg rounded-t-sm bg-sky-400/80 dark:bg-sky-400/60"
          :style="{ opacity: 1 - (i - 1) * 0.03 }"
        />
      </div>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        参考区间 {{ rangeL.min }}–{{ rangeL.max }} L（30–40ml/kg + 每小时运动补 0.5L）
      </p>
      <p class="text-xs text-slate-400">适用于健康成年人的一般建议，肾病、心衰、孕产妇等特殊人群请遵医嘱；少量多次饮用更佳。</p>
    </GlassCard>
    <p v-else class="text-center text-sm text-amber-600 dark:text-amber-400">请填写有效体重。</p>
  </div>
</template>

<script setup lang="ts">
import { roundFloat } from '~/utils/number'
import { dailyWaterMl, dailyWaterRangeMl, waterCups } from '~/utils/water'

definePageMeta({ layout: 'tool' })

const weightKg = ref<number | null>(60)
const exerciseHours = ref<number | null>(0)
const cupMl = ref<number | null>(250)

const ml = computed(() => dailyWaterMl(weightKg.value ?? 0, exerciseHours.value ?? 0))
const liters = computed(() => (ml.value === null ? '' : roundFloat(ml.value / 1000, 1)))
const cups = computed(() => waterCups(ml.value ?? 0, cupMl.value ?? 250))
const range = computed(() => dailyWaterRangeMl(weightKg.value ?? 0, exerciseHours.value ?? 0))
const rangeL = computed(() =>
  range.value
    ? { min: roundFloat(range.value.min / 1000, 1), max: roundFloat(range.value.max / 1000, 1) }
    : { min: 0, max: 0 }
)
</script>
