<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <UTextarea v-model="input" :rows="8" placeholder="每行一条，如列表、日志、去重数据…" autoresize :maxrows="16" class="w-full text-sm font-mono" />
      <div class="flex flex-wrap gap-2">
        <UButton label="去重" color="primary" @click="apply(dedupeLines)" />
        <UButton label="去空行" color="neutral" variant="soft" @click="apply(removeEmptyLines)" />
        <UButton label="行首尾去空白" color="neutral" variant="soft" @click="apply(trimLines)" />
        <UButton label="升序排序" color="neutral" variant="soft" @click="apply((t) => sortLines(t))" />
        <UButton label="降序排序" color="neutral" variant="soft" @click="apply((t) => sortLines(t, true))" />
        <UButton label="反转行序" color="neutral" variant="soft" @click="apply(reverseLines)" />
        <UButton label="加序号" color="neutral" variant="soft" @click="apply(numberLines)" />
        <UButton label="随机打乱" color="neutral" variant="soft" @click="apply(shuffleLines)" />
        <UButton label="结果换到输入" color="neutral" variant="ghost" :disabled="!output" @click="swap" />
      </div>
      <p class="text-xs text-slate-400">兼容 \n / \r\n / \r 换行；排序按中文语言环境比较；多步处理可点"结果换到输入"后继续。</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">结果（{{ output ? splitLines(output).length : 0 }} 行）</h2>
        <UButton icon="i-lucide-copy" label="复制" color="neutral" variant="soft" size="sm" :disabled="!output" @click="copy" />
      </div>
      <pre class="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-sm font-mono dark:bg-white/5">{{ output || '—' }}</pre>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import {
  dedupeLines,
  numberLines,
  removeEmptyLines,
  reverseLines,
  shuffleLines,
  sortLines,
  splitLines,
  trimLines
} from '~/utils/lines-tool'

definePageMeta({ layout: 'tool' })

const input = ref('')
const output = ref('')

function apply(fn: (text: string) => string) {
  if (input.value) output.value = fn(input.value)
}

function swap() {
  input.value = output.value
  output.value = ''
}

async function copy() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
  } catch {
    /* 静默 */
  }
}
</script>
