<template>
  <GlassCard custom-class="p-5">
    <div v-if="title" class="mb-3 flex items-center gap-2">
      <UIcon name="i-lucide-sparkles" class="h-4 w-4 text-vue-500" />
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {{ title }}
      </h2>
    </div>

    <!-- 主结果 -->
    <div v-if="value !== undefined && value !== null" class="animate-fade-in" aria-live="polite">
      <p class="text-xs text-slate-400">{{ valueLabel }}</p>
      <p class="text-3xl font-bold text-vue-700 dark:text-vue-300">{{ value }}</p>
    </div>

    <!-- 明细行 -->
    <dl
      v-if="rows && rows.length"
      class="mt-4 space-y-2 border-t border-slate-200/60 pt-4 dark:border-white/10"
      aria-live="polite"
    >
      <div v-for="row in rows" :key="row.label" class="flex items-center justify-between gap-4">
        <dt class="text-sm text-slate-500 dark:text-slate-400">{{ row.label }}</dt>
        <dd class="text-right text-sm font-medium text-slate-800 tabular-nums dark:text-slate-100">
          {{ row.value }}
        </dd>
      </div>
    </dl>

    <p v-if="note" class="mt-3 text-xs text-slate-400">{{ note }}</p>

    <div v-if="copyText" class="mt-4">
      <UButton
        icon="i-lucide-copy"
        label="复制结果"
        color="neutral"
        variant="soft"
        size="sm"
        @click="copy"
      />
    </div>
  </GlassCard>
</template>

<script setup lang="ts">
export interface ResultRow {
  label: string
  value: string | number
}

const props = withDefaults(
  defineProps<{
    title?: string
    value?: string | number | null
    valueLabel?: string
    rows?: ResultRow[]
    note?: string
    /** 复制到剪贴板的纯文本；不传则不显示按钮 */
    copyText?: string
  }>(),
  { valueLabel: '结果' }
)

async function copy() {
  const text = props.copyText || ''
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* 剪贴板不可用时静默降级 */
  }
}
</script>
