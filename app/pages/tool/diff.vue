<template>
  <div class="space-y-4">
    <div class="grid gap-4 lg:grid-cols-2">
      <GlassCard custom-class="p-4 space-y-2">
        <p class="text-xs text-slate-400">原始文本（左）</p>
        <UTextarea v-model="oldText" :rows="10" auto-resize placeholder="粘贴第一份文本…" class="w-full font-mono text-sm" />
      </GlassCard>
      <GlassCard custom-class="p-4 space-y-2">
        <p class="text-xs text-slate-400">对比文本（右）</p>
        <UTextarea v-model="newText" :rows="10" auto-resize placeholder="粘贴第二份文本…" class="w-full font-mono text-sm" />
      </GlassCard>
    </div>

    <GlassCard v-if="hasInput" custom-class="p-4 space-y-3">
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <span class="text-emerald-500">+ {{ result.added }}</span>
        <span class="text-red-500">- {{ result.removed }}</span>
        <span class="text-slate-400">= {{ result.unchanged }} 行相同</span>
        <UButton
          icon="i-lucide-copy"
          size="xs"
          color="neutral"
          variant="ghost"
          label="复制统一格式"
          class="ml-auto"
          @click="copyUnified"
        />
      </div>
      <div class="overflow-x-auto rounded-lg bg-slate-50/80 dark:bg-white/5">
        <div v-for="(line, idx) in result.lines" :key="idx" class="flex gap-2 px-3 py-0.5 font-mono text-sm" :class="rowClass(line.op)">
          <span class="w-10 shrink-0 select-none text-right text-xs text-slate-400">{{ line.oldNo ?? '' }}</span>
          <span class="w-10 shrink-0 select-none text-right text-xs text-slate-400">{{ line.newNo ?? '' }}</span>
          <span class="w-4 shrink-0 select-none">{{ line.op === 'add' ? '+' : line.op === 'del' ? '-' : '' }}</span>
          <span class="whitespace-pre-wrap break-all">{{ line.text || ' ' }}</span>
        </div>
        <p v-if="!result.lines.length" class="p-3 text-sm text-slate-400">两侧均为空。</p>
      </div>
    </GlassCard>

    <p v-else class="text-xs text-slate-400">按行对比两段文本，实时显示新增 / 删除 / 相同行及行号。</p>
  </div>
</template>

<script setup lang="ts">
import type { DiffOp } from '~/utils/diff'
import { diffLines, toUnifiedDiff } from '~/utils/diff'

const { copy: copyWithToast } = useCopy()

definePageMeta({ layout: 'tool' })

const oldText = ref('')
const newText = ref('')

const hasInput = computed(() => oldText.value.trim() !== '' || newText.value.trim() !== '')
const result = computed(() => diffLines(oldText.value, newText.value))

function rowClass(op: DiffOp) {
  if (op === 'add') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (op === 'del') return 'bg-red-500/10 text-red-700 dark:text-red-300'
  return 'text-slate-600 dark:text-slate-300'
}

async function copyUnified() {
  await copyWithToast(toUnifiedDiff(result.value))
}
</script>
