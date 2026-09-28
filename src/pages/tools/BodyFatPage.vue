<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import { BODY_FAT_SAMPLES, computeBodyFat, type BodyFatInput, type FatResult } from '~/tools/body-fat'
import { useStored } from '~/composables/useStored'

const sexes = [
  { label: '男', value: 'male' as const },
  { label: '女', value: 'female' as const }
]

const sex = useStored<BodyFatInput['sex']>('tool.body-fat.sex', 'male')
const weight = useStored('tool.body-fat.weightKg', 72)
const height = useStored('tool.body-fat.heightCm', 175)
const age = useStored<number | null>('tool.body-fat.age', 30)
const waist = useStored<number | null>('tool.body-fat.waistCm', 80)
const hip = useStored<number | null>('tool.body-fat.hipCm', 94)
const measured = useStored<number | null>('tool.body-fat.measuredPercent', null)

const result = computed<FatResult>(() =>
  computeBodyFat({
    sex: sex.value,
    weightKg: weight.value ?? 0,
    heightCm: height.value ?? 0,
    age: age.value ?? null,
    waistCm: waist.value ?? null,
    hipCm: hip.value ?? null,
    measuredPercent: measured.value ?? null
  })
)
const ok = computed(() => (result.value.ok ? result.value : null))

function fillSample(label: string): void {
  const sample = BODY_FAT_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  sex.value = sample.input.sex
  weight.value = sample.input.weightKg
  height.value = sample.input.heightCm
  age.value = sample.input.age
  waist.value = sample.input.waistCm
  hip.value = sample.input.hipCm
  measured.value = sample.input.measuredPercent
}
</script>

<template>
  <ToolShell tool-id="body-fat">
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="sex" :items="sexes" size="lg" class="w-24" aria-label="性别" />
      <UFormField label="体重（kg）" class="w-28">
        <UInputNumber v-model="weight" :step="0.5" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="身高（cm）" class="w-28">
        <UInputNumber v-model="height" :step="1" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="年龄（岁）" class="w-24">
        <UInputNumber v-model="age" :step="1" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="腰围（cm）" class="w-28">
        <UInputNumber v-model="waist" :step="0.5" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="臀围（cm）" class="w-28">
        <UInputNumber v-model="hip" :step="0.5" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="实测体脂率（%，可空）" class="w-40">
        <UInputNumber v-model="measured" :step="0.5" :min="0" :max="70" size="lg" class="w-full" :controls="false" placeholder="体脂秤/DXA" />
      </UFormField>
      <UButton
        v-for="sample in BODY_FAT_SAMPLES"
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
          <p class="text-xs text-muted">体脂率</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">
            {{ ok.percent === null ? '—' : `${ok.percent}%` }}
          </p>
        </div>
        <div class="flex flex-col gap-1">
          <UBadge v-if="ok.percentSource" :label="ok.percentSource" color="neutral" variant="subtle" />
          <UBadge
            v-if="ok.grade"
            :label="`ACE 分级：${ok.grade.label}`"
            :color="ok.grade.label.includes('偏高') ? 'error' : ok.grade.label === '可接受' ? 'warning' : 'success'"
            variant="soft"
          />
        </div>
        <dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <div class="flex gap-1.5">
            <dt class="text-muted">脂肪量</dt>
            <dd class="font-mono text-default">{{ ok.fatMassKg === null ? '—' : `${ok.fatMassKg} kg` }}</dd>
          </div>
          <div class="flex gap-1.5">
            <dt class="text-muted">去脂体重</dt>
            <dd class="font-mono text-default">{{ ok.leanMassKg === null ? '—' : `${ok.leanMassKg} kg` }}</dd>
          </div>
          <div class="flex gap-1.5">
            <dt class="text-muted">BMI</dt>
            <dd class="font-mono text-default">{{ ok.bmi }}</dd>
          </div>
        </dl>
      </div>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">两条路径</h2>
        <ul class="overflow-hidden rounded-xl border border-default">
          <li
            v-for="item in ok.methods"
            :key="item.id"
            class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
          >
            <span class="min-w-0 flex-1 text-xs font-medium text-default">{{ item.name }}</span>
            <span class="font-mono text-sm tabular-nums text-highlighted">
              {{ item.percent === null ? '—' : `${item.percent}%` }}
            </span>
            <p class="w-full font-mono text-[11px] text-dimmed">{{ item.expression }}</p>
            <p v-if="item.skipped" class="w-full text-[11px] text-warning">{{ item.skipped }}</p>
            <p v-else class="w-full text-[11px] text-muted">{{ item.note }}</p>
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">ACE 分级对照（{{ sex === 'male' ? '男' : '女' }}）</h2>
        <ul class="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
          <li
            v-for="grade in ok.grades"
            :key="grade.label"
            class="rounded-lg border px-2 py-1.5 text-xs"
            :class="ok.grade?.label === grade.label ? 'border-primary/40 bg-primary/10 text-highlighted' : 'border-default text-muted'"
          >
            <p class="font-medium">{{ grade.label }}</p>
            <p class="font-mono text-[11px]">{{ grade.min }}–{{ grade.max === null ? '∞' : grade.max - 1 }}%</p>
          </li>
        </ul>
      </section>

      <section v-if="ok.risk.length" class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">围度与脂肪分布</h2>
        <ul class="overflow-hidden rounded-xl border border-default">
          <li
            v-for="item in ok.risk"
            :key="item.label"
            class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
          >
            <span class="w-28 shrink-0 text-xs font-medium text-default">{{ item.label }}</span>
            <span class="font-mono text-sm tabular-nums text-highlighted">{{ item.value }}</span>
            <span class="min-w-0 flex-1 text-xs text-muted">{{ item.grade }}</span>
            <p class="w-full text-[11px] text-dimmed">{{ item.threshold }}</p>
          </li>
        </ul>
      </section>

      <section v-if="ok.weightAt.length" class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">去脂体重不变时，各体脂率对应的体重</h2>
          <span class="text-xs text-dimmed">目标体重 = 去脂体重 ÷ (1 − 目标体脂率)</span>
        </div>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="item in ok.weightAt"
            :key="item.percent"
            class="rounded-lg border border-default bg-elevated px-3 py-2 text-xs"
          >
            <p class="font-mono text-dimmed">{{ item.percent }}%</p>
            <p class="font-mono text-sm text-highlighted">{{ item.weightKg }} kg</p>
            <p class="font-mono text-[11px]" :class="item.deltaKg > 0 ? 'text-warning' : 'text-muted'">
              {{ item.deltaKg > 0 ? '+' : '' }}{{ item.deltaKg }}
            </p>
          </li>
        </ul>
      </section>

      <ul v-if="ok.notes.length" class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      体脂率没有统一真值：不同方法对同一人可差 3–5 个百分点。本页刻意不实现网传的「美国海军周长法」——
      它的常数与单位绑定、流传版本互相矛盾，无法在离线环境里核对；宁可只给一条能追溯到出处的估算式，
      并把「手上有实测值时的纯算术换算」放在更显眼的位置。
    </p>
  </ToolShell>
</template>
