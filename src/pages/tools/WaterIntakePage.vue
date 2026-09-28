<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import { CLIMATE_LABELS, WATER_SAMPLES, computeWater, type WaterInput, type WaterResult } from '~/tools/water-intake'
import { useStored } from '~/composables/useStored'

const urineOptions = [
  { label: '不清楚 / 不看尿色', value: 'unknown' as const },
  { label: '几乎无色', value: 'clear' as const },
  { label: '淡柠檬黄', value: 'pale' as const },
  { label: '深黄', value: 'dark' as const },
  { label: '琥珀 / 茶色', value: 'amber' as const }
]

const weight = useStored('tool.water-intake.weightKg', 65)
const exercise = useStored('tool.water-intake.exerciseMinutes', 0)
const climate = useStored<WaterInput['climate']>('tool.water-intake.climate', 'temperate')
const pregnant = useStored('tool.water-intake.pregnant', false)
const lactating = useStored('tool.water-intake.lactating', false)
const temperature = useStored<number | null>('tool.water-intake.temperature', null)
const urine = useStored<WaterInput['urine']>('tool.water-intake.urine', 'unknown')
const cup = useStored('tool.water-intake.cupMl', 250)

const result = computed<WaterResult>(() =>
  computeWater({
    weightKg: weight.value ?? 0,
    exerciseMinutes: exercise.value ?? 0,
    climate: climate.value,
    pregnant: pregnant.value,
    lactating: lactating.value,
    temperature: temperature.value ?? null,
    urine: urine.value,
    cupMl: cup.value ?? 250
  })
)
const ok = computed(() => (result.value.ok ? result.value : null))

function fillSample(label: string): void {
  const sample = WATER_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  weight.value = sample.input.weightKg
  exercise.value = sample.input.exerciseMinutes
  climate.value = sample.input.climate
  pregnant.value = sample.input.pregnant
  lactating.value = sample.input.lactating
  temperature.value = sample.input.temperature
  urine.value = sample.input.urine
  cup.value = sample.input.cupMl
}
</script>

<template>
  <ToolShell tool-id="water-intake">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="体重（kg）" class="w-28">
        <UInputNumber v-model="weight" :step="0.5" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="每天运动（分钟）" class="w-36">
        <UInputNumber v-model="exercise" :step="10" :min="0" :max="600" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="体温（℃，可空）" class="w-36">
        <UInputNumber v-model="temperature" :step="0.1" :min="35" :max="43" size="lg" class="w-full" :controls="false" placeholder="不发热留空" />
      </UFormField>
      <UFormField label="单杯容量（ml）" class="w-32">
        <UInputNumber v-model="cup" :step="10" :min="100" :max="1000" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UButton
        v-for="sample in WATER_SAMPLES"
        :key="sample.label"
        :label="sample.label"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="fillSample(sample.label)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-4">
      <USelect v-model="climate" :items="CLIMATE_LABELS" size="lg" class="w-72" aria-label="环境" />
      <UCheckbox v-model="pregnant" label="妊娠" />
      <UCheckbox v-model="lactating" label="哺乳" />
      <USelect v-model="urine" :items="urineOptions" size="lg" class="w-48" aria-label="尿色" />
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
          <p class="text-xs text-muted">今天需要喝</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">{{ ok.beverageMl }} ml</p>
        </div>
        <div class="flex flex-col gap-1 text-xs">
          <UBadge :label="`约 ${(ok.cups ?? 0).toFixed(1)} 杯 × ${cup} ml`" color="primary" variant="subtle" />
          <UBadge :label="`总需水（含食物）${ok.totalMl} ml`" color="neutral" variant="ghost" />
        </div>
        <p class="min-w-0 basis-full text-xs text-dimmed">
          「需要喝」已扣掉约 20% 的食物供水。对照：{{ ok.reference.map((item) => `${item.label} 总水 ${item.totalMl} ml / 饮品 ${item.beverageMl} ml`).join('；') }}。
        </p>
      </div>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">这一天的水是怎么加出来的</h2>
        <ul class="overflow-hidden rounded-xl border border-default">
          <li
            v-for="item in ok.items"
            :key="item.label"
            class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
          >
            <span class="w-44 shrink-0 text-xs font-medium text-default">{{ item.label }}</span>
            <span class="font-mono text-sm tabular-nums text-highlighted">+{{ item.ml }} ml</span>
            <span class="min-w-0 flex-1 text-[11px] text-muted">{{ item.basis }}</span>
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">从 8:00 起每两小时一档</h2>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="slot in ok.schedule"
            :key="slot.time"
            class="rounded-lg border border-default bg-elevated px-3 py-1.5 text-center"
          >
            <p class="font-mono text-[11px] text-dimmed">{{ slot.time }}</p>
            <p class="font-mono text-sm text-default">{{ slot.ml }} ml</p>
          </li>
        </ul>
        <p class="text-xs text-dimmed">分档只是把总量摊开，避免一次性猛灌；实际按口渴与出汗调整。</p>
      </section>

      <UAlert
        v-if="ok.urineNote"
        :color="urine === 'amber' ? 'error' : urine === 'dark' ? 'warning' : 'success'"
        variant="subtle"
        icon="lucide:info"
        title="尿色对照"
        :description="ok.urineNote"
      />

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      肾脏最大排水率约 0.8–1.0 L/小时，「一天 8 升」式的喝法在短时间的集中摄入下有风险。
      肾功能不全、心力衰竭、肝硬化腹水或正在限液治疗者请按医嘱的液体量执行，不要用本页数字。
    </p>
  </ToolShell>
</template>
