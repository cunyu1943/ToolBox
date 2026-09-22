<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="(p, i) in PRESETS"
          :key="p.label"
          :label="p.label"
          size="xs"
          :color="preset === i ? 'primary' : 'neutral'"
          :variant="preset === i ? 'subtle' : 'ghost'"
          @click="applyPreset(i)"
        />
      </div>
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <span class="text-xs text-slate-400">源</span>
        <USelect v-model="from" :items="localeNames" size="sm" class="w-36" />
        <span class="text-xs text-slate-400">目标</span>
        <USelect v-model="to" :items="localeNames" size="sm" class="w-36" />
      </div>
      <UTextarea v-model="input" :rows="8" auto-resize placeholder="输入要转换的中文文本…" class="w-full text-sm" />
    </GlassCard>

    <GlassCard v-if="output" custom-class="p-4 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-400">转换结果</p>
        <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy" />
      </div>
      <pre class="overflow-x-auto whitespace-pre-wrap break-all text-sm text-slate-800 dark:text-slate-100">{{ output }}</pre>
    </GlassCard>
    <p v-else class="text-xs text-slate-400">基于 OpenCC 权威转换表，字级 + 词级双向转换；台/港地区在异体字与常用词上略有差异。</p>
  </div>
</template>

<script setup lang="ts">
import type { Locale } from '~/utils/chinese-convert'
import { convertChinese, PRESETS } from '~/utils/chinese-convert'

const { copy: copyWithToast } = useCopy()


const locales: Locale[] = ['cn', 'tw', 'hk']
const localeNames = ['简体', '繁体（台湾）', '繁体（香港）']
const preset = ref(0)
const from = ref<string>(localeNames[0])
const to = ref<string>(localeNames[1])
const input = ref('发发现面条里面头发计算机后端工程师著名')

const fromL = computed(() => locales[localeNames.indexOf(from.value)]!)
const toL = computed(() => locales[localeNames.indexOf(to.value)]!)

const output = computed(() => convertChinese(input.value, fromL.value, toL.value))

function applyPreset(i: number) {
  preset.value = i
  const p = PRESETS[i]!
  from.value = localeNames[locales.indexOf(p.from)]!
  to.value = localeNames[locales.indexOf(p.to)]!
}

async function copy() {
  await copyWithToast(output.value)
}
</script>
