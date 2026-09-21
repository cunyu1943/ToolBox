<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UInput v-model="input" size="lg" placeholder="输入变量名，如 get user HTML text / getUserHTMLText" class="w-full font-mono" icon="i-lucide-text-cursor-input" />
      <p class="text-xs text-slate-400">支持 camelCase、snake_case、kebab-case、空格等混合作输入，自动分词后转换。</p>
    </GlassCard>

    <GlassCard custom-class="p-5">
      <div class="divide-y divide-slate-200/60 dark:divide-white/10">
        <div v-for="row in rows" :key="row.label" class="flex items-center justify-between gap-4 py-2.5">
          <div class="min-w-0">
            <p class="text-xs text-slate-400">{{ row.label }}</p>
            <code class="break-all font-mono text-sm text-slate-800 dark:text-slate-100">{{ row.value || '—' }}</code>
          </div>
          <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" :disabled="!row.value" @click="copy(row.value)" />
        </div>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { toCamelCase, toPascalCase, toSnakeCase, toKebabCase, toConstantCase, toTitleCase, toSentenceCase } from '~/utils/naming'

definePageMeta({ layout: 'tool' })

const input = ref('')
const rows = computed(() => {
  const s = input.value.trim()
  if (!s) return []
  return [
    { label: '驼峰命名法 camelCase', value: toCamelCase(s) },
    { label: '大驼峰命名法 PascalCase', value: toPascalCase(s) },
    { label: '蛇形命名法 snake_case', value: toSnakeCase(s) },
    { label: '连字符命名法 kebab-case', value: toKebabCase(s) },
    { label: '常量命名法 CONSTANT_CASE', value: toConstantCase(s) },
    { label: '标题命名法 Title Case', value: toTitleCase(s) },
    { label: '句首大写 Sentence case', value: toSentenceCase(s) }
  ]
})

async function copy(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* 静默 */
  }
}
</script>
