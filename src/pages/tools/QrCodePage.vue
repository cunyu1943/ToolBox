<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { useStored } from '~/composables/useStored'
import {
  CAPACITY_BY_LEVEL,
  byteLength,
  renderQr,
  type QrErrorLevel,
  type QrOutput
} from '~/tools/qr-code'

const text = useStored('tool.qr.text', 'https://cunyu1943.github.io/ToolBox/')
const errorLevel = useStored<QrErrorLevel>('tool.qr.level', 'M')
const margin = useStored('tool.qr.margin', 2)
const width = useStored('tool.qr.width', 512)
const dark = useStored('tool.qr.dark', '#18181b')
const light = useStored('tool.qr.light', '#ffffff')

const output = ref<QrOutput | null>(null)
const error = ref('')
const busy = ref(false)
let token = 0

async function render(): Promise<void> {
  const current = ++token
  if (!text.value.trim()) {
    output.value = null
    error.value = ''
    busy.value = false
    return
  }
  busy.value = true
  const result = await renderQr(text.value, {
    errorLevel: errorLevel.value,
    margin: Number(margin.value) || 0,
    width: Number(width.value) || 512,
    dark: dark.value,
    light: light.value
  })
  if (current !== token) return
  busy.value = false
  if (result.ok) {
    output.value = result.output
    error.value = ''
  } else {
    output.value = null
    error.value = result.error
  }
}

watch([text, errorLevel, margin, width, dark, light], () => { void render() }, { immediate: true })

const levelItems: { label: string; value: QrErrorLevel }[] = [
  { label: 'L · 恢复 7%', value: 'L' },
  { label: 'M · 恢复 15%', value: 'M' },
  { label: 'Q · 恢复 25%', value: 'Q' },
  { label: 'H · 恢复 30%', value: 'H' }
]

const bytes = computed(() => byteLength(text.value))
const capacity = computed(() => CAPACITY_BY_LEVEL[errorLevel.value])
const usage = computed(() => (capacity.value ? Math.min(100, Math.round((bytes.value / capacity.value) * 100)) : 0))
const isEmpty = computed(() => text.value.trim() === '')

const widthItems = [
  { label: '256 px', value: 256 },
  { label: '512 px', value: 512 },
  { label: '1024 px', value: 1024 }
]

function downloadSvg(): void {
  if (!output.value) return
  const url = URL.createObjectURL(new Blob([output.value.svg], { type: 'image/svg+xml;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'qrcode.svg'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <ToolShell tool-id="qr-code">
    <div class="flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm text-muted">内容</span>
        <UTextarea
          v-model="text"
          :rows="4"
          placeholder="链接、文本、Wi-Fi 配置…"
          class="w-full"
          :ui="{ base: 'font-mono text-sm leading-relaxed resize-y' }"
        />
      </label>

      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 text-xs text-dimmed">
          容错等级
          <USelect v-model="errorLevel" :items="levelItems" size="lg" class="w-32" aria-label="容错等级" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-dimmed">
          边距（模块）
          <input
            v-model.number="margin"
            type="number"
            min="0"
            max="8"
            class="h-11 w-20 rounded-lg border border-default bg-elevated px-3 font-mono text-sm text-default"
            aria-label="静区边距"
          />
        </label>
        <label class="flex flex-col gap-1 text-xs text-dimmed">
          前景
          <input v-model="dark" type="color" class="h-11 w-16 cursor-pointer rounded-lg border border-default bg-elevated p-1" aria-label="前景色" />
        </label>
        <label class="flex flex-col gap-1 text-xs text-dimmed">
          背景
          <input v-model="light" type="color" class="h-11 w-16 cursor-pointer rounded-lg border border-default bg-elevated p-1" aria-label="背景色" />
        </label>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-dimmed">尺寸</span>
          <div class="flex items-center gap-1">
            <UButton
              v-for="item in widthItems"
              :key="item.value"
              size="sm"
              :variant="width === item.value ? 'solid' : 'outline'"
              :color="width === item.value ? 'primary' : 'neutral'"
              :label="item.label"
              @click="width = item.value"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge color="neutral" variant="subtle" :label="`${bytes} 字节 / 上限约 ${capacity}`" />
        <UBadge :color="usage > 85 ? 'error' : usage > 60 ? 'warning' : 'success'" variant="soft" :label="`占用 ${usage}%`" />
        <UBadge v-if="output" color="neutral" variant="soft" :label="`版本 ${output.version}（${output.modules}×${output.modules}）`" />
        <span v-if="busy" class="text-xs text-dimmed">生成中…</span>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        :title="error"
      />
      <p v-else-if="isEmpty" class="text-sm text-dimmed">输入内容后即可生成二维码。</p>

      <div v-else-if="output" class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
        <div class="flex flex-col items-center gap-3">
          <img
            :src="output.png"
            :width="width"
            :height="width"
            alt="生成的二维码"
            class="w-full max-w-64 rounded-xl border border-default"
          />
          <div class="flex flex-wrap items-center justify-center gap-2">
            <a
              :href="output.png"
              download="qrcode.png"
              class="inline-flex h-8 min-w-9 items-center gap-1.5 rounded-md border border-default px-2.5 text-sm text-default transition-colors hover:bg-elevated"
            >
              <UIcon name="lucide:download" class="size-4" />
              PNG
            </a>
            <UButton
              icon="lucide:download"
              label="SVG"
              size="sm"
              color="neutral"
              variant="outline"
              @click="downloadSvg"
            />
            <CopyButton :text="output.png" label="复制 data URL" size="sm" />
          </div>
        </div>

        <section class="flex min-w-0 flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-highlighted">SVG 源码</h2>
            <CopyButton :text="output.svg" label="" size="xs" />
          </div>
          <pre class="max-h-64 overflow-auto rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-muted">{{ output.svg }}</pre>
          <p class="text-xs leading-relaxed text-dimmed">
            PNG 由 canvas 生成，放大用上面的 1024 px；需要无限缩放就取 SVG。前景与背景对比度不足时部分扫码器会识别失败。
          </p>
        </section>
      </div>
    </div>
  </ToolShell>
</template>
