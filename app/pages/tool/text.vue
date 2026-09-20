<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <UTextarea v-model="input" :rows="6" placeholder="在此输入或粘贴文本…" autoresize :maxrows="14" class="w-full font-mono text-sm" />

      <div class="flex flex-wrap gap-2">
        <UButton v-for="op in caseOps" :key="op.label" :label="op.label" size="sm" color="neutral" variant="soft" @click="op.run()" />
      </div>

      <div class="flex flex-wrap items-center gap-4 border-t border-slate-200/60 pt-4 text-sm dark:border-white/10">
        <UCheckbox v-model="trim" label="每行去首尾空格" />
        <UCheckbox v-model="removeEmpty" label="删除空行" />
        <UCheckbox v-model="dedupe" label="行去重" />
        <UCheckbox v-model="reverse" label="反转行序" />
        <label class="flex items-center gap-1">
          排序
          <USelect v-model="sort" :items="sortItems" size="xs" class="w-24" />
        </label>
        <UButton label="应用行操作" icon="i-lucide-list-end" size="sm" color="primary" @click="applyLines" />
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">结果</h2>
        <UButton icon="i-lucide-copy" label="复制" color="neutral" variant="soft" size="sm" :disabled="!output" @click="copy" />
      </div>
      <pre class="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-sm dark:bg-white/5">{{ output || '—' }}</pre>
    </GlassCard>

    <GlassCard custom-class="p-5">
      <dl class="grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-5">
        <div v-for="s in statRows" :key="s.label">
          <dt class="text-xs text-slate-400">{{ s.label }}</dt>
          <dd class="font-semibold text-slate-800 tabular-nums dark:text-slate-100">{{ s.value }}</dd>
        </div>
      </dl>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { toUpperCase, toLowerCase, invertCase, textStats, processLines } from '~/utils/text'

definePageMeta({ layout: 'tool' })

const input = ref('')
const output = ref('')

const trim = ref(false)
const removeEmpty = ref(false)
const dedupe = ref(false)
const reverse = ref(false)
const sort = ref<'none' | 'asc' | 'desc'>('none')
const sortItems = [
  { label: '无', value: 'none' },
  { label: '升序', value: 'asc' },
  { label: '降序', value: 'desc' }
]

const caseOps = [
  { label: '转大写', run: () => (output.value = toUpperCase(current())) },
  { label: '转小写', run: () => (output.value = toLowerCase(current())) },
  { label: '反转大小写', run: () => (output.value = invertCase(current())) },
  { label: '原文', run: () => (output.value = current()) }
]

function current(): string {
  return output.value || input.value
}

function applyLines() {
  output.value = processLines(current(), {
    trim: trim.value,
    removeEmpty: removeEmpty.value,
    dedupe: dedupe.value,
    sort: sort.value,
    reverse: reverse.value
  })
}

const stats = computed(() => textStats(output.value || input.value))
const statRows = computed(() => [
  { label: '字符', value: stats.value.chars },
  { label: '去空白字符', value: stats.value.charsNoSpace },
  { label: '词数', value: stats.value.words },
  { label: '行数', value: stats.value.lines },
  { label: 'UTF-8 字节', value: stats.value.bytes }
])

async function copy() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
  } catch {
    /* 静默 */
  }
}
</script>
