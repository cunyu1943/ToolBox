<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  dedupeLines,
  LINE_SAMPLES,
  numberLines,
  removeEmptyLines,
  shuffleLines,
  sortLines,
  trimLines,
  lineStats,
  type DedupeKey,
  type EmptyMode,
  type KeepWhich,
  type NumberFormat,
  type SortMode,
  type TrimSide
} from '~/tools/line-tools'
import { useStored } from '~/composables/useStored'

type Operation = 'dedupe' | 'empty' | 'trim' | 'sort' | 'number' | 'shuffle'

const operations: { label: string; value: Operation }[] = [
  { label: '去重', value: 'dedupe' },
  { label: '删空行', value: 'empty' },
  { label: '裁剪每行空白', value: 'trim' },
  { label: '排序', value: 'sort' },
  { label: '加序号', value: 'number' },
  { label: '随机打乱', value: 'shuffle' }
]

const dedupeKeys: { label: string; value: DedupeKey }[] = [
  { label: '完全相同', value: 'exact' },
  { label: '忽略首尾空白', value: 'trim' },
  { label: '忽略空白与大小写', value: 'trimCase' }
]
const keeps: { label: string; value: KeepWhich }[] = [
  { label: '保留第一条', value: 'first' },
  { label: '保留最后一条', value: 'last' }
]
const emptyModes: { label: string; value: EmptyMode }[] = [
  { label: '只删真正的空行', value: 'empty' },
  { label: '连纯空白行一起删', value: 'blank' }
]
const trimSides: { label: string; value: TrimSide }[] = [
  { label: '两端', value: 'both' },
  { label: '行首', value: 'start' },
  { label: '行尾', value: 'end' }
]
const sortModes: { label: string; value: SortMode }[] = [
  { label: '升序（字典）', value: 'asc' },
  { label: '降序（字典）', value: 'desc' },
  { label: '按行内首个数字', value: 'number' },
  { label: '按长度', value: 'length' },
  { label: '整体反转', value: 'reverse' }
]
const numberFormats: { label: string; value: NumberFormat }[] = [
  { label: '1.', value: 'dot' },
  { label: '1)', value: 'paren' },
  { label: '1', value: 'plain' },
  { label: '[1]', value: 'bracket' },
  { label: '-（无序）', value: 'minus' }
]

const source = useStored('tool.line-tools.source', LINE_SAMPLES[0]!.value)
const operation = useStored<Operation>('tool.line-tools.operation', 'dedupe')
const dedupeKey = useStored<DedupeKey>('tool.line-tools.dedupe-key', 'trim')
const keep = useStored<KeepWhich>('tool.line-tools.keep', 'first')
const emptyMode = useStored<EmptyMode>('tool.line-tools.empty-mode', 'blank')
const trimSide = useStored<TrimSide>('tool.line-tools.trim-side', 'both')
const sortMode = useStored<SortMode>('tool.line-tools.sort-mode', 'asc')
const sortUnique = useStored('tool.line-tools.sort-unique', false)
const start = useStored('tool.line-tools.start', 1)
const step = useStored('tool.line-tools.step', 1)
const numberFormat = useStored<NumberFormat>('tool.line-tools.format', 'dot')
const pad = useStored('tool.line-tools.pad', 0)
const skipEmpty = useStored('tool.line-tools.skip-empty', true)
const seed = useStored('tool.line-tools.seed', 20260924)

const stats = computed(() => lineStats(source.value))
const isEmpty = computed(() => !source.value.trim())

const run = computed(() => {
  switch (operation.value) {
    case 'dedupe':
      return dedupeLines(source.value, { key: dedupeKey.value, keep: keep.value })
    case 'empty':
      return removeEmptyLines(source.value, emptyMode.value)
    case 'trim':
      return trimLines(source.value, trimSide.value)
    case 'sort':
      return sortLines(source.value, { mode: sortMode.value, unique: sortUnique.value })
    case 'number':
      return numberLines(source.value, {
        start: start.value,
        step: step.value,
        format: numberFormat.value,
        pad: pad.value,
        skipEmpty: skipEmpty.value
      })
    case 'shuffle':
      return shuffleLines(source.value, seed.value)
  }
})

