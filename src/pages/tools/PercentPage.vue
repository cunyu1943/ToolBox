<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import { PERCENT_MODES, computePercent, type PercentMode } from '~/tools/percent'
import { useStored } from '~/composables/useStored'

const mode = useStored<PercentMode>('tool.percent.mode', 'of')
const a = useStored('tool.percent.a', 15)
const b = useStored('tool.percent.b', 200)

const items = PERCENT_MODES.map((item) => ({ label: item.label, value: item.value }))
const current = computed(() => PERCENT_MODES.find((item) => item.value === mode.value) ?? PERCENT_MODES[0]!)
const result = computed(() => computePercent(mode.value, a.value ?? 0, b.value ?? 0))
const ok = computed(() => (result.value.ok ? result.value : null))
</script>

<template>
  <ToolShell tool-id="percent">
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="mode" :items="items" size="lg" class="w-60" aria-label="问法" />
      <UFormField :label="current.a" class="w-40">
        <UInputNumber v-model="a" :step="1" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField :label="current.b" class="w-40">
        <UInputNumber v-model="b" :step="1" size="lg" class="w-full" :controls="false" />
      </UFormField>
    </div>

    <p class="text-xs text-muted">{{ current.hint }}</p>

    <UAlert
      v-if="!ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="无法计算"
      :description="result.error"
    />

    <template v-if="ok">
      <div class="flex flex-col gap-2">
        <p v-for="line in ok.lines" :key="line.formula" class="font-mono text-base text-highlighted">
          {{ line.formula }}
        </p>
      </div>

      <div v-if="ok.barPercent !== null" class="flex flex-col gap-1">
        <div class="h-2 w-full overflow-hidden rounded-full bg-primary/10">
          <div
            class="h-full rounded-full bg-primary transition-[width]"
            :style="{ width: `${Math.max(0, Math.min(100, ok.barPercent))}%` }"
          />
        </div>
        <p class="text-xs text-muted">进度条按 0–100% 显示，超过 100% 时钉在满格。</p>
      </div>

      <ul v-if="ok.notes.length" class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      变化率的坑在基数：从 100 跌到 80 是 −20%，要从 80 回到 100 得涨 25%。这里两种算法都给出来了。
      所有输入都存在浏览器本地，不上传。
    </p>
  </ToolShell>
</template>
