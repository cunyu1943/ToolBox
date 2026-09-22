<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <UTextarea v-model="input" :rows="8" placeholder="粘贴 JSON 文本…" autoresize :maxrows="16" class="w-full font-mono text-sm" />
      <div class="flex flex-wrap items-center gap-2">
        <UButton label="格式化" icon="i-lucide-indent" color="primary" @click="run(formatJson)" />
        <UButton label="压缩" icon="i-lucide-minimize-2" color="neutral" variant="soft" @click="run(minifyJson)" />
        <UButton label="校验" icon="i-lucide-check-circle" color="neutral" variant="soft" @click="run(validateJson)" />
        <span class="ml-auto flex items-center gap-1 text-xs text-slate-400">
          缩进
          <USelect v-model="indent" :items="indentItems" size="xs" class="w-20" />
        </span>
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">结果</h2>
        <UButton icon="i-lucide-copy" label="复制" color="neutral" variant="soft" size="sm" :disabled="!result.output" @click="copy" />
      </div>
      <p v-if="!result.ok && result.error" class="text-sm text-red-500">{{ result.error }}</p>
      <pre v-else class="max-h-[28rem] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-sm dark:bg-white/5">{{ result.output || '—' }}</pre>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { formatJson, minifyJson, validateJson, type JsonResult } from '~/utils/json-tool'

const { copy: copyWithToast } = useCopy()


const input = ref('')
const indent = ref(2)
const indentItems = [
  { label: '2', value: 2 },
  { label: '4', value: 4 },
  { label: 'Tab', value: -1 }
]
const result = ref<JsonResult>({ ok: true, output: '' })

function run(fn: (text: string, indent?: number) => JsonResult) {
  const useIndent = indent.value === -1 ? '\t' : indent.value
  result.value = fn(input.value, useIndent as number)
}

async function copy() {
  if (!result.value.output) return
  await copyWithToast(result.value.output)
}
</script>
