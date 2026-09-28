<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { BMR_SAMPLES, computeBmr, type BmrInput, type BmrResult } from '~/tools/bmr'
import { useStored } from '~/composables/useStored'

const sexes = [
  { label: '男', value: 'male' as const },
  { label: '女', value: 'female' as const }
]

const sex = useStored<BmrInput['sex']>('tool.bmr.sex', 'male')
const weight = useStored('tool.bmr.weightKg', 75)
const height = useStored('tool.bmr.heightCm', 178)
const age = useStored('tool.bmr.age', 30)
const bodyFat = useStored<number | null>('tool.bmr.bodyFatPercent', 18)
const weekly = useStored('tool.bmr.weeklyKg', 0)

const result = computed<BmrResult>(() =>
  computeBmr(
    {
      sex: sex.value,
      weightKg: weight.value ?? 0,
      heightCm: height.value ?? 0,
      age: age.value ?? 0,
      bodyFatPercent: bodyFat.value ?? null
    },
    weekly.value ?? 0
  )
)
const ok = computed(() => (result.value.ok ? result.value : null))

/** 这段文案在模板里写会踩坑 11（内联多语句），也在脚本里更易于核对 */
const planText = computed(() => {
  const plan = ok.value?.plan
  if (!ok.value || !plan) return ''
  const maintenance = ok.value.tdee.find((item) => item.level.id === 'moderate')?.kcal ?? '—'
  const intake = plan.intake === null ? '—' : `${plan.intake} kcal/日`
  if (plan.targetKgPerWeek === 0) return `以「中度活动」档 ${maintenance} kcal/日 为维持量，保持体重就按 ${intake} 吃。`
  const direction = plan.dailyKcalDelta > 0 ? '缺口' : '盈余'
  return `以「中度活动」档 ${maintenance} kcal/日 为维持量，每周${plan.targetKgPerWeek > 0 ? '增' : '减'} ${Math.abs(plan.targetKgPerWeek)} kg 折成每日${direction} ${Math.abs(plan.dailyKcalDelta)} kcal，对应摄入约 ${intake}。`
})

const summary = computed(() => {
  if (!ok.value) return ''
  const lines = ok.value.formulas.map((item) => `${item.name}：${item.kcal === null ? '（缺体脂率）' : `${item.kcal} kcal/日`}`)
  lines.push('')
  lines.push('TDEE（每日总消耗）：')
  for (const entry of ok.value.tdee) lines.push(`${entry.level.label}（×${entry.level.factor}）：${entry.kcal} kcal/日`)
  if (ok.value.plan?.intake !== null && ok.value.plan) lines.push(`按 ${ok.value.plan.targetKgPerWeek} kg/周 的摄入：${ok.value.plan.intake} kcal/日`)
  return lines.join('\n')
})

function fillSample(label: string): void {
  const sample = BMR_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  sex.value = sample.input.sex
  weight.value = sample.input.weightKg
  height.value = sample.input.heightCm
  age.value = sample.input.age
  bodyFat.value = sample.input.bodyFatPercent
}
</script>

<template>
  <ToolShell tool-id="bmr">
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="sex" :items="sexes" size="lg" class="w-24" aria-label="性别" />
      <UFormField label="体重（kg）" class="w-32">
        <UInputNumber v-model="weight" :step="0.5" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="身高（cm）" class="w-32">
        <UInputNumber v-model="height" :step="1" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="年龄（岁）" class="w-28">
        <UInputNumber v-model="age" :step="1" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="体脂率（%，可空）" class="w-36">
        <UInputNumber v-model="bodyFat" :step="0.5" :min="0" :max="70" size="lg" class="w-full" :controls="false" placeholder="留空跳过" />
      </UFormField>
      <UButton
        v-for="sample in BMR_SAMPLES"
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
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">四个公式的静息代谢</h2>
          <CopyButton :text="summary" />
        </div>
        <ul class="overflow-hidden rounded-xl border border-default">
          <li
            v-for="item in ok.formulas"
            :key="item.id"
            class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
            :class="ok.preferred?.id === item.id ? 'bg-primary/5' : ''"
          >
            <span class="min-w-0 flex-1 text-xs font-medium text-default">
              {{ item.name }}
              <UBadge v-if="ok.preferred?.id === item.id" label="推荐采用" color="primary" variant="subtle" size="sm" />
            </span>
            <span class="font-mono text-sm tabular-nums text-highlighted">
              {{ item.kcal === null ? '—' : `${item.kcal} kcal` }}
            </span>
            <p class="w-full font-mono text-[11px] text-dimmed">{{ item.expression }}</p>
            <p v-if="item.skipped" class="w-full text-[11px] text-warning">{{ item.skipped }}</p>
            <p v-else class="w-full text-[11px] text-muted">{{ item.note }}</p>
          </li>
        </ul>
        <p v-if="ok.leanMassKg !== null" class="text-xs text-muted">
          去脂体重按填入的体脂率算得 <code class="rounded bg-elevated px-1 py-0.5 font-mono">{{ ok.leanMassKg }} kg</code>，
          Katch–McArdle 与 Cunningham 都只依赖它、不依赖身高与年龄。
        </p>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">每日总消耗（TDEE）</h2>
        <ul class="overflow-hidden rounded-xl border border-default">
          <li
            v-for="entry in ok.tdee"
            :key="entry.level.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
          >
            <span class="w-24 shrink-0 text-xs font-medium text-default">{{ entry.level.label }}</span>
            <span class="w-28 shrink-0 font-mono text-[11px] text-dimmed">×{{ entry.level.factor }}</span>
            <span class="font-mono text-sm tabular-nums text-highlighted">{{ entry.kcal }} kcal</span>
            <span class="min-w-0 flex-1 text-[11px] text-muted">{{ entry.level.detail }}</span>
            <span class="w-full font-mono text-[11px] text-dimmed sm:w-auto">只吃到 BMR 则约 −{{ entry.weeklyKg }} kg/周</span>
          </li>
        </ul>
        <p class="text-xs text-dimmed">
          活动系数是群体平均值。真实差异主要来自非运动性活动产热（NEAT：站立、走动、做家务），
          同一档里的人可以差 200–400 kcal，所以这些数字是起点，要用 2–3 周的体重趋势校准。
        </p>
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-end gap-2">
          <h2 class="text-sm font-medium text-highlighted">增减重目标</h2>
          <UFormField label="每周变化（kg，负数=减重）" class="w-44">
            <UInputNumber v-model="weekly" :step="0.25" :min="-1.5" :max="1.5" size="sm" class="w-full" />
          </UFormField>
        </div>
        <p v-if="ok.plan" class="text-xs text-default">{{ planText }}</p>
        <p v-if="ok.plan" class="text-xs text-muted">· {{ ok.plan.note }}</p>
      </section>

      <ul v-if="ok.notes.length" class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      四个公式（Mifflin–St Jeor、Harris–Benedict 修订、Katch–McArdle、Cunningham）都是公开文献里的成年人估算式，
      给出对照是为了让你看到「估算本身有 200 kcal 量级的不确定性」，而不是多出一个精确数字。
      甲状腺疾病、孕期哺乳期、进食障碍史、肾功能不全者请遵医嘱，不要据此自行设定摄入。
    </p>
  </ToolShell>
</template>
