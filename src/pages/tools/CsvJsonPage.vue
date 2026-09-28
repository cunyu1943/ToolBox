<script setup lang="ts">
import { computed, watch } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { csvToObjects, detectDelimiter, formatJson, jsonToCsv, type CsvDelimiter } from '~/tools/csv-json'
import { useStored } from '~/composables/useStored'

type Mode = 'to-json' | 'to-csv'

const modeItems: { label: string; value: Mode }[] = [
  { label: 'CSV → JSON', value: 'to-json' },
  { label: 'JSON → CSV', value: 'to-csv' }
]

const delimiterItems: { label: string; value: string }[] = [
  { label: '自动识别', value: 'auto' },
  { label: '逗号 ,', value: ',' },
  { label: '分号 ;', value: ';' },
  { label: '制表符 Tab', value: '\t' },
  { label: '竖线 |', value: '|' }
]

const CSV_EXAMPLE =
  '姓名,部门,备注\n张三,研发,"带引号,含逗号"\n李四,市场,普通文本\n王五,财务,\n'
const JSON_EXAMPLE =
  '[{"姓名":"张三","部门":"研发","备注":"带引号,含逗号"},{"姓名":"李四","部门":"市场","备注":null}]'

const mode = useStored<Mode>('tool.csv-json.mode', 'to-json')
const delimiter = useStored<string>('tool.csv-json.delimiter', 'auto')
const withHeader = useStored('tool.csv-json.withHeader', true)
const indent = useStored('tool.csv-json.indent', 2)
const source = useStored('tool.csv-json.source', CSV_EXAMPLE)

const indentItems = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 },
  { label: '压缩（无换行）', value: 0 }
]

const chosenDelimiter = computed(() =>
  delimiter.value === 'auto' ? undefined : (delimiter.value as CsvDelimiter)
)
const effectiveDelimiter = computed<CsvDelimiter>(() => {
  if (delimiter.value !== 'auto') return delimiter.value as CsvDelimiter
  return mode.value === 'to-json' ? detectDelimiter(source.value) : ','
})

const toJsonResult = computed(() =>
  mode.value === 'to-json'
    ? csvToObjects(source.value, { delimiter: chosenDelimiter.value, hasHeader: withHeader.value })
    : null
)
const toCsvResult = computed(() =>
  mode.value === 'to-csv'
    ? jsonToCsv(source.value, { delimiter: chosenDelimiter.value ?? ',', includeHeader: withHeader.value })
    : null
)

const output = computed(() => {
  if (toJsonResult.value) return formatJson(toJsonResult.value.objects, indent.value)
  return toCsvResult.value?.csv ?? ''
})
const errorText = computed(() => {
  if (toJsonResult.value) return toJsonResult.value.ok ? '' : toJsonResult.value.error ?? ''
  return toCsvResult.value && !toCsvResult.value.ok ? toCsvResult.value.error ?? '' : ''
})
const warnings = computed(() => toJsonResult.value?.warnings ?? toCsvResult.value?.warnings ?? [])
const stats = computed(() => {
  if (toJsonResult.value?.ok) {
    return { rows: toJsonResult.value.objects.length, cols: toJsonResult.value.headers.length }
  }
  if (toCsvResult.value?.ok) return { rows: toCsvResult.value.rowCount, cols: toCsvResult.value.headers.length }
  return null
})
const delimiterLabel = computed(() =>
  effectiveDelimiter.value === '\t' ? 'Tab' : `"${effectiveDelimiter.value}"`
)

function loadExample() {
  source.value = mode.value === 'to-json' ? CSV_EXAMPLE : JSON_EXAMPLE
}

/** 只在输入还是「另一个方向的示例」时顺带替换，避免覆盖用户自己粘贴的内容 */
watch(mode, (next, previous) => {
  const other = previous === 'to-json' ? CSV_EXAMPLE : JSON_EXAMPLE
  if (source.value.trim() === other.trim()) source.value = next === 'to-json' ? CSV_EXAMPLE : JSON_EXAMPLE
})

function clearAll() {
  source.value = ''
}
</script>

<template>
  <ToolShell tool-id="csv-json">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">转换方向</span>
          <USelect v-model="mode" :items="modeItems" size="lg" class="w-40" aria-label="转换方向" />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">分隔符</span>
          <USelect v-model="delimiter" :items="delimiterItems" size="lg" class="w-36" aria-label="分隔符" />
        </label>

        <label v-if="mode === 'to-json'" class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">JSON 缩进</span>
          <USelect v-model="indent" :items="indentItems" size="lg" class="w-36" aria-label="JSON 缩进" />
        </label>

        <div class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
          <USwitch v-model="withHeader" size="sm" :aria-label="mode === 'to-json' ? '首行作为表头' : '输出表头行'" />
          <span class="text-sm text-muted">{{ mode === 'to-json' ? '首行作为表头' : '输出表头行' }}</span>
        </div>

        <div class="ms-auto flex items-center gap-2">
          <UButton icon="lucide:sparkles" label="填入示例" color="neutral" variant="ghost" @click="loadExample" />
          <UButton icon="lucide:eraser" label="清空" color="neutral" variant="ghost" @click="clearAll" />
        </div>
      </div>

      <UAlert
        v-if="errorText"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        title="无法转换"
        :description="errorText"
      />

      <div v-if="stats" class="flex flex-wrap items-center gap-2" aria-label="统计信息">
        <UBadge :label="`${stats.rows} 行`" color="neutral" variant="subtle" />
        <UBadge :label="`${stats.cols} 列`" color="neutral" variant="subtle" />
        <UBadge :label="`分隔符 ${delimiterLabel}`" color="neutral" variant="subtle" />
        <UBadge
          v-for="warning in warnings"
          :key="warning"
          :label="warning"
          color="warning"
          variant="subtle"
          icon="lucide:triangle-alert"
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="flex min-w-0 flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">{{ mode === 'to-json' ? 'CSV 输入' : 'JSON 输入' }}</h2>
          <UTextarea
            v-model="source"
            :rows="14"
            spellcheck="false"
            :placeholder="mode === 'to-json' ? '粘贴 CSV 文本' : '粘贴对象数组 JSON'"
            :ui="{ base: 'font-mono text-xs leading-relaxed resize-y' }"
          />
        </section>

        <section class="flex min-w-0 flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-highlighted">{{ mode === 'to-json' ? 'JSON 输出' : 'CSV 输出' }}</h2>
            <CopyButton :text="output" :disabled="!output" />
          </div>
          <textarea
            :value="output"
            readonly
            rows="14"
            spellcheck="false"
            class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            :placeholder="errorText ? '转换失败，输出为空' : '结果会出现在这里'"
          />
        </section>
      </div>

      <p class="text-xs leading-relaxed text-dimmed">
        解析按 <code class="rounded bg-elevated px-1 py-0.5">RFC 4180</code>
        逐字符走状态机，支持引号包裹、<code class="rounded bg-elevated px-1 py-0.5">""</code>
        转义、字段内的逗号与换行；反方向只在必要时给字段加引号，所以
        <strong class="text-muted">CSV → JSON → CSV 可无损往返</strong>。数字一律保留为字符串，避免
        <code class="rounded bg-elevated px-1 py-0.5">007</code>、长身份证号被转成数字后丢前导零；需要数值时请在
        JSON 侧自行 <code class="rounded bg-elevated px-1 py-0.5">Number()</code> 转换。
      </p>
    </div>
  </ToolShell>
</template>
