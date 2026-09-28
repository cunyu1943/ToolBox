<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { decodeBase64, encodeBase64, statsFor } from '~/tools/base64'
import { useStored } from '~/composables/useStored'

type Mode = 'encode' | 'decode'

const mode = useStored<Mode>('tool.base64.mode', 'encode')
const input = useStored('tool.base64.input', 'ToolBox 工具箱 🧰')
const urlSafe = useStored('tool.base64.urlSafe', false)

const modes: { id: Mode; label: string }[] = [
  { id: 'encode', label: '文本 → Base64' },
  { id: 'decode', label: 'Base64 → 文本' }
]

const encoded = computed(() => encodeBase64(input.value, { urlSafe: urlSafe.value }))
const decoded = computed(() => decodeBase64(input.value))

const output = computed(() => (mode.value === 'encode' ? encoded.value : decoded.value.text ?? ''))
const decodeError = computed(() => (mode.value === 'decode' ? decoded.value.error ?? '' : ''))
const lossy = computed(() => mode.value === 'decode' && decoded.value.lossy === true)

const stats = computed(() => statsFor(mode.value === 'encode' ? input.value : output.value))
</script>

<template>
  <ToolShell tool-id="base64">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <div class="inline-flex rounded-lg border border-default bg-elevated p-1" role="group" aria-label="转换方向">
          <button
            v-for="item in modes"
            :key="item.id"
            type="button"
            class="inline-flex min-h-9 items-center rounded-md px-3 text-sm transition-colors"
            :class="mode === item.id ? 'bg-primary text-inverted' : 'text-muted hover:text-default'"
            :aria-pressed="mode === item.id"
            @click="mode = item.id"
          >
            {{ item.label }}
          </button>
        </div>

        <div
          v-if="mode === 'encode'"
          class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3"
        >
          <USwitch v-model="urlSafe" size="sm" aria-label="URL 安全字符集" />
          <span class="text-sm text-muted">URL 安全（- _ 且去填充）</span>
        </div>
      </div>

      <UAlert
        v-if="decodeError"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        title="解码失败"
        :description="decodeError"
      />
      <UAlert
        v-else-if="lossy"
        color="warning"
        variant="subtle"
        icon="lucide:info"
        title="字节流不是合法 UTF-8"
        description="已按 latin1 解码，出现乱码属正常：这段 Base64 背后多半是二进制数据（图片、压缩包等），请到「图片转 Base64」查看。"
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="flex min-w-0 flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">{{ mode === 'encode' ? '原文' : 'Base64' }}</h2>
          <UTextarea
            v-model="input"
            :rows="12"
            :placeholder="mode === 'encode' ? '输入要编码的文本…' : '输入要解码的 Base64…'"
            class="w-full"
            :ui="{ base: 'font-mono text-xs leading-relaxed' }"
          />
        </section>

        <section class="flex min-w-0 flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-highlighted">
              {{ mode === 'encode' ? 'Base64' : '解码结果' }}
            </h2>
            <CopyButton :text="output" :disabled="!output" />
          </div>
          <textarea
            :value="output"
            readonly
            rows="12"
            spellcheck="false"
            class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="结果会实时出现在这里"
          />
        </section>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs" aria-label="体积统计">
        <UBadge :label="`文本 ${stats.chars} 字符`" color="neutral" variant="subtle" />
        <UBadge :label="`UTF-8 ${stats.bytes} 字节`" color="neutral" variant="subtle" />
        <UBadge :label="`Base64 ${stats.base64Chars} 字符`" color="neutral" variant="subtle" />
        <span class="text-dimmed">
          中文一字 3 字节，所以 Base64 长度约为 UTF-8 字节的 4/3；emoji 走代理对，同样能正确编解码。
        </span>
      </div>
    </div>
  </ToolShell>
</template>
