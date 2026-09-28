<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  convertTable,
  parseMdTable,
  TABLE_SAMPLES,
  transpose,
  type JsonShape,
  type TableModel,
  type TableSource,
  type TableTarget
} from '~/tools/md-table'
import { useStored } from '~/composables/useStored'

const sources: { label: string; value: TableSource }[] = [
  { label: 'Markdown 表格', value: 'md' },
  { label: 'CSV', value: 'csv' },
  { label: 'JSON', value: 'json' }
]
const targets: { label: string; value: TableTarget }[] = [
  { label: 'Markdown 表格', value: 'md' },
  { label: 'CSV', value: 'csv' },
  { label: 'TSV', value: 'tsv' },
  { label: 'JSON', value: 'json' }
]
const shapes: { label: string; value: JsonShape }[] = [
  { label: '对象数组', value: 'objects' },
  { label: '数组的数组', value: 'arrays' },
  { label: '列式对象', value: 'columns' }
]
const aligns: { label: string; value: 'source' | 'auto' | 'none' }[] = [
  { label: '沿用源对齐', value: 'source' },
  { label: '数字列右对齐', value: 'auto' },
  { label: '不补齐', value: 'none' }
]

const source = useStored('tool.md-table.source', TABLE_SAMPLES[0]!.value)
const from = useStored<TableSource>('tool.md-table.from', 'md')
const to = useStored<TableTarget>('tool.md-table.to', 'md')
const hasHeader = useStored('tool.md-table.has-header', true)
const jsonShape = useStored<JsonShape>('tool.md-table.shape', 'objects')
const indent = useStored('tool.md-table.indent', 2)
const pad = useStored('tool.md-table.pad', true)
const align = useStored<'source' | 'auto' | 'none'>('tool.md-table.align', 'source')
const swapped = useStored('tool.md-table.transposed', false)

const result = computed(() =>
  swapped.value
    ? transpose(source.value)
    : convertTable(source.value, from.value, to.value, {
        hasHeader: hasHeader.value,
        jsonShape: jsonShape.value,
        indent: indent.value,
        pad: pad.value,
        align: align.value
      })
)

const isEmpty = computed(() => !source.value.trim())
const value = computed(() => result.value.value)
const error = computed(() => (isEmpty.value ? undefined : result.value.error))
const ok = computed(() => !isEmpty.value && result.value.ok)

/** 预览只吃自己渲染出来的 Markdown，避免手工 split('|') 被转义竖线骗到 */
const previewModel = computed<TableModel>(() => {
  if (!(ok.value && !swapped.value && to.value === 'md')) return { headers: [], rows: [], aligns: [] }
  const parsed = parseMdTable(value.value)
  return parsed.ok ? parsed.model : { headers: [], rows: [], aligns: [] }
})

function useSample(sample: (typeof TABLE_SAMPLES)[number]): void {
  source.value = sample.value
  swapped.value = false
}
</script>

<template>
  <ToolShell tool-id="md-table">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label for="mt-input" class="text-sm font-medium text-highlighted">输入</label>
          <UButton
            icon="lucide:eraser"
            label="清空"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="source = ''"
          />
        </div>
        <UTextarea
          id="mt-input"
          v-model="source"
          :rows="8"
          placeholder="| 姓名 | 进度 |&#10;| --- | ---: |&#10;| 张三 | 80% |"
          :ui="{ base: 'font-mono text-sm' }"
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in TABLE_SAMPLES"
            :key="sample.label"
            :label="sample.label"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="useSample(sample)"
          />
        </div>
      </section>

      <section class="flex flex-wrap items-end gap-3 rounded-xl border border-default p-3">
        <UFormField v-if="!swapped" label="输入格式" class="w-40">
          <USelect v-model="from" :items="sources" size="sm" />
        </UFormField>
        <UFormField label="输出格式" class="w-40">
          <USelect v-model="to" :items="targets" size="sm" :disabled="swapped" />
        </UFormField>
        <UCheckbox v-if="!swapped && from === 'csv'" v-model="hasHeader" label="首行是表头" size="sm" />
        <UFormField v-if="!swapped && to === 'json'" label="JSON 形态" class="w-36">
          <USelect v-model="jsonShape" :items="shapes" size="sm" />
        </UFormField>
        <UFormField v-if="!swapped && to === 'json'" label="缩进" class="w-24">
          <UInputNumber v-model="indent" :min="0" :max="8" :step="2" size="sm" class="w-full" />
        </UFormField>
        <template v-if="!swapped && to === 'md'">
          <UCheckbox v-model="pad" label="按显示宽度补空格" size="sm" />
          <UFormField label="对齐" class="w-40">
            <USelect v-model="align" :items="aligns" size="sm" />
          </UFormField>
        </template>
        <UButton
          :icon="swapped ? 'lucide:undo-2' : 'lucide:arrow-left-right'"
          :label="swapped ? '撤销行列互换' : '行列互换'"
          size="sm"
          :color="swapped ? 'primary' : 'neutral'"
          :variant="swapped ? 'subtle' : 'outline'"
          @click="swapped = !swapped"
        />
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-highlighted">结果</span>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="ok"
              :label="`${result.rowCount} 行 × ${result.columnCount} 列`"
              color="neutral"
              variant="subtle"
              size="xs"
            />
            <CopyButton :text="value" :disabled="!ok" label="复制结果" size="xs" />
          </div>
        </div>
        <p v-if="error" class="text-xs text-error">{{ error }}</p>
        <pre
          class="max-h-96 overflow-auto rounded-xl border border-default bg-elevated px-3 py-2 font-mono text-xs text-default"
        >{{ isEmpty ? '（等待输入）' : ok ? value : '（无法解析，见上方报错）' }}</pre>
        <ul v-if="result.warnings.length" class="flex flex-col gap-1 text-xs text-warning">
          <li v-for="warn in result.warnings" :key="warn">· {{ warn }}</li>
        </ul>
      </section>

      <section v-if="previewModel.headers.length" class="flex flex-col gap-2">
        <span class="text-sm font-medium text-highlighted">渲染预览</span>
        <div class="overflow-auto rounded-xl border border-default">
          <table class="w-full text-sm">
            <caption class="sr-only">
              结果的表格预览
            </caption>
            <thead class="bg-elevated text-left">
              <tr>
                <th
                  v-for="(header, index) in previewModel.headers"
                  :key="`${header}-${index}`"
                  scope="col"
                  class="px-3 py-2 font-medium text-highlighted"
                  :style="{ textAlign: (previewModel.aligns[index] ?? 'left') as 'left' | 'center' | 'right' }"
                >
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in previewModel.rows" :key="rowIndex" class="border-t border-default">
                <td
                  v-for="(cell, cellIndex) in row"
                  :key="cellIndex"
                  class="px-3 py-2 text-default"
                  :style="{ textAlign: (previewModel.aligns[cellIndex] ?? 'left') as 'left' | 'center' | 'right' }"
                >{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p class="text-xs text-dimmed">
        补空格按「显示宽度」算：中日韩字符和 emoji 记 2 格，组合记号记 0 格，因此对齐后的竖线在编辑器里是齐的。
        CSV 支持引号包裹与转义双写（<code class="font-mono">""</code>）、自动识别逗号/制表符分隔与 CRLF。
      </p>
    </div>
  </ToolShell>
</template>
