<script setup lang="ts">
import { computed, watch } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import CopyButton from '~/components/CopyButton.vue'
import { useStored } from '~/composables/useStored'
import {
  COMMON_DISKS,
  DISK_PRESETS,
  FS_LABELS,
  computeDisk,
  type DiskFs,
  type DiskResult,
  type PartitionSlice
} from '~/tools/disk-partition'

const nominalGb = useStored('tool.disk-partition.nominalGb', 1000)
const presetId = useStored('tool.disk-partition.presetId', 'balanced')
const fs = useStored<DiskFs>('tool.disk-partition.fs', 'ntfs')
const slices = useStored<PartitionSlice[]>(
  'tool.disk-partition.slices',
  DISK_PRESETS[0]!.slices.map((slice) => ({ ...slice }))
)

const result = computed<DiskResult>(() =>
  computeDisk({ nominalGb: nominalGb.value ?? 0, slices: slices.value, fs: fs.value })
)
const ok = computed(() => (result.value.ok ? result.value : null))

const presetItems = computed(() => DISK_PRESETS.map((preset) => ({ label: preset.name, value: preset.id })))
const fsItems = computed(() => FS_LABELS.map((item) => ({ label: item.label, value: item.value })))
const percentSum = computed(() =>
  Math.round(slices.value.reduce((sum, item) => sum + (item.percent || 0), 0) * 100) / 100
)

watch(presetId, (id) => {
  const preset = DISK_PRESETS.find((item) => item.id === id)
  if (preset) slices.value = preset.slices.map((slice) => ({ ...slice }))
})

function addSlice(): void {
  slices.value = [...slices.value, { label: `新分区 ${String.fromCharCode(65 + slices.value.length)}`, percent: 0 }]
}

function removeSlice(index: number): void {
  if (slices.value.length <= 1) return
  slices.value = slices.value.filter((_, position) => position !== index)
}

const copyText = computed(() => {
  const r = ok.value
  if (!r) return ''
  return [
    `标称 ${r.capacity.nominalGb} GB = ${r.capacity.bytes.toLocaleString('en-US')} 字节`,
    `系统识别 ${r.capacity.gib} GiB（少 ${r.capacity.lostPct}%）`,
    ...r.rows.map(
      (row) => `${row.label}：${row.percent}% → ${row.sizeGiB} GiB（${row.sizeGbDec} GB 十进制），${row.startMiB}–${row.endMiB} MiB`
    )
  ].join('\n')
})
</script>

<template>
  <ToolShell tool-id="disk-partition">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="标称容量（GB，按 TB 填请乘 1000）" class="w-56">
        <UInputNumber v-model="nominalGb" :step="250" :min="1" :max="100000" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="文件系统" class="w-52">
        <USelect v-model="fs" :items="fsItems" size="lg" class="w-full" aria-label="文件系统" />
      </UFormField>
      <UButton
        v-for="disk in COMMON_DISKS"
        :key="disk.label"
        :label="disk.label"
        size="xs"
        :color="nominalGb === disk.nominalGb ? 'primary' : 'neutral'"
        :variant="nominalGb === disk.nominalGb ? 'subtle' : 'outline'"
        @click="nominalGb = disk.nominalGb"
      />
    </div>

    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="分区方案预设" class="w-52">
        <USelect v-model="presetId" :items="presetItems" size="lg" class="w-full" aria-label="预设" />
      </UFormField>
      <UButton label="加一个分区" icon="lucide:plus" size="xs" color="neutral" variant="subtle" @click="addSlice" />
      <span class="text-xs" :class="percentSum === 100 ? 'text-dimmed' : 'text-error'">
        占比合计 {{ percentSum }}%
      </span>
    </div>

    <ul class="flex flex-col gap-2">
      <li
        v-for="(slice, index) in slices"
        :key="index"
        class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-default bg-elevated px-3 py-2"
      >
        <UInput v-model="slice.label" size="sm" class="w-48" aria-label="分区名称" />
        <UInputNumber v-model="slice.percent" :step="5" :min="0" :max="100" size="sm" class="w-28" aria-label="占比" />
        <span class="text-xs text-dimmed">%</span>
        <UButton
          icon="lucide:trash"
          label="删除"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="slices.length <= 1"
          @click="removeSlice(index)"
        />
      </li>
    </ul>

    <UAlert
      v-if="!ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="无法分配"
      :description="result.error"
    />

    <template v-if="ok">
      <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p class="text-xs text-muted">系统实际可用</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">{{ ok.capacity.gib }} GiB</p>
        </div>
        <div class="flex flex-col gap-1 text-xs">
          <UBadge :label="`比标称少 ${ok.capacity.lostPct}%`" color="warning" variant="subtle" />
          <UBadge v-if="ok.capacity.gib >= 1024" :label="`约 ${ok.capacity.tib} TiB`" color="neutral" variant="ghost" />
          <UBadge v-if="ok.reservedGiB !== null" :label="`ext4 保留约 ${ok.reservedGiB} GiB`" color="neutral" variant="ghost" />
        </div>
        <p class="min-w-0 basis-full font-mono text-xs text-dimmed">
          {{ ok.capacity.nominalGb }} GB = {{ ok.capacity.bytes.toLocaleString('en-US') }} 字节 ÷ 1073741824 = {{ ok.capacity.gib }} GiB
        </p>
      </div>

      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">分区表</h2>
          <CopyButton :text="copyText" label="复制分区表" size="xs" />
        </div>
        <div class="overflow-x-auto rounded-xl border border-default">
          <table class="w-full min-w-120 text-right text-xs tabular-nums">
            <thead class="bg-elevated text-muted">
              <tr>
                <th class="p-2 text-left font-medium">分区</th>
                <th class="p-2 font-medium">占比</th>
                <th class="p-2 font-medium">GiB（系统显示）</th>
                <th class="p-2 font-medium">GB（十进制）</th>
                <th class="p-2 font-medium">起始 MiB</th>
                <th class="p-2 font-medium">结束 MiB</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in ok.rows" :key="row.label" class="border-t border-default">
                <td class="p-2 text-left font-medium text-default">{{ row.label }}</td>
                <td class="p-2 text-muted">{{ row.percent }}%</td>
                <td class="p-2 font-medium text-highlighted">{{ row.sizeGiB }}</td>
                <td class="p-2">{{ row.sizeGbDec }}</td>
                <td class="p-2 text-muted">{{ row.startMiB.toLocaleString('en-US') }}</td>
                <td class="p-2 text-muted">{{ row.endMiB.toLocaleString('en-US') }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t border-default bg-elevated">
              <tr>
                <td class="p-2 text-left font-medium text-highlighted">合计</td>
                <td class="p-2 text-muted">{{ ok.percentSum }}%</td>
                <td class="p-2 font-medium text-highlighted">{{ ok.rows.reduce((sum, row) => sum + row.sizeGiB, 0) }}</td>
                <td class="p-2" colspan="3">整盘 {{ ok.totalGiB }} GiB</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p class="text-xs text-dimmed">
          起止位置是 1 MiB 的整数倍，直接抄进 diskpart（<span class="font-mono">create partition primary size=...</span>）
          或 parted 就是 4K 对齐的。
        </p>
      </section>

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>
  </ToolShell>
</template>
