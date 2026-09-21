<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <UTextarea v-model="input" :rows="6" placeholder="输入或粘贴文本…" autoresize :maxrows="14" class="w-full text-sm" />
      <div class="flex flex-wrap gap-2">
        <UButton label="全角 → 半角" icon="i-lucide-arrow-right" color="primary" @click="output = toHalfWidth(input)" />
        <UButton label="半角 → 全角" icon="i-lucide-arrow-left" color="neutral" variant="soft" @click="output = toFullWidth(input)" />
        <UButton label="交换到输入" icon="i-lucide-arrow-down-up" color="neutral" variant="ghost" :disabled="!output" @click="swap" />
      </div>
      <p class="text-xs text-slate-400">仅转换 ASCII 区（含空格）；中文、标点等非 ASCII 字符保持不变。</p>
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
import { toHalfWidth, toFullWidth } from '~/utils/fullwidth'

const { copy: copyWithToast } = useCopy()

definePageMeta({ layout: 'tool' })

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
