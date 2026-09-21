<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">阿拉伯数字 → 罗马数字</p>
      <UInput
        v-model="numberInput"
        size="lg"
        class="w-full font-mono"
        placeholder="输入 1 ~ 3999 的整数，如 1994"
        icon="i-lucide-hash"
      />
      <p v-if="numError" class="text-sm text-red-500">{{ numError }}</p>
      <p v-else-if="roman" class="text-2xl font-semibold tracking-widest text-vue-600">{{ roman }}</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">罗马数字 → 阿拉伯数字</p>
      <UInput
        v-model="romanInput"
        size="lg"
        class="w-full font-mono"
        placeholder="输入罗马数字，如 MCMXCIV（不接受 IIII 等非规范写法）"
        icon="i-lucide-alpha"
      />
      <p v-if="romanError" class="text-sm text-red-500">{{ romanError }}</p>
      <p v-else-if="number" class="text-2xl font-semibold text-vue-600">{{ number }}</p>
    </GlassCard>

    <GlassCard custom-class="p-5">
      <p class="mb-2 text-xs text-slate-400">对照速查</p>
      <div class="grid grid-cols-4 gap-2 text-center text-sm sm:grid-cols-7">
        <div v-for="[n, r] in CHEATSHEET" :key="n" class="rounded-lg bg-slate-100/60 py-1.5 dark:bg-white/5">
          <span class="font-mono text-slate-500 dark:text-slate-300">{{ r }}</span>
          <span class="ml-1 text-slate-400">={{ n }}</span>
        </div>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { fromRoman, toRoman } from '~/utils/roman'

definePageMeta({ layout: 'tool' })

const numberInput = ref('1994')
const romanInput = ref('MMXXVI')

const CHEATSHEET = (['I', 'V', 'X', 'L', 'C', 'D', 'M'] as const).map(sym => {
  const n = fromRoman(sym)
  return [n, sym] as const
})

function safe(fn: () => string, input: string): { value: string; error: string } {
  if (!input.trim()) return { value: '', error: '' }
  try {
    return { value: fn(), error: '' }
  } catch (e) {
    return { value: '', error: e instanceof Error ? e.message : String(e) }
  }
}

const numResult = computed(() =>
  safe(() => toRoman(Number(numberInput.value)), numberInput.value)
)
const romanResult = computed(() => safe(() => String(fromRoman(romanInput.value)), romanInput.value))

const roman = computed(() => numResult.value.value)
const numError = computed(() => numResult.value.error)
const number = computed(() => romanResult.value.value)
const romanError = computed(() => romanResult.value.error)
</script>
