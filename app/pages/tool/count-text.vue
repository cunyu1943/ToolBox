<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UTextarea v-model="input" :rows="10" placeholder="粘贴或输入要统计的文本…" class="w-full text-sm" />
      <p class="text-xs text-slate-400">全部统计在浏览器本地完成，不上传任何内容；超大文本（&gt;50 万字符）自动暂停统计。</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">统计结果</h2>
        <UButton icon="i-lucide-copy" label="复制摘要" color="neutral" variant="soft" size="sm" :disabled="!summary" @click="copy(summary)" />
      </div>
      <p v-if="tooBig" class="text-sm text-amber-500">文本超过 50 万字符，已暂停统计以保证输入流畅。</p>
      <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="item in cards" :key="item.label" class="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p class="text-xs text-slate-400">{{ item.label }}</p>
          <p class="mt-1 text-xl font-semibold tabular-nums">{{ item.value }}</p>
        </div>
      </div>
      <p v-if="!tooBig && input.trim()" class="text-xs text-slate-400">预计阅读 / 朗读时长约 {{ readLabel }}</p>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { countText, readingMinutes, type TextStats } from '~/utils/count-text'


const { copy } = useCopy()

const input = ref('')
const MAX_STATS = 500_000
const tooBig = computed(() => input.value.length > MAX_STATS)

// MB 级文本每次击键做码点展开会卡输入，做 300ms 防抖
const EMPTY_STATS: TextStats = {
  chars: 0, charsNoSpace: 0, chinese: 0, words: 0,
  englishWords: 0, lines: 0, sentences: 0, paragraphs: 0
}
const stats = ref<TextStats>(EMPTY_STATS)
let timer: ReturnType<typeof setTimeout> | undefined
watch(input, (t) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    stats.value = tooBig.value ? EMPTY_STATS : countText(t)
  }, 300)
}, { immediate: true })

const cards = computed(() => [
  { label: '字符数（不含空格）', value: stats.value.charsNoSpace.toLocaleString() },
  { label: '字符数（含空格）', value: stats.value.chars.toLocaleString() },
  { label: '中文字数', value: stats.value.chinese.toLocaleString() },
  { label: '英文单词', value: stats.value.englishWords.toLocaleString() },
  { label: '总词数（词+汉字）', value: stats.value.words.toLocaleString() },
  { label: '非空行数', value: stats.value.lines.toLocaleString() },
  { label: '句子数', value: stats.value.sentences.toLocaleString() },
  { label: '段落数', value: stats.value.paragraphs.toLocaleString() }
])

const minutes = computed(() => (tooBig.value ? 0 : readingMinutes(input.value)))
const readLabel = computed(() => {
  const m = minutes.value
  return m >= 1 ? `${m} 分钟` : `${Math.max(Math.round(m * 60), 1)} 秒`
})

const summary = computed(() => {
  if (tooBig.value || !input.value.trim()) return ''
  const s = stats.value
  return [
    `字符数（不含空格）：${s.charsNoSpace}`,
    `字符数（含空格）：${s.chars}`,
    `中文字数：${s.chinese}`,
    `英文单词：${s.englishWords}`,
    `总词数：${s.words}`,
    `非空行数：${s.lines}`,
    `句子数：${s.sentences}`,
    `段落数：${s.paragraphs}`,
    `预计阅读时长：${readLabel.value}`
  ].join('\n')
})
</script>
