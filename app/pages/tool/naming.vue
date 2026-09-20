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
    { label: 'camelCase', value: toCamelCase(s) },
    { label: 'PascalCase', value: toPascalCase(s) },
    { label: 'snake_case', value: toSnakeCase(s) },
    { label: 'kebab-case', value: toKebabCase(s) },
    { label: 'CONSTANT_CASE', value: toConstantCase(s) },
    { label: 'Title Case', value: toTitleCase(s) },
    { label: 'Sentence case', value: toSentenceCase(s) }
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
