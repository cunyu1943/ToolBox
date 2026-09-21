<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">图片 → Base64</h2>
      <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-vue-500 dark:border-white/15">
        <UIcon name="i-lucide-image-plus" class="h-4 w-4" />
        选择本地图片
        <input type="file" accept="image/*" class="hidden" @change="onFile">
      </label>
      <div v-if="file" class="space-y-3">
        <div class="flex items-center gap-4">
          <img :src="dataUrl" alt="预览" class="max-h-40 max-w-40 rounded-lg border border-slate-200/60 object-contain dark:border-white/10">
          <div class="text-xs text-slate-400">
            <p>{{ file.name }}</p>
            <p>{{ mime }} · 原图 {{ formatBytes(file.size) }} · Base64 {{ formatBytes(dataUrl.length) }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton label="复制完整 dataURL" color="primary" size="sm" @click="copy(dataUrl)" />
          <UButton label="仅复制 Base64 数据" color="neutral" variant="soft" size="sm" @click="copy(base64Only)" />
        </div>
        <textarea :value="dataUrlPreview" readonly rows="5" class="w-full rounded-lg bg-slate-50 p-3 font-mono text-xs dark:bg-white/5" />
      </div>
      <p v-else class="text-xs text-slate-400">图片不经过任何服务器，转换全部在浏览器内存中完成。</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Base64 → 图片</h2>
      <UTextarea v-model="pasted" :rows="4" placeholder="粘贴 data:image/...;base64,... 完整前缀" class="w-full font-mono text-xs" />
      <p v-if="pastedErr" class="text-sm text-red-500">{{ pastedErr }}</p>
      <div v-if="parsed && previewSrc" class="space-y-2">
        <img :src="previewSrc" alt="还原预览" class="max-h-60 max-w-full rounded-lg border border-slate-200/60 dark:border-white/10">
        <p class="text-xs text-slate-400">{{ parsed.mime }} · 解码后约 {{ formatBytes(parsed.bytes) }}</p>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { formatBytes, parseDataUrl } from '~/utils/image-base64-tool'

definePageMeta({ layout: 'tool' })

const file = ref<File | null>(null)
const dataUrl = ref('')
const mime = ref('')

const base64Only = computed(() => parseDataUrl(dataUrl.value)?.data ?? '')
// 大字符串完整渲染到 textarea 会卡顿，仅截断预览；复制按钮仍取完整 dataUrl
const dataUrlPreview = computed(() => {
  const s = dataUrl.value
  return s.length > 1200
    ? `${s.slice(0, 1200)}\n…（已截断显示，共 ${s.length.toLocaleString()} 字符，用上方按钮复制完整内容）`
    : s
})

const pasted = ref('')
const pastedTrimmed = computed(() => pasted.value.trim())
// MB 级字符串的即时解析+预览重渲染会卡输入，做 300ms 防抖；超 8M 字符只提示不解析
const PARSE_LIMIT = 8_000_000
const tooBig = computed(() => pastedTrimmed.value.length > PARSE_LIMIT)
const previewSrc = ref('')
const parsed = ref<ReturnType<typeof parseDataUrl>>(null)
const pending = ref(false)
let parseTimer: ReturnType<typeof setTimeout> | undefined
watch(pastedTrimmed, (s) => {
  clearTimeout(parseTimer)
  if (!s) {
    previewSrc.value = ''
    parsed.value = null
    pending.value = false
    return
  }
  pending.value = true
  parseTimer = setTimeout(() => {
    pending.value = false
    if (tooBig.value) {
      previewSrc.value = ''
      parsed.value = null
      return
    }
    parsed.value = parseDataUrl(s)
    previewSrc.value = parsed.value ? s : ''
  }, 300)
})
const pastedErr = computed(() => {
  if (!pastedTrimmed.value || pending.value) return ''
  if (tooBig.value) return '内容过大（超过 800 万字符），未生成预览'
  return parsed.value ? '' : '不是合法的 dataURL（需以 data: 开头且含 ;base64,）'
})

function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    file.value = f
    mime.value = f.type || '未知类型'
    dataUrl.value = String(reader.result)
  }
  reader.readAsDataURL(f)
}

async function copy(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* 静默 */
  }
}
</script>
