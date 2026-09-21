<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <USelect v-model="mode" :items="modes" class="w-44" />
        <UButton
          v-if="input.trim()"
          icon="i-lucide-arrow-left-right"
          size="xs"
          color="neutral"
          variant="ghost"
          label="结果作为输入"
          @click="useOutputAsInput"
        />
      </div>
      <UTextarea v-model="input" :rows="10" auto-resize :placeholder="mode === modes[0] ? '<h1>标题</h1><p>内容…</p>' : '# 标题\n\n内容…'" class="w-full font-mono text-sm" />
    </GlassCard>

    <GlassCard v-if="output" custom-class="p-4 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-400">{{ mode === modes[0] ? 'Markdown 结果' : 'HTML 结果' }}</p>
        <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy" />
      </div>
      <pre class="overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-slate-800 dark:text-slate-100">{{ output }}</pre>
    </GlassCard>
    <p v-else class="text-xs text-slate-400">常用标签子集：标题 / 段落 / 加粗斜体 / 链接图片 / 列表 / 引用 / 行内代码 / 代码块 / hr。</p>
  </div>
</template>

<script setup lang="ts">
import { htmlToMarkdown, markdownToHtml } from '~/utils/html-md'

definePageMeta({ layout: 'tool' })

const modes = ['HTML → Markdown', 'Markdown → HTML'] as const
const mode = ref<string>(modes[0])
const input = ref('<h2>标题</h2>\n<p>你好 <strong>世界</strong></p>\n<ul><li>甲</li><li>乙</li></ul>')
const output = computed(() =>
  mode.value === modes[0] ? htmlToMarkdown(input.value) : markdownToHtml(input.value)
)

function useOutputAsInput() {
  input.value = output.value
}

async function copy() {
  try {
    await navigator.clipboard.writeText(output.value)
  } catch {
    /* 静默 */
  }
}
</script>
