<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="totalGb" label="硬盘总容量" unit="GB" :min="1" :integer="true" placeholder="如 512 或 1024" />
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">选择用途方案</label>
        <USelect v-model="presetId" :items="presetOptions" class="w-full" />
      </div>
      <p v-if="preset" class="text-xs text-slate-400">{{ preset.desc }}</p>
    </GlassCard>

    <ResultPanel
      title="分区建议"
      :rows="rows"
      note="按占比向下取整，余量并入最后一块分区，保证各分区之和等于总容量。1024 GB = 1 TB。"
      :copy-text="copyText"
    />
  </div>
</template>

<script setup lang="ts">
import { allocate, diskPresets, formatCapacity } from '~/utils/disk-partition'


const totalGb = ref<number | null>(512)
const presetId = ref('balanced')

const presetOptions = diskPresets.map((p) => ({ value: p.id, label: p.name }))
const preset = computed(() => diskPresets.find((p) => p.id === presetId.value))

const result = computed(() => allocate(totalGb.value ?? 0, preset.value?.slices ?? []))

const rows = computed(() =>
  result.value.map((r) => ({
    label: `${r.label} · ${r.percent}%`,
    value: formatCapacity(r.sizeGb)
  }))
)

const copyText = computed(
  () =>
    `${preset.value?.name ?? ''}（总 ${totalGb.value ?? 0} GB）\n` +
    result.value.map((r) => `${r.label}：${formatCapacity(r.sizeGb)}`).join('\n')
)
</script>
