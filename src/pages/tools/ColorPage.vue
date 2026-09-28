<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { useStored } from '~/composables/useStored'
import {
  colorScale,
  contrastRatio,
  formatColor,
  parseColor,
  rgbToHex,
  wcagChecks,
  type Color
} from '~/tools/color'

const raw = useStored('tool.color.input', '#42b883')
const compareRaw = useStored('tool.color.compare', '#ffffff')
const alpha = ref(100)

const parsed = computed(() => parseColor(raw.value))
const compareParsed = computed(() => parseColor(compareRaw.value))

const color = computed<Color | null>(() => {
  if (!parsed.value.ok) return null
  return { ...parsed.value.color, alpha: alpha.value / 100 }
})
const compareColor = computed<Color | null>(() =>
  compareParsed.value.ok ? compareParsed.value.color : null
)

watch(parsed, (value) => {
  if (value.ok) alpha.value = Math.round(value.color.alpha * 100)
})

const formats = computed(() => (color.value ? formatColor(color.value) : null))
const hexWithAlpha = (value: Color): string => `#${rgbToHex(value, { alpha: value.alpha < 1 })}`

const formatRows = computed(() => {
  if (!formats.value || !color.value) return []
  const alphaUsed = alpha.value < 100
  return [
    { label: 'HEX', value: formats.value.hex, hint: '最常用，不含透明度' },
    { label: 'HEX + 透明度', value: hexWithAlpha(color.value), hint: '8 位十六进制' },
    { label: 'RGB', value: alphaUsed ? formats.value.rgba : formats.value.rgb, hint: '取值 0–255' },
    { label: 'HSL', value: alphaUsed ? formats.value.hsla : formats.value.hsl, hint: '色相 / 饱和度 / 亮度' }
  ]
})

const scale = computed(() => (color.value ? colorScale(color.value) : []))

const ratio = computed(() =>
  color.value && compareColor.value ? contrastRatio(color.value, compareColor.value) : null
)
const checks = computed(() => (ratio.value === null ? null : wcagChecks(ratio.value)))
const ratioTone = computed(() => {
  if (ratio.value === null) return 'neutral' as const
  if (ratio.value >= 7) return 'success' as const
  if (ratio.value >= 4.5) return 'warning' as const
  return 'error' as const
})

/** 原生取色器只认 6 位 HEX：alpha 单独用滑杆保留，别把 8 位串塞给它 */
const pickerHex = computed(() => (color.value ? `#${rgbToHex({ ...color.value, alpha: 1 })}` : '#000000'))

function onPickerInput(event: Event): void {
  const next = (event.target as HTMLInputElement).value
  const base = parseColor(next)
  if (!base.ok || !color.value) return
  raw.value = hexWithAlpha({ ...base.color, alpha: color.value.alpha })
}

function onAlphaInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  alpha.value = Math.min(Math.max(value, 0), 100)
  if (!parsed.value.ok) return
  raw.value = hexWithAlpha({ ...parsed.value.color, alpha: alpha.value / 100 })
}

const samples = [
  { label: '品牌绿', value: '#42b883' },
  { label: '品牌深蓝', value: '#35495e' },
  { label: '警告橙', value: '#f59e0b' },
  { label: '错误红', value: '#ef4444' },
  { label: '链接蓝', value: '#3b82f6' },
  { label: '石墨黑', value: '#18181b' }
]
</script>

