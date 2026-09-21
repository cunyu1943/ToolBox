<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">类型名</span>
          <UInput v-model="rootName" size="xs" class="w-28" placeholder="Root" />
        </div>
        <UButton label="填充示例" size="xs" color="neutral" variant="outline" @click="useExample" />
      </div>
      <UTextarea v-model="input" :rows="10" auto-resize placeholder="粘贴 JSON，如 {&quot;id&quot;:1,&quot;tags&quot;:[{&quot;k&quot;:&quot;a&quot;}]}" class="w-full font-mono text-sm" />
      <p v-if="result.error" class="text-sm text-red-500">{{ result.error }}</p>
    </GlassCard>

    <GlassCard v-if="result.output" custom-class="p-4 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-400">TypeScript 接口</p>
        <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy" />
      </div>
      <pre class="overflow-x-auto whitespace-pre font-mono text-sm text-slate-800 dark:text-slate-100">{{ result.output }}</pre>
    </GlassCard>
    <p v-else-if="!result.error" class="text-xs text-slate-400">对象生成 interface，数组样本按键合并为单一类型，缺席键自动加可选符 ?。</p>
  </div>
</template>

<script setup lang="ts">
import { jsonToTs } from '~/utils/json-ts'

definePageMeta({ layout: 'tool' })

const EXAMPLE = '{"id":101,"name":"工具箱","vip":true,"tags":[{"key":"dev","weight":5},{"key":"life","weight":3}],"address":{"city":"杭州","zip":null}}'

const input = ref(EXAMPLE)
const rootName = ref('Root')

const result = computed(() => {
  try {
    return { output: jsonToTs(input.value, rootName.value.trim() || 'Root'), error: '' }
  } catch (e) {
    return { output: '', error: (e as Error).message }
  }
})

function useExample() {
  input.value = EXAMPLE
}

async function copy() {
  try {
    await navigator.clipboard.writeText(result.value.output)
  } catch {
    /* 静默 */
  }
}
</script>
