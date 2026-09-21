<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UTextarea v-model="input" :rows="4" auto-resize placeholder="输入文本或链接，如 https://example.com" class="w-full" />
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">纠错等级</span>
          <USelect v-model="level" :items="levels" size="sm" class="w-24" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">前景</span>
          <input v-model="dark" type="color" class="h-7 w-10 cursor-pointer rounded border border-slate-200/60 bg-transparent dark:border-white/10">
          <span class="text-xs text-slate-400">背景</span>
          <input v-model="light" type="color" class="h-7 w-10 cursor-pointer rounded border border-slate-200/60 bg-transparent dark:border-white/10">
        </div>
      </div>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    </GlassCard>

    <GlassCard v-if="svg" custom-class="p-5 flex flex-col items-center gap-4">
      <!-- qrcode 包输出仅含 path/rect 与颜色，无用户原文，可安全注入 -->
      <div class="rounded-xl bg-white p-3 shadow-inner" v-html="svg" />
      <div class="flex flex-wrap justify-center gap-2">
        <UButton icon="i-lucide-download" label="下载 SVG" size="sm" @click="downloadSvg" />
        <UButton icon="i-lucide-image-down" label="下载 PNG" size="sm" color="neutral" variant="outline" :loading="pngBusy" @click="downloadPng" />
      </div>
      <p class="text-xs text-slate-400">等级越高可容错越强（H≈30%），但同样内容会更密。SVG 无损缩放，PNG 固定 512px。</p>
    </GlassCard>
    <p v-else-if="!input.trim() && !error" class="text-xs text-slate-400">内容全部在浏览器本地生成，不经过任何服务器。</p>
  </div>
</template>

<script setup lang="ts">
import type { EcLevel } from '~/utils/qrcode-tool'
import { generateQrPngDataUrl, generateQrSvg } from '~/utils/qrcode-tool'

definePageMeta({ layout: 'tool' })

const levels: EcLevel[] = ['L', 'M', 'Q', 'H']
const input = ref('https://github.com/cunyu1943/ToolBox')
const level = ref<EcLevel>('M')
const dark = ref('#0f172a')
const light = ref('#ffffff')
const svg = ref('')
const error = ref('')
const pngBusy = ref(false)

let seq = 0
watch([input, level, dark, light], async () => {
  const my = ++seq
  const text = input.value.trim()
  if (!text) {
    svg.value = ''
    error.value = ''
    return
  }
  try {
    const out = await generateQrSvg(text, { level: level.value, dark: dark.value, light: light.value })
    if (my !== seq) return
    svg.value = out
    error.value = ''
  } catch (e) {
    if (my !== seq) return
    svg.value = ''
    error.value = `内容过长，超出二维码容量：${(e as Error).message}`
  }
}, { immediate: true })

function saveBlob(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

function downloadSvg() {
  const blob = new Blob([svg.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  saveBlob(url, 'qrcode.svg')
  URL.revokeObjectURL(url)
}

async function downloadPng() {
  pngBusy.value = true
  try {
    const dataUrl = await generateQrPngDataUrl(input.value.trim(), { level: level.value, dark: dark.value, light: light.value })
    saveBlob(dataUrl, 'qrcode.png')
  } catch {
    error.value = 'PNG 生成失败'
  } finally {
    pngBusy.value = false
  }
}
</script>
