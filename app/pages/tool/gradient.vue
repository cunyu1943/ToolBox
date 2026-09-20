<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-500 dark:text-slate-400">角度</span>
        <USlider v-model="angle" :min="0" :max="360" :step="1" class="flex-1" />
        <span class="w-14 text-right font-mono text-sm tabular-nums">{{ angle }}°</span>
      </div>

      <div class="space-y-2">
        <div v-for="(stop, i) in stops" :key="i" class="flex items-center gap-2">
          <input type="color" :value="stop.color" class="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-transparent dark:border-white/10" @input="onStop(i, $event)" />
          <UInput v-model="stop.color" size="sm" class="w-28 font-mono" />
          <USlider v-model="stop.pos" :min="0" :max="100" :step="1" class="flex-1" />
          <span class="w-10 text-right font-mono text-xs tabular-nums text-slate-400">{{ stop.pos }}%</span>
          <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" :disabled="stops.length <= 2" @click="stops.splice(i, 1)" />
        </div>
      </div>

      <div class="flex gap-2">
        <UButton label="添加色标" icon="i-lucide-plus" size="sm" color="neutral" variant="soft" :disabled="stops.length >= 6" @click="stops.push({ color: randomHex(), pos: 100 })" />
        <UButton label="随机" icon="i-lucide-shuffle" size="sm" color="neutral" variant="soft" @click="randomize" />
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">预览</h2>
        <UButton icon="i-lucide-copy" label="复制 CSS" color="neutral" variant="soft" size="sm" @click="copy" />
      </div>
      <div class="h-28 rounded-lg border border-slate-200/60 dark:border-white/10" :style="{ background: css }" />
      <code class="block break-all rounded-lg bg-slate-50 p-3 font-mono text-sm dark:bg-white/5">{{ css }}</code>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { buildLinearGradient } from '~/utils/gradient'
import { randomHex } from '~/utils/color'

definePageMeta({ layout: 'tool' })

const angle = ref(90)
const stops = reactive([{ color: '#42b883', pos: 0 }, { color: '#35495e', pos: 100 }])

const css = computed(() => buildLinearGradient(angle.value, stops))

function onStop(i: number, e: Event) {
  stops[i]!.color = (e.target as HTMLInputElement).value
}

function randomize() {
  for (const s of stops) s.color = randomHex()
}

async function copy() {
  try {
    await navigator.clipboard.writeText(css.value)
  } catch {
    /* 静默 */
  }
}
</script>
