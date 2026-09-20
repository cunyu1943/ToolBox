<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <!-- 类型切换 -->
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="t in types"
          :key="t.value"
          :label="t.label"
          size="sm"
          :color="type === t.value ? 'primary' : 'neutral'"
          :variant="type === t.value ? 'solid' : 'outline'"
          @click="type = t.value"
        />
      </div>

      <!-- 方向切换 -->
      <div class="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-white/10">
        <button
          v-for="d in directions"
          :key="d.value"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
          :class="
            direction === d.value
              ? 'bg-vue-500 text-white'
              : 'text-slate-500 dark:text-slate-400'
          "
          @click="direction = d.value"
        >
          {{ d.label }}
        </button>
      </div>

      <UTextarea v-model="input" :rows="5" placeholder="在此输入或粘贴文本…" autoresize :maxrows="12" class="w-full font-mono text-sm" />

      <div class="flex gap-2">
        <UButton label="交换到输入" color="neutral" variant="soft" size="sm" icon="i-lucide-arrow-down-up" :disabled="!output" @click="swap" />
        <UButton label="清空" color="neutral" variant="ghost" size="sm" icon="i-lucide-eraser" @click="input = ''" />
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">结果</h2>
        <UButton icon="i-lucide-copy" label="复制" color="neutral" variant="soft" size="sm" :disabled="error || !output" @click="copy" />
      </div>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <pre v-else class="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-sm dark:bg-white/5">{{ output || '—' }}</pre>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import {
  base64Encode, base64Decode, base32Encode, base32Decode, urlEncode, urlDecode,
  htmlEscape, htmlUnescape, unicodeEscape, unicodeUnescape
} from '~/utils/encoding'

definePageMeta({ layout: 'tool' })

type Type = 'base64' | 'base32' | 'url' | 'html' | 'unicode'
const types: { value: Type; label: string }[] = [
  { value: 'base64', label: 'Base64' },
  { value: 'base32', label: 'Base32' },
  { value: 'url', label: 'URL' },
  { value: 'html', label: 'HTML 实体' },
  { value: 'unicode', label: 'Unicode' }
]
const type = ref<Type>('base64')

type Direction = 'encode' | 'decode'
const directions: { value: Direction; label: string }[] = [
  { value: 'encode', label: '编码' },
  { value: 'decode', label: '解码' }
]
const direction = ref<Direction>('encode')

const input = ref('')

const OPS: Record<Type, { encode: (s: string) => string; decode: (s: string) => string }> = {
  base64: { encode: base64Encode, decode: base64Decode },
  base32: { encode: base32Encode, decode: base32Decode },
  url: { encode: urlEncode, decode: urlDecode },
  html: { encode: htmlEscape, decode: htmlUnescape },
  unicode: { encode: unicodeEscape, decode: unicodeUnescape }
}

const result = computed<{ value: string; error: string }>(() => {
  if (!input.value) return { value: '', error: '' }
  try {
    const fn = OPS[type.value][direction.value]
    return { value: fn(input.value), error: '' }
  } catch (e) {
    return { value: '', error: e instanceof Error ? e.message : '处理失败' }
  }
})

const output = computed(() => result.value.value)
const error = computed(() => result.value.error)

function swap() {
  if (output.value) {
    input.value = output.value
    direction.value = direction.value === 'encode' ? 'decode' : 'encode'
  }
}

async function copy() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
  } catch {
    /* 剪贴板不可用时静默降级 */
  }
}
</script>
