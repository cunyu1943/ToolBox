<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import { HEART_RATE_SAMPLES, computeHeartRate, type HeartRateResult } from '~/tools/target-heart-rate'
import { useStored } from '~/composables/useStored'

const age = useStored('tool.target-heart-rate.age', 30)
const resting = useStored('tool.target-heart-rate.restingHr', 72)
const measuredMax = useStored<number | null>('tool.target-heart-rate.measuredMax', null)

const result = computed<HeartRateResult>(() =>
  computeHeartRate({
    age: age.value ?? 0,
    restingHr: resting.value ?? 0,
    measuredMax: measuredMax.value ?? null
  })
)
const ok = computed(() => (result.value.ok ? result.value : null))

const zoneColor: Record<string, string> = {
  z1: 'text-info',
  z2: 'text-success',
  z3: 'text-primary',
  z4: 'text-warning',
  z5: 'text-error'
}

function fillSample(label: string): void {
  const sample = HEART_RATE_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  age.value = sample.input.age
  resting.value = sample.input.restingHr
  measuredMax.value = sample.input.measuredMax
}
</script>

<template>
  <ToolShell tool-id="target-heart-rate">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="年龄（岁）" class="w-28">
        <UInputNumber v-model="age" :step="1" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="静息心率（次/分）" class="w-40">
        <UInputNumber v-model="resting" :step="1" :min="0" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="实测最大心率（可空）" class="w-44">
        <UInputNumber v-model="measuredMax" :step="1" :min="100" :max="230" size="lg" class="w-full" :controls="false" placeholder="有则优先" />
      </UFormField>
      <UButton
        v-for="sample in HEART_RATE_SAMPLES"
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
          <p class="text-xs text-muted">最大心率</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">{{ ok.maxHr }}</p>
        </div>
        <div class="flex flex-col gap-1">
          <UBadge :label="`储备心率 ${ok.hrr} 次/分`" color="primary" variant="subtle" />
          <UBadge label="中等强度 150–300 分钟/周（WHO/ACSM）" color="neutral" variant="ghost" />
        </div>
        <p class="min-w-0 flex-1 text-xs text-dimmed">来源：{{ ok.maxHrSource }}</p>
      </div>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">五个区间，两种算法并排</h2>
        <ul class="overflow-hidden rounded-xl border border-default">
          <li
            v-for="zone in ok.zones"
            :key="zone.id"
            class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
          >
            <span class="w-32 shrink-0 text-xs font-medium text-default">{{ zone.label }}</span>
            <span class="font-mono text-sm tabular-nums" :class="zoneColor[zone.id]">
              {{ zone.maxHrBased.lower }}–{{ zone.maxHrBased.upper }}
            </span>
            <span class="text-[11px] text-dimmed">%HRmax</span>
            <span class="font-mono text-sm tabular-nums text-highlighted">
              {{ zone.karvonen.lower }}–{{ zone.karvonen.upper }}
            </span>
            <span class="text-[11px] text-dimmed">Karvonen</span>
            <span class="min-w-0 flex-1 text-[11px] text-muted">{{ zone.feel }}</span>
            <p class="w-full text-[11px] text-dimmed">{{ zone.use }}</p>
          </li>
        </ul>
        <p class="text-xs text-dimmed">
          同一档的两个数字不一样是设计如此：Karvonen 把静息心率（{{ resting }}）纳进来，
          所以久坐者的区间整体上移；表里两列都给出，是为了让你看到「百分比」这个词在两套体系里指的不是同一件事。
        </p>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">最大心率估算式对照</h2>
        <ul class="overflow-hidden rounded-xl border border-default">
          <li
            v-for="item in ok.formulas"
            :key="item.id"
            class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
            :class="item.used ? 'bg-primary/5' : ''"
          >
            <span class="min-w-0 flex-1 text-xs font-medium text-default">
              {{ item.name }}
              <UBadge v-if="item.used" label="本页采用" color="primary" variant="subtle" />
            </span>
            <span class="font-mono text-sm tabular-nums text-highlighted">{{ item.value }}</span>
            <span class="w-full font-mono text-[11px] text-dimmed sm:w-auto">{{ item.expression }}</span>
            <p class="w-full text-[11px] text-muted">{{ item.accuracy }}</p>
          </li>
        </ul>
        <p v-if="measuredMax" class="text-xs text-success">已用实测最大心率覆盖所有估算式 —— 这是正确做法。</p>
      </section>

      <section v-if="ok.moderate && ok.vigorous" class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">对应到每周建议</h2>
        <p class="text-xs text-default">
          中等强度（Z3）{{ ok.moderate.lower }}–{{ ok.moderate.upper }} 次/分，每周 150–300 分钟；
          高强度（Z4）{{ ok.vigorous.lower }}–{{ ok.vigorous.upper }} 次/分，每周 75–150 分钟。两者可混合，1 分钟高强度约等于 2 分钟中等强度。
        </p>
      </section>

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      心率区间是训练的强度标尺，不是安全保证。有心血管病史、静息心律不齐、服用影响心率的药物，或运动中出现胸痛与头晕时，
      请先做医学评估，不要按年龄公式自行进入 Z4/Z5。
    </p>
  </ToolShell>
</template>
