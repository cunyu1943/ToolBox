<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div v-for="side in sides" :key="side.key" class="space-y-2">
          <p class="text-xs text-slate-400">{{ side.label }}</p>
          <div class="flex items-center gap-2">
            <UInput v-model="colors[side.key]" size="lg" placeholder="#1E293B" class="w-full font-mono" />
            <input v-model="pickers[side.key]" type="color" class="h-10 w-12 cursor-pointer rounded-lg border border-slate-200/60 bg-transparent dark:border-white/10" @input="colors[side.key] = pickers[side.key]">
          </div>
        </div>
      </div>
      <div class="flex items-center justify-center">
        <UButton icon="i-lucide-arrow-left-right" size="xs" color="neutral" variant="ghost" label="交换前景 / 背景" @click="swap" />
      </div>
      <div
        v-if="result"
        class="rounded-xl border border-slate-200/60 p-5 text-center dark:border-white/10"
        :style="{ background: colors.bg, color: colors.fg }"
      >
        <p class="text-lg font-semibold">大文本示例 Aa 18px</p>
        <p class="text-sm">正文文本示例：The quick brown fox jumps over the lazy dog. 0123456789</p>
      </div>
    </GlassCard>

    <GlassCard v-if="result" custom-class="p-5 space-y-3">
      <div class="flex items-baseline gap-3">
        <span class="text-3xl font-bold text-slate-800 dark:text-slate-100">{{ result.ratio.toFixed(2) }}</span>
        <span class="text-sm text-slate-400">: 1 对比度</span>
      </div>
      <div class="grid gap-2 sm:grid-cols-2">
        <div v-for="row in checks" :key="row.label" class="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2 text-sm dark:bg-white/5">
          <span class="text-slate-500 dark:text-slate-400">{{ row.label }}</span>
          <span :class="row.pass ? 'text-emerald-500' : 'text-red-500'" class="font-medium">
            {{ row.pass ? '通过' : '不通过' }}（阈值 {{ row.threshold }}）
          </span>
        </div>
      </div>
      <p class="text-xs text-slate-400">依据 WCAG 2.1：普通文本 AA ≥ 4.5、AAA ≥ 7；大文本（≥18px 或 ≥14px 加粗）AA ≥ 3、AAA ≥ 4.5。</p>
    </GlassCard>
    <p v-else-if="colors.fg.trim() || colors.bg.trim()" class="text-sm text-red-500">请输入合法的 HEX 色值，如 #336699 或 #369。</p>
  </div>
</template>

<script setup lang="ts">
import { evaluateContrast } from '~/utils/contrast'


const colors = reactive({ fg: '#767676', bg: '#ffffff' })
const pickers = reactive({ fg: '#767676', bg: '#ffffff' })

const sides = [
  { key: 'fg' as const, label: '前景色（文字）' },
  { key: 'bg' as const, label: '背景色' }
]

const result = computed(() => evaluateContrast(colors.fg, colors.bg))

const checks = computed(() => {
  const r = result.value
  if (!r) return []
  return [
    { label: '普通文本 AA', pass: r.passAA, threshold: 4.5 },
    { label: '普通文本 AAA', pass: r.passAAA, threshold: 7 },
    { label: '大文本 AA', pass: r.passAALarge, threshold: 3 },
    { label: '大文本 AAA', pass: r.passAAALarge, threshold: 4.5 }
  ]
})

function swap() {
  const f = colors.fg
  colors.fg = colors.bg
  colors.bg = f
  const pf = pickers.fg
  pickers.fg = pickers.bg
  pickers.bg = pf
}
</script>
