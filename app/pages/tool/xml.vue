<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <UButton
            label="格式化"
            :color="mode === 'format' ? 'primary' : 'neutral'"
            :variant="mode === 'format' ? 'subtle' : 'outline'"
            @click="mode = 'format'"
          />
          <UButton
            label="压缩"
            :color="mode === 'minify' ? 'primary' : 'neutral'"
            :variant="mode === 'minify' ? 'subtle' : 'outline'"
            @click="mode = 'minify'"
          />
        </div>
        <div v-if="mode === 'format'" class="flex items-center gap-2">
          <span class="text-xs text-slate-400">缩进</span>
          <USelect v-model="indentLabel" :items="['2', '4']" size="xs" class="w-16" />
        </div>
      </div>
      <UTextarea v-model="input" :rows="10" auto-resize placeholder="粘贴 XML，如 <root><item id=&quot;1&quot;&gt;文本</item></root>" class="w-full font-mono text-sm" />
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    </GlassCard>

    <GlassCard v-if="result.ok && result.output" custom-class="p-4 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-400">{{ mode === 'format' ? '格式化结果' : '压缩结果' }}</p>
        <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy" />
      </div>
      <pre class="overflow-x-auto whitespace-pre break-all font-mono text-sm text-slate-800 dark:text-slate-100">{{ result.output }}</pre>
    </GlassCard>
    <p v-else-if="!input.trim()" class="text-xs text-slate-400">校验标签配对（含注释/CDATA/声明），错误给出位置；纯文本元素保持单行。</p>
  </div>
</template>

<script setup lang="ts">
import { formatXml, minifyXml } from '~/utils/xml-tool'

const { copy: copyWithToast } = useCopy()

definePageMeta({ layout: 'tool' })

const input = ref('<?xml version="1.0"?><books count="2"><book id="1"><title>三体</title></book><book id="2"><title>活着</title><note/></book></books>')
const mode = ref<'format' | 'minify'>('format')
const indentLabel = ref('2')

const result = computed(() =>
  mode.value === 'format'
    ? formatXml(input.value, Number(indentLabel.value))
    : minifyXml(input.value)
)
const error = computed(() => (result.value.ok ? '' : result.value.error))

async function copy() {
  await copyWithToast(result.value.output)
}
</script>
