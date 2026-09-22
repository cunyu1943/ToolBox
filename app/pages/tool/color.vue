<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="flex items-center gap-3">
        <input type="color" :value="validHex" class="h-11 w-14 cursor-pointer rounded-md border border-slate-200 bg-transparent dark:border-white/10" @input="onPick" />
        <UInput v-model="hex" icon="i-mdi-palette-swatch" placeholder="#4a90d9 或 4a90d9" class="flex-1 font-mono" />
        <UButton label="随机" icon="i-lucide-shuffle" color="neutral" variant="soft" @click="hex = randomHex()" />
      </div>
      <p v-if="!parsed" class="text-sm text-red-500">无法识别的颜色，请输入如 #ff8800 或 f00。</p>
      <div class="h-20 rounded-lg border border-slate-200/60 dark:border-white/10" :style="{ background: validHex }" />
    </GlassCard>

    <GlassCard custom-class="p-5">
      <div class="divide-y divide-slate-200/60 dark:divide-white/10">
        <div v-for="row in rows" :key="row.label" class="flex items-center justify-between gap-4 py-2.5">
          <div>
            <p class="text-xs text-slate-400">{{ row.label }}</p>
            <code class="font-mono text-sm text-slate-800 dark:text-slate-100">{{ row.value }}</code>
          </div>
          <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy(row.value)" />
        </div>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { hexToRgb, rgbToHsl, rgbToHex, formatRgb, formatHsl, randomHex } from '~/utils/color'

const { copy: copyWithToast } = useCopy()


const hex = ref('#4a90d9')

const parsed = computed(() => hexToRgb(hex.value))
const validHex = computed(() => (parsed.value ? rgbToHex(parsed.value) : '#000000'))
const hsl = computed(() => (parsed.value ? rgbToHsl(parsed.value) : null))

const rows = computed(() => {
  if (!parsed.value || !hsl.value) return []
  return [
    { label: 'HEX', value: validHex.value },
    { label: 'RGB', value: formatRgb(parsed.value) },
    { label: 'HSL', value: formatHsl(hsl.value) }
  ]
})

function onPick(e: Event) {
  hex.value = (e.target as HTMLInputElement).value
}

async function copy(text: string) {
  await copyWithToast(text)
}
</script>
