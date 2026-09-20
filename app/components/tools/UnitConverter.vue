<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="value" :label="'输入数值'" :unit="sourceLabel" :min="0" />
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">
          选择输入单位
        </label>
        <USelect
          v-model="sourceId"
          :items="options"
          class="w-full"
        />
      </div>
    </GlassCard>

    <ResultPanel
      :title="title"
      :rows="rows"
      :note="note"
      :copy-text="copyText"
    />
  </div>
</template>

<script setup lang="ts">
import type { Unit } from '~/types'
import { convertAll, findUnit } from '~/utils/units'
import { formatNumber } from '~/utils/number'

const props = defineProps<{
  units: Unit[]
  title: string
  /** 默认输入单位 id */
  defaultId: string
  note?: string
}>()

const value = ref<number | null>(1)
const sourceId = ref(props.defaultId)

const options = computed(() => props.units.map((u) => ({ value: u.id, label: u.label })))
const sourceLabel = computed(() => findUnit(props.units, sourceId.value)?.label ?? '')

const converted = computed(() => convertAll(props.units, sourceId.value, value.value ?? 0))

const rows = computed(() =>
  props.units.map((u) => ({
    label: u.label,
    value: formatNumber(converted.value[u.id] ?? 0, { maximumFractionDigits: 8 })
  }))
)

const copyText = computed(() =>
  `${(value.value ?? 0)} ${sourceLabel.value}\n` +
  rows.value.map((r) => `${r.label}：${r.value}`).join('\n')
)
</script>