const value = computed(() => run.value.value)
const notes = computed(() => run.value.notes)
const changed = computed(() => !isEmpty.value && value.value !== source.value)
</script>

<template>
  <ToolShell tool-id="line-tools">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label for="line-input" class="text-sm font-medium text-highlighted">输入文本</label>
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
          id="line-input"
          v-model="source"
          :rows="8"
          placeholder="一行一条，粘贴进来即可处理…"
          :ui="{ base: 'font-mono text-sm' }"
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in LINE_SAMPLES"
            :key="sample.label"
            :label="sample.label"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="source = sample.value"
          />
        </div>
        <p class="text-xs text-dimmed">
          共 {{ stats.lines }} 行 · 非空 {{ stats.nonEmpty }} 行 · 去重后 {{ stats.unique }} 行 · {{ stats.characters }} 字符
        </p>
      </section>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-3">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="操作" class="w-44">
            <USelect v-model="operation" :items="operations" size="sm" />
          </UFormField>

          <template v-if="operation === 'dedupe'">
            <UFormField label="判定重复" class="w-52">
              <USelect v-model="dedupeKey" :items="dedupeKeys" size="sm" />
            </UFormField>
            <UFormField label="保留" class="w-36">
              <USelect v-model="keep" :items="keeps" size="sm" />
            </UFormField>
          </template>

          <UFormField v-if="operation === 'empty'" label="空行定义" class="w-52">
            <USelect v-model="emptyMode" :items="emptyModes" size="sm" />
          </UFormField>

          <UFormField v-if="operation === 'trim'" label="裁剪位置" class="w-36">
            <USelect v-model="trimSide" :items="trimSides" size="sm" />
          </UFormField>

          <template v-if="operation === 'sort'">
            <UFormField label="顺序" class="w-44">
              <USelect v-model="sortMode" :items="sortModes" size="sm" />
            </UFormField>
            <UCheckbox v-model="sortUnique" label="顺带去重" size="sm" />
          </template>

          <template v-if="operation === 'number'">
            <UFormField label="起始" class="w-24">
              <UInputNumber v-model="start" :step="1" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="步长" class="w-24">
              <UInputNumber v-model="step" :step="1" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="样式" class="w-28">
              <USelect v-model="numberFormat" :items="numberFormats" size="sm" />
            </UFormField>
            <UFormField label="补零位数" class="w-28">
              <UInputNumber v-model="pad" :min="0" :max="6" size="sm" class="w-full" />
            </UFormField>
            <UCheckbox v-model="skipEmpty" label="空行不编号" size="sm" />
          </template>

          <template v-if="operation === 'shuffle'">
            <UFormField label="随机种子（同种子结果一致）" class="w-56">
              <UInputNumber v-model="seed" :step="1" size="sm" class="w-full" />
            </UFormField>
            <UButton
              icon="lucide:dices"
              label="换个种子"
              size="sm"
              color="neutral"
              variant="subtle"
              @click="seed = Math.floor(Math.random() * 1e9)"
            />
          </template>
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-highlighted">结果</span>
          <div class="flex items-center gap-2">
            <UButton
              icon="lucide:arrow-down-to-line"
              label="用结果替换输入"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="!changed"
              @click="source = value"
            />
            <CopyButton :text="value" :disabled="isEmpty" label="复制结果" size="xs" />
          </div>
        </div>
        <pre
          class="max-h-80 overflow-auto rounded-xl border border-default bg-elevated px-3 py-2 font-mono text-xs text-default"
        >{{ isEmpty ? '（等待输入）' : value }}</pre>
        <ul v-if="notes.length" class="flex flex-col gap-1 text-xs text-muted">
          <li v-for="note in notes" :key="note">· {{ note }}</li>
        </ul>
      </section>

      <p class="text-xs text-dimmed">
        换行符按输入里出现最多的那种自动识别，输出保持同一种；所有处理都在浏览器本地完成，文本不会上传。
      </p>
    </div>
  </ToolShell>
</template>
