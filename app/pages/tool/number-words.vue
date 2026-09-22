<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="value" label="输入数字" placeholder="如 1234.56" :max="99999999999999" />
      <p class="text-xs text-slate-400">支持负数与两位小数，金额最高至「万亿」级别。</p>
    </GlassCard>

    <ResultPanel
      title="中文转换"
      :rows="rows"
      note="大写遵循人民币财务规范（角后补「整」，元后无角有分补「零」）。"
      :copy-text="copyText"
    />
  </div>
</template>

<script setup lang="ts">
import { toChineseLower, toChineseUpper } from '~/utils/chinese-number'


const value = ref<number | null>(1234.56)

function safe(fn: (n: number) => string): string {
  if (value.value === null || !Number.isFinite(value.value)) return '—'
  try {
    return fn(value.value)
  } catch {
    return '超出支持范围'
  }
}

const upper = computed(() => safe(toChineseUpper))
const lower = computed(() => safe(toChineseLower))

const rows = computed(() => [
  { label: '财务大写', value: upper.value },
  { label: '中文读法', value: lower.value }
])

const copyText = computed(
  () => `数字：${value.value ?? ''}\n财务大写：${upper.value}\n中文读法：${lower.value}`
)
</script>
