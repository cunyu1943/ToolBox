<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center gap-2">
        <USwitch v-model="toMorse" color="primary" />
        <span class="text-sm text-slate-600 dark:text-slate-300">
          {{ toMorse ? '文本 → 摩尔斯电码' : '摩尔斯电码 → 文本' }}
        </span>
      </div>
      <UTextarea
        v-model="input"
        :rows="4"
        :placeholder="toMorse ? '输入要编码的文本（仅支持字母/数字/常用标点）' : '输入电码，如：... --- ...（/ 分隔单词）'"
        class="w-full font-mono"
      />
      <p v-if="unknown.length" class="text-sm text-amber-500">
        已忽略无法识别的{{ toMorse ? '字符' : '电码' }}：{{ unknown.join(' ') }}
      </p>
    </GlassCard>

    <ResultPanel
      v-if="output"
      :title="toMorse ? '摩尔斯电码' : '解码文本'"
      :value="output"
      :value-label="toMorse ? '电码' : '明文'"
    />
  </div>
</template>

<script setup lang="ts">
import { morseDecode, morseEncode } from '~/utils/morse'


const toMorse = ref(true)
const input = ref('SOS')

const result = computed(() =>
  toMorse.value ? morseEncode(input.value) : morseDecode(input.value)
)
const output = computed(() => result.value.value)
const unknown = computed(() => result.value.unknown)
</script>
