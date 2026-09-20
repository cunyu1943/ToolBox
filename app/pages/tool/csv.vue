<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-white/10">
        <button
          v-for="m in modes"
          :key="m.value"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
          :class="mode === m.value ? 'bg-vue-500 text-white' : 'text-slate-500 dark:text-slate-400'"
          @click="mode = m.value"
        >
          {{ m.label }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-4 text-sm">
        <label class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          分隔符
          <USelect v-model="delimiter" :items="delimiters" size="xs" class="w-28" />
        </label>
        <UCheckbox v-if="mode === 'csv2json'" v-model="header" label="首行为表头" />
      </div>

      <UTextarea
        v-model="input"
        :rows="8"
        :placeholder="mode === 'csv2json' ? '粘贴 CSV 文本…' : '粘贴 JSON 数组，如 [{ a: 1 }]…'"
        autoresize
        :maxrows="16"
        class="w-full font-mono text-sm"
      />
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">结果</h2>
        <UButton icon="i-lucide-copy" label="复制" color="neutral" variant="soft" size="sm" :disabled="!output" @click="copy" />
      </div>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <pre v-else class="max-h-[28rem] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-sm dark:bg-white/5">{{ output || '—' }}</pre>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { csvToJson, jsonToCsv } from '~/utils/csv'

definePageMeta({ layout: 'tool' })

type Mode = 'csv2json' | 'json2csv'
const modes: { value: Mode; label: string }[] = [
  { value: 'csv2json', label: 'CSV → JSON' },
  { value: 'json2csv', label: 'JSON → CSV' }
]
const mode = ref<Mode>('csv2json')
const delimiter = ref(',')
const delimiters = [
  { label: '逗号 ,', value: ',' },
  { label: '分号 ;', value: ';' },
  { label: '制表符', value: '\t' }
]
const header = ref(true)
const input = ref('')

const result = computed<{ value: string; error: string }>(() => {
  if (!input.value.trim()) return { value: '', error: '' }
  try {
    const value =
      mode.value === 'csv2json'
        ? csvToJson(input.value, { delimiter: delimiter.value, header: header.value })
        : jsonToCsv(input.value)
    return { value, error: '' }
  } catch (e) {
    return { value: '', error: e instanceof Error ? e.message : '处理失败' }
  }
})

const output = computed(() => result.value.value)
const error = computed(() => result.value.error)

async function copy() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
  } catch {
    /* 静默 */
  }
}
</script>
