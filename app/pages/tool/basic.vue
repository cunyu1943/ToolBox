<template>
  <div class="space-y-4">
    <!-- 显示屏：上行表达式，下行当前值 -->
    <GlassCard custom-class="p-5">
      <div class="min-h-[2.5rem] truncate text-right text-sm text-slate-400">
        {{ state.expression || '\u00A0' }}
      </div>
      <div
        class="mt-1 truncate text-right text-4xl font-semibold tabular-nums text-slate-800 dark:text-slate-100"
        aria-live="polite"
      >
        {{ state.display }}
      </div>
    </GlassCard>

    <!-- 按键区 -->
    <div class="grid grid-cols-4 gap-2">
      <UButton
        v-for="k in keys"
        :key="k.value"
        :label="k.label"
        :color="k.color"
        :variant="k.variant"
        :class="k.span ? 'col-span-2' : ''"
        size="xl"
        class="justify-center !text-lg"
        @click="press(k.value)"
      />
    </div>
    <p class="text-center text-xs text-slate-400">
      支持键盘：数字、+ - * /、Enter 计算、Esc 清除、Backspace 退格
    </p>
  </div>
</template>

<script setup lang="ts">
import { initialCalc, press as step, type CalcKey, type CalcState } from '~/utils/calc-basic'

definePageMeta({ layout: 'tool' })

const keys: {
  value: CalcKey
  label: string
  color?: 'primary' | 'neutral'
  variant?: 'solid' | 'soft' | 'ghost'
  span?: boolean
}[] = [
  { value: 'AC', label: 'AC', color: 'neutral', variant: 'soft' },
  { value: 'C', label: 'C', color: 'neutral', variant: 'soft' },
  { value: 'back', label: '⌫', color: 'neutral', variant: 'soft' },
  { value: '/', label: '÷', color: 'primary', variant: 'soft' },
  { value: '7', label: '7' }, { value: '8', label: '8' }, { value: '9', label: '9' },
  { value: '*', label: '×', color: 'primary', variant: 'soft' },
  { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' },
  { value: '-', label: '−', color: 'primary', variant: 'soft' },
  { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
  { value: '+', label: '+', color: 'primary', variant: 'soft' },
  { value: 'sign', label: '±', color: 'neutral', variant: 'soft' },
  { value: '0', label: '0' },
  { value: '.', label: '.' },
  { value: 'pct', label: '%', color: 'neutral', variant: 'soft' },
  { value: '=', label: '=', color: 'primary', variant: 'solid', span: true }
]

const state = ref<CalcState>(initialCalc())

function press(key: CalcKey) {
  state.value = step(state.value, key)
}

// 键盘输入映射
function onKey(e: KeyboardEvent) {
  const k = e.key
  if (/^[0-9]$/.test(k)) press(k as CalcKey)
  else if (k === '.') press('.')
  else if (k === '+' || k === '-' || k === '*' || k === '/') press(k as CalcKey)
  else if (k === 'Enter' || k === '=') { e.preventDefault(); press('=') }
  else if (k === 'Escape') press('AC')
  else if (k === 'Backspace') press('back')
  else if (k === '%') press('pct')
}

useEventListener(window, 'keydown', onKey)
</script>
