<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  MAX_BYTES,
  base64SizeOf,
  buildSnippets,
  formatBytes,
  isImpracticallyLarge,
  probeImageSize,
  readFileAsDataUrl,
  type ImageInfo,
  type ImagePayload
} from '~/tools/image-base64'

const payload = ref<ImagePayload | null>(null)
const info = ref<ImageInfo | null>(null)
const error = ref('')
const dragging = ref(false)
const busy = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

async function accept(file: File | undefined): Promise<void> {
  if (!file) return
  busy.value = true
  error.value = ''
  const result = await readFileAsDataUrl(file)
  busy.value = false
  if (!result.ok) {
    payload.value = null
    info.value = null
    error.value = result.error
    return
  }
  payload.value = result.payload
  info.value = null
  info.value = await probeImageSize(result.payload.dataUrl)
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  void accept(event.dataTransfer?.files?.[0])
}

function onPick(event: Event): void {
  const files = (event.target as HTMLInputElement).files
  void accept(files?.[0])
}

function reset(): void {
  payload.value = null
  info.value = null
  error.value = ''
  if (inputRef.value) inputRef.value.value = ''
}

const snippets = computed(() => (payload.value ? buildSnippets(payload.value.dataUrl, payload.value.name) : null))
const encodedSize = computed(() => (payload.value ? payload.value.base64.length : 0))
const overhead = computed(() => {
  if (!payload.value || payload.value.size === 0) return 0
  return Math.round((encodedSize.value / payload.value.size - 1) * 100)
})
const tooBig = computed(() => encodedSize.value > 0 && isImpracticallyLarge(encodedSize.value))
const truncatedPreview = computed(() => {
  if (!payload.value) return ''
  const body = payload.value.base64
  return body.length <= 400 ? body : `${body.slice(0, 200)}\n… 省略 ${body.length - 400} 个字符 …\n${body.slice(-200)}`
})

const referenceRows = computed(() => {
  if (!payload.value || !snippets.value) return []
  const shorten = (text: string): string =>
    text.length > 300 ? `${text.slice(0, 150)} … [${text.length} 字符] … ${text.slice(-150)}` : text
  return [
    { label: 'HTML', text: shorten(snippets.value.html) },
    { label: 'CSS', text: shorten(snippets.value.css) },
    { label: 'Markdown', text: shorten(snippets.value.markdown) },
    { label: '仅 Base64 正文', text: shorten(payload.value.base64) }
  ]
})
</script>

<template>
  <ToolShell tool-id="image-base64">
    <div class="flex flex-col gap-4">
      <div
        class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center transition-colors"
        :class="dragging ? 'border-primary bg-primary/10' : 'border-default bg-elevated'"
        role="button"
        tabindex="0"
        aria-label="选择或拖入图片文件"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
        @click="inputRef?.click()"
        @keydown.enter.prevent="inputRef?.click()"
      >
        <UIcon name="lucide:image" class="size-8 text-primary" />
        <p class="text-sm text-default">
          <span v-if="busy">读取中…</span>
          <template v-else>把图片拖到这里，或点击选择文件</template>
        </p>
        <p class="text-xs text-dimmed">
          支持 PNG / JPG / WebP / SVG / GIF，单文件不超过 {{ formatBytes(MAX_BYTES) }}；文件只在本地读取，不会上传。
        </p>
        <input
          ref="inputRef"
          type="file"
          accept="image/*"
          class="sr-only"
          aria-label="选择图片文件"
          @change="onPick"
        />
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        :title="error"
      />

      <div v-if="payload" class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <div class="flex flex-col items-center gap-2 rounded-xl border border-default p-3">
            <img
              :src="payload.dataUrl"
              :alt="payload.name"
              class="max-h-48 w-full rounded-lg object-contain"
            />
            <a
              :href="payload.dataUrl"
              :download="payload.name"
              class="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm text-primary transition-colors hover:text-highlighted"
            >
              <UIcon name="lucide:download" class="size-4" />
              下载原图
            </a>
          </div>

          <dl class="grid grid-cols-2 gap-x-4 gap-y-3 self-start text-sm">
            <div class="col-span-2 min-w-0">
              <dt class="text-xs text-dimmed">文件</dt>
              <dd class="truncate font-mono">{{ payload.name }}</dd>
            </div>
            <div>
              <dt class="text-xs text-dimmed">MIME</dt>
              <dd class="font-mono">{{ payload.mime }}</dd>
            </div>
            <div>
              <dt class="text-xs text-dimmed">尺寸</dt>
              <dd class="font-mono">{{ info ? `${info.width} × ${info.height}` : '未知' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-dimmed">原体积</dt>
              <dd class="font-mono">{{ formatBytes(payload.size) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-dimmed">Base64 体积</dt>
              <dd class="font-mono">{{ formatBytes(encodedSize) }}（约 +{{ overhead }}%）</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-xs text-dimmed">理论长度</dt>
              <dd class="font-mono">{{ base64SizeOf(payload.size) }} 字符（⌈字节/3⌉×4）</dd>
            </div>
          </dl>
        </div>

        <UAlert
          v-if="tooBig"
          color="warning"
          variant="subtle"
          icon="lucide:triangle-alert"
          title="这段 data URL 超过 2 MB"
          description="内联进 CSS/HTML 会明显拖慢首屏，建议改用文件引用或压缩后再转。"
        />

        <section class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-highlighted">完整 data URL</h2>
            <div class="flex items-center gap-2">
              <CopyButton :text="payload.dataUrl" label="复制 data URL" size="xs" />
              <UButton size="xs" color="neutral" variant="outline" label="换一个文件" @click="reset" />
            </div>
          </div>
          <textarea
            :value="payload.dataUrl"
            readonly
            rows="6"
            aria-label="完整 data URL"
            class="w-full overflow-y-auto rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-muted"
          />
          <p class="text-xs text-dimmed">共 {{ encodedSize }} 个字符。为免页面卡顿，下面的预览只截取首尾各 200 字符。</p>
          <pre class="overflow-x-auto rounded-lg border border-default bg-elevated p-3 text-xs leading-relaxed text-muted">{{ truncatedPreview }}</pre>
        </section>

        <section v-if="snippets" class="flex flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">常用引用写法</h2>
          <div class="flex flex-col gap-2">
            <div
              v-for="row in referenceRows"
              :key="row.label"
              class="flex flex-col gap-1"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs text-dimmed">{{ row.label }}</span>
                <CopyButton :text="row.text" label="" size="xs" />
              </div>
              <code class="block max-h-24 overflow-y-auto break-all rounded-lg border border-default bg-elevated px-3 py-2 font-mono text-xs text-default">
                {{ row.text.length > 300 ? `${row.text.slice(0, 150)} … [${row.text.length} 字符] … ${row.text.slice(-150)}` : row.text }}
              </code>
            </div>
          </div>
        </section>
      </div>

      <p v-else-if="!error" class="text-sm text-dimmed">还没有选择文件。</p>
    </div>
  </ToolShell>
</template>
