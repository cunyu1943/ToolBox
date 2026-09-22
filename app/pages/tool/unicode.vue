<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <UTextarea v-model="input" :rows="6" placeholder="输入原文（如：中文😀）或转义串（如：\u4e2d\u6587）…" autoresize :maxrows="14" class="w-full text-sm" />
      <div class="flex flex-wrap gap-2">
        <UButton label="中文 → \u4e2d\u6587 转义" color="primary" @click="output = toUnicodeEscape(input)" />
        <UButton label="\u4e2d\u6587 转义 → 中文" color="neutral" variant="soft" @click="output = fromUnicodeEscape(input)" />
        <UButton label="交换到输入" color="neutral" variant="ghost" :disabled="!output" @click="swap" />
      </div>
      <p class="text-xs text-slate-400">非 ASCII 字符按 UTF-16 码元转义为 \uXXXX；emoji 等增补字符拆为代理对，还原时自动配对。</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">结果</h2>
        <UButton icon="i-lucide-copy" label="复制" color="neutral" variant="soft" size="sm" :disabled="!output" @click="copy" />
      </div>
      <pre class="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-sm dark:bg-white/5">{{ output || '—' }}</pre>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { fromUnicodeEscape, toUnicodeEscape } from '~/utils/unicode-tool'

const { copy: copyWithToast } = useCopy()


const input = ref('')
const output = ref('')

function swap() {
  input.value = output.value
  output.value = ''
}

async function copy() {
  if (!output.value) return
  await copyWithToast(output.value)
}
</script>