<template>
  <ToolShell tool-id="color">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start gap-3">
        <input
          type="color"
          :value="pickerHex"
          aria-label="取色器"
          class="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-default bg-elevated p-1"
          @input="onPickerInput"
        />
        <UInput
          v-model="raw"
          size="lg"
          placeholder="#42b883 / rgb(66,184,131) / hsl(153,53%,49%)"
          :ui="{ base: 'font-mono' }"
          class="min-w-56 flex-1"
          aria-label="颜色值"
        />
      </div>

      <p v-if="!parsed.ok" class="text-sm text-error">{{ parsed.error }}</p>

      <div v-else class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-dimmed">快捷取色</span>
        <UButton
          v-for="sample in samples"
          :key="sample.value"
          size="xs"
          color="neutral"
          variant="outline"
          @click="raw = sample.value"
        >
          <span class="inline-flex items-center gap-1.5">
            <span class="size-3 rounded-full border border-default" :style="{ background: sample.value }" />
            {{ sample.label }}
          </span>
        </UButton>
      </div>

      <div v-if="color" class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div
          class="relative flex min-h-32 items-center justify-center overflow-hidden rounded-xl border border-default"
          :style="{ background: compareColor ? `rgb(${compareColor.r},${compareColor.g},${compareColor.b})` : '#fff' }"
        >
          <div class="px-4 py-6 text-center">
            <p class="text-2xl font-bold" :style="{ color: color ? `rgba(${color.r},${color.g},${color.b},${color.alpha})` : 'inherit' }">
              Aa 你好，ToolBox
            </p>
            <p class="mt-1 text-sm" :style="{ color: color ? `rgba(${color.r},${color.g},${color.b},${color.alpha})` : 'inherit' }">
              14 px 正文在所选背景上的实际观感
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-3 rounded-xl border border-default p-4">
          <div class="flex items-center gap-3">
            <div
              class="size-16 shrink-0 rounded-lg border border-default"
              :style="{ background: `rgba(${color.r},${color.g},${color.b},${color.alpha})` }"
            />
            <div class="min-w-0 flex-1">
              <label class="flex items-center justify-between text-xs text-dimmed">
                透明度
                <span class="font-mono">{{ alpha }}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                :value="alpha"
                aria-label="透明度"
                class="mt-2 w-full accent-[var(--ui-primary)]"
                @input="onAlphaInput"
              />
              <div class="mt-2 flex items-center gap-2">
                <span class="text-xs text-dimmed">对比色</span>
                <UInput
                  v-model="compareRaw"
                  size="xs"
                  class="w-28"
                  :ui="{ base: 'font-mono' }"
                  aria-label="对比背景色"
                />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UBadge :color="ratioTone" variant="subtle" :label="ratio === null ? '—' : `对比度 ${ratio}:1`" />
            <template v-if="checks">
              <UBadge :color="checks.aaNormal ? 'success' : 'neutral'" variant="soft" :label="`AA 正文 ${checks.aaNormal ? '通过' : '不通过'}`" />
              <UBadge :color="checks.aaLarge ? 'success' : 'neutral'" variant="soft" :label="`AA 大字 ${checks.aaLarge ? '通过' : '不通过'}`" />
              <UBadge :color="checks.aaaNormal ? 'success' : 'neutral'" variant="soft" :label="`AAA 正文 ${checks.aaaNormal ? '通过' : '不通过'}`" />
            </template>
          </div>
          <p class="text-xs leading-relaxed text-dimmed">
            按 WCAG 2.x 相对亮度计算，1:1 到 21:1。正文要求 ≥ 4.5，大号文字（18pt 或 14pt 粗体）要求 ≥ 3。
          </p>
        </div>
      </div>

      <section v-if="formatRows.length" class="overflow-hidden rounded-xl border border-default">
        <table class="w-full text-sm">
          <tbody>
            <tr
              v-for="row in formatRows"
              :key="row.label"
              class="border-b border-default last:border-b-0"
            >
              <th scope="row" class="w-32 whitespace-nowrap px-3 py-2 text-left align-middle text-xs text-dimmed">
                {{ row.label }}
              </th>
              <td class="px-3 py-2 align-middle">
                <code class="block break-all font-mono text-default">{{ row.value }}</code>
                <span v-if="row.hint" class="text-xs text-dimmed">{{ row.hint }}</span>
              </td>
              <td class="w-14 px-3 py-2 text-right align-middle">
                <CopyButton :text="row.value" label="" size="xs" />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="scale.length" class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">色阶预览</h2>
        <ul class="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <li v-for="step in scale" :key="step.label">
            <button
              type="button"
              class="flex w-full flex-col overflow-hidden rounded-lg border border-default text-left transition-transform hover:-translate-y-0.5"
              :title="`点击复制 ${step.hex} · 对白色 ${step.ratioToWhite}:1 · 对黑色 ${step.ratioToBlack}:1`"
              @click="raw = step.hex"
            >
              <span class="h-10 w-full" :style="{ background: step.hex }" />
              <span class="block px-2 py-1 text-xs">
                <span class="font-mono text-default">{{ step.label }}</span>
                <span class="ml-1 break-all font-mono text-dimmed">{{ step.hex }}</span>
              </span>
            </button>
          </li>
        </ul>
        <p class="text-xs text-dimmed">
          以当前颜色为基准向白/黑插值得到，点一格即把上方输入换成该色。仅用于挑主色梯度，不等同 Tailwind 官方色板。
        </p>
      </section>
    </div>
  </ToolShell>
</template>
