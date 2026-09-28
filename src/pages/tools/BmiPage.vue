<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import { BMI_RANGES, BMI_SAMPLES, computeBmi, type BmiInput, type BmiResult } from '~/tools/bmi'
import { useStored } from '~/composables/useStored'

const units = [
  { label: '公制（公斤 / 厘米）', value: 'metric' as const },
  { label: '英制（磅 / 英寸）', value: 'imperial' as const }
]

const unit = useStored<BmiInput['unit']>('tool.bmi.unit', 'metric')
const weight = useStored('tool.bmi.weight', 65)
const height = useStored('tool.bmi.height', 172)

const result = computed<BmiResult>(() => computeBmi({ unit: unit.value, weight: weight.value ?? 0, height: height.value ?? 0 }))
const ok = computed(() => (result.value.ok ? result.value : null))

const gradeColor = (id: string, label: string): 'success' | 'primary' | 'warning' | 'error' => {
  if (label === '正常范围' || label === '健康') return 'success'
  if (id === 'who' && (label === '超重（前期）' || label === '肥胖 I 度')) return 'warning'
  if (label.includes('过低')) return 'primary'
  if (label.includes('超重') || label.includes('偏高')) return 'warning'
  return 'error'
}

function fillSample(label: string): void {
  const sample = BMI_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  unit.value = sample.input.unit
  weight.value = sample.input.weight
  height.value = sample.input.height
}
</script>

<template>
  <ToolShell tool-id="bmi">
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="unit" :items="units" size="lg" class="w-56" aria-label="单位" />
      <UFormField :label="unit === 'metric' ? '体重（kg）' : '体重（lb）'" class="w-36">
        <UInputNumber v-model="weight" :step="0.5" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField :label="unit === 'metric' ? '身高（cm）' : '身高（in）'" class="w-36">
        <UInputNumber v-model="height" :step="0.5" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UButton
        v-for="sample in BMI_SAMPLES"
        :key="sample.label"
        :label="sample.label"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="fillSample(sample.label)"
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
          <p class="text-xs text-muted">BMI</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">{{ ok.bmi }}</p>
        </div>
        <div class="flex flex-col gap-1">
          <UBadge
            v-for="item in ok.classifications"
            :key="item.range.id"
            :label="`${item.range.title}：${item.grade.label}`"
            :color="gradeColor(item.range.id, item.grade.label)"
            variant="soft"
          />
        </div>
        <dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <div class="flex gap-1.5">
            <dt class="text-muted">公制换算</dt>
            <dd class="font-mono text-default">{{ ok.weightKg }} kg / {{ ok.heightM }} m</dd>
          </div>
          <div class="flex gap-1.5">
            <dt class="text-muted">BMI Prime</dt>
            <dd class="font-mono text-default">{{ ok.bmiPrime }}</dd>
          </div>
          <div class="flex gap-1.5">
            <dt class="text-muted">Ponderal 指数</dt>
            <dd class="font-mono text-default">{{ ok.ponderalIndex }} kg/m³</dd>
          </div>
        </dl>
      </div>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">两套分级标准</h2>
        <div v-for="range in BMI_RANGES" :key="range.id" class="flex flex-col gap-1">
          <p class="text-xs text-muted">{{ range.title }} · 出处：{{ range.source }}</p>
          <ul class="grid grid-cols-2 gap-1 overflow-hidden sm:grid-cols-3 lg:grid-cols-6">
            <li
              v-for="grade in range.grades"
              :key="grade.label"
              class="rounded-lg border px-2 py-1.5 text-xs"
              :class="ok.classifications.some((item) => item.range.id === range.id && item.grade.label === grade.label)
                ? 'border-primary/40 bg-primary/10 text-highlighted'
                : 'border-default text-muted'"
            >
              <p class="font-medium">{{ grade.label }}</p>
              <p class="font-mono text-[11px]">
                {{ grade.min }}–{{ grade.max === null ? '∞' : Math.round((grade.max - 0.1) * 10) / 10 }}
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">以你的身高，正常体重落在</h2>
        <p class="text-lg font-medium tabular-nums text-default">
          {{ ok.healthyKg?.min }}–{{ ok.healthyKg?.max }} kg
          <span v-if="unit === 'imperial'" class="text-sm text-muted">（{{ ((ok.healthyKg?.min ?? 0) / 0.45359237).toFixed(1) }}–{{ ((ok.healthyKg?.max ?? 0) / 0.45359237).toFixed(1) }} lb）</span>
        </p>
        <p v-if="ok.deltaKg" class="text-xs text-muted">
          <template v-if="ok.deltaKg.toUpper < 0">
            当前体重高出正常上限 <strong class="font-medium text-warning">{{ Math.abs(ok.deltaKg.toUpper) }} kg</strong>，
            要回到区间需要减 <strong class="font-medium text-default">{{ Math.abs(ok.deltaKg.toLower) }}–{{ Math.abs(ok.deltaKg.toUpper) }} kg</strong>。
          </template>
          <template v-else>
            当前体重低于正常下限 <strong class="font-medium text-warning">{{ ok.deltaKg.toLower }} kg</strong>，
            要回到区间需要增 <strong class="font-medium text-default">{{ ok.deltaKg.toLower }}–{{ ok.deltaKg.toUpper }} kg</strong>。
          </template>
        </p>
        <p v-else class="text-xs text-success">当前体重已在正常区间内。</p>
      </section>

      <ul v-if="ok.notes.length" class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      BMI 只由身高与体重两个数得出，无法区分脂肪与肌肉，也看不到脂肪长在哪里。它是群体层面的筛查工具，
      不是个人体成分诊断。所有输入都存在浏览器本地，不上传。
    </p>
  </ToolShell>
</template>
