<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <UTextarea v-model="input" :rows="7" placeholder="粘贴要处理的文本…" class="w-full text-sm" />
      <div class="grid gap-3 sm:grid-cols-2">
        <UInput v-model="search" placeholder="查找内容" class="w-full font-mono" />
        <UInput v-model="replaceText" placeholder="替换为（留空即删除）" class="w-full font-mono" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          :color="caseSensitive ? 'primary' : 'neutral'" :variant="caseSensitive ? 'subtle' : 'soft'" size="sm"
          label="区分大小写" @click="caseSensitive = !caseSensitive"
        />
        <UButton
          :color="useRegex ? 'primary' : 'neutral'" :variant="useRegex ? 'subtle' : 'soft'" size="sm"
          label="正则模式" @click="useRegex = !useRegex"
        />
        <UButton
          :color="wholeWord && !useRegex ? 'primary' : 'neutral'" :variant="wholeWord && !useRegex ? 'subtle' : 'soft'" size="sm"
          :disabled="useRegex" label="全字匹配" @click="wholeWord = !wholeWord"
        />
        <span v-if="statusText" class="text-xs" :class="result.error ? 'text-red-500' : 'text-slate-400'">{{ statusText }}</span>
      </div>
      <p class="text-xs text-slate-400">
        正则模式为全局匹配，替换串可用 $1~$9 引用分组；普通模式下元字符与 $ 均按字面处理；全字匹配按英文单词边界判定。
      </p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">结果</h2>
        <div class="flex gap-2">
          <UButton label="结果换到输入" color="neutral" variant="ghost" size="sm" :disabled="!result.output" @click="swap" />
          <UButton icon="i-lucide-copy" label="复制" color="neutral" variant="soft" size="sm" :disabled="!result.output" @click="copy(result.output)" />
        </div>
      </div>
      <p v-if="tooBig" class="text-sm text-amber-500">文本超过 100 万字符，已暂停替换以保证输入流畅。</p>
      <pre v-else class="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-sm font-mono dark:bg-white/5">{{ preview || '—' }}</pre>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { replaceAll, type ReplaceResult } from '~/utils/find-replace'


const { copy } = useCopy()

const input = ref('')
const search = ref('')
const replaceText = ref('')
const caseSensitive = ref(true)
const useRegex = ref(false)
const wholeWord = ref(false)

const MAX_LEN = 1_000_000
const tooBig = computed(() => input.value.length > MAX_LEN)

const IDLE: ReplaceResult = { output: '', count: 0, error: '' }
const result = ref<ReplaceResult>(IDLE)
let timer: ReturnType<typeof setTimeout> | undefined
watch([input, search, replaceText, caseSensitive, useRegex, wholeWord], () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (tooBig.value || !search.value) {
      result.value = IDLE
      return
    }
    result.value = replaceAll(input.value, {
      search: search.value,
      replace: replaceText.value,
      caseSensitive: caseSensitive.value,
      useRegex: useRegex.value,
      wholeWord: wholeWord.value
    })
  }, 300)
}, { immediate: true })

const statusText = computed(() => {
  if (tooBig.value || !search.value) return ''
  if (result.value.error) return result.value.error
  return result.value.count ? `已替换 ${result.value.count} 处` : '未匹配到内容'
})

// 大结果全量渲染进 pre 会卡顿，仅截断预览；复制按钮始终取完整结果
const preview = computed(() => {
  const s = result.value.output
  return s.length > 20000
    ? `${s.slice(0, 20000)}\n…（预览已截断，共 ${s.length.toLocaleString()} 字符，用右上方按钮复制完整结果）`
    : s
})

function swap() {
  input.value = result.value.output
  result.value = IDLE
}
</script>
