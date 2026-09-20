<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="value" label="输入数值" :unit="sourceLabel" />
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">
          选择输入单位
        </label>
        <USelect v-model="sourceId" :items="options" class="w-full" />
      </div>
    </GlassCard>

    <ResultPanel
      title="温度换算"
      :rows="rows"
      note="换算公式：°F = °C × 9/5 + 32；K = °C + 273.15。结果保留高精度。"
      :copy-text="copyText"
    />
  </div>
</template>

<script setup lang="ts">
import { convertTempAll, findTempUnit, tempUnits } from '~/utils/temperature'
import { formatNumber } from '~/utils/number'

definePageMeta({ layout: 'tool' })

const value = ref<number | null>(25)
const sourceId = ref('C')

const options = tempUnits.map((u) => ({ value: u.id, label: u.label }))
const sourceLabel = computed(() => findTempUnit(sourceId.value)?.label ?? '')

const converted = computed(() => convertTempAll(sourceId.value, value.value ?? 0))

const rows = computed(() =>
  tempUnits.map((u) => ({
    label: u.label,
    value: formatNumber(converted.value[u.id] ?? 0, { maximumFractionDigits: 6 })
  }))
)

const copyText = computed(
  () => `${value.value ?? 0} ${sourceLabel.value}\n` + rows.value.map((r) => `${r.label}：${r.value}`).join('\n')
)
</script>
