<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { useStored } from '~/composables/useStored'
import { contrastTone, evaluateContrast } from '~/tools/contrast'
import { formatColor, parseColor, rgbToHex, type Color } from '~/tools/color'

/** 前景 / 背景都不敏感，按站点惯例存 localStorage */
const fg = useStored('tool.contrast.fg', '#767676')
const bg = useStored('tool.contrast.bg', '#ffffff')

const parsed = (text: string): Color | null => {
  const result = parseColor(text)
  return result.ok ? result.color : null
}
const fgColor = computed(() => parsed(fg.value))
const bgColor = computed(() => parsed(bg.value))

/** 原生取色器只吃 6 位 HEX，透明度单独保留 */
const pickerHex = (color: Color | null): string =>
  color ? `#${rgbToHex({ ...color, alpha: 1 })}` : '#000000'
const cssOf = (color: Color | null): string =>
  color ? (color.alpha < 1 ? formatColor(color).rgba : formatColor(color).hex) : 'transparent'

const evaluation = computed(() => evaluateContrast(fg.value, bg.value))
const result = computed(() => (evaluation.value.ok ? evaluation.value.result : null))
const error = computed(() => {
  if (evaluation.value.ok) return null
  return `${evaluation.value.field === 'fg' ? '前景色' : '背景色'}：${evaluation.value.error}`
})

const ratioText = computed(() => (result.value ? result.value.ratio.toFixed(2) : '—'))
const ratioTone = computed(() => (result.value ? contrastTone(result.value.ratio) : ('neutral' as const)))
const ratioNote = computed(() => {
  const value = result.value?.ratio
  if (value === undefined) return ''
  if (value >= 7) return '正文、大字、非文本全部达标'
  if (value >= 4.5) return '正文达到 AA，还够不到 AAA（7:1）'
  if (value >= 3) return '只够大字与非文本，正文还差一点'
  return '正文与大字都不达标，需要换色'
})

/** 取色器不支持透明度，选完把原来的 alpha 贴回去 */
function onPick(key: 'fg' | 'bg', event: Event): void {
  const next = (event.target as HTMLInputElement).value
  const base = parsed(next)
  if (!base) return
  const current = key === 'fg' ? fgColor.value : bgColor.value
  const store = key === 'fg' ? fg : bg
  store.value = current && current.alpha < 1 ? `#${rgbToHex({ ...base, alpha: current.alpha })}` : next
}

function swap(): void {
  const next = fg.value
  fg.value = bg.value
  bg.value = next
}

const suggestion = computed(() => result.value?.suggestion ?? null)
const directionLabel = computed(() => (suggestion.value?.direction === 'lighten' ? '向白提亮' : '向黑压暗'))
const movedPct = computed(() => Math.round((suggestion.value?.moved ?? 0) * 100))

function applySuggestion(): void {
  if (suggestion.value) fg.value = suggestion.value.hex
}

const cssLines = computed(() => {
  if (!result.value) return []
  return [
    { label: '文字', value: `color: ${cssOf(fgColor.value)};` },
    { label: '背景', value: `background-color: ${cssOf(bgColor.value)};` }
  ]
})

const presets = [
  { label: '中灰压白（刚好过 AA）', fg: '#767676', bg: '#ffffff' },
  { label: 'slate-400 压白（不达标）', fg: '#94a3b8', bg: '#ffffff' },
  { label: '品牌绿压深蓝', fg: '#42b883', bg: '#35495e' },
  { label: '暗色主题品牌绿', fg: '#42d392', bg: '#18181b' },
  { label: '警示橙压白', fg: '#f59e0b', bg: '#ffffff' },
  { label: '半透明黑压白', fg: 'rgba(0,0,0,0.5)', bg: '#ffffff' }
]
</script>

<template>
  <ToolShell tool-id="contrast">
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label class="text-xs text-dimmed" for="contrast-fg">前景色（文字 / 图标）</label>
          <div class="flex items-center gap-2">
            <UInput
              id="contrast-fg"
              v-model="fg"
              size="lg"
              placeholder="#767676"
              :ui="{ base: 'font-mono' }"
              class="min-w-0 flex-1"
            />
            <input
              type="color"
              :value="pickerHex(fgColor)"
              aria-label="选取前景色"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-default bg-elevated p-1"
              @input="onPick('fg', $event)"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-xs text-dimmed" for="contrast-bg">背景色</label>
          <div class="flex items-center gap-2">
            <UInput
              id="contrast-bg"
              v-model="bg"
              size="lg"
              placeholder="#ffffff"
              :ui="{ base: 'font-mono' }"
              class="min-w-0 flex-1"
            />
            <input
              type="color"
              :value="pickerHex(bgColor)"
              aria-label="选取背景色"
              class="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-default bg-elevated p-1"
              @input="onPick('bg', $event)"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          icon="lucide:arrow-left-right"
          size="xs"
          color="neutral"
          variant="outline"
          label="交换前景 / 背景"
          @click="swap"
        />
        <span class="ml-1 text-xs text-dimmed">常用组合</span>
        <UButton
          v-for="preset in presets"
          :key="preset.label"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="fg = preset.fg; bg = preset.bg"
        >
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-flex size-3 overflow-hidden rounded-full border border-default">
              <span class="w-1/2" :style="{ background: preset.fg }" />
              <span class="w-1/2" :style="{ background: preset.bg }" />
            </span>
            {{ preset.label }}
          </span>
        </UButton>
      </div>

      <p v-if="error" class="text-sm text-error">{{ error }}</p>

      <template v-else-if="result">
        <div
          class="flex flex-col gap-3 rounded-xl border border-default px-4 py-5"
          :style="{ background: cssOf(bgColor) }"
        >
          <p class="text-2xl font-bold" :style="{ color: cssOf(fgColor) }">大字号标题 Aa 24 px</p>
          <p class="text-sm" :style="{ color: cssOf(fgColor) }">
            正文字号示例：The quick brown fox jumps over the lazy dog. 0123456789
          </p>
          <p class="text-xs" :style="{ color: cssOf(fgColor) }">
            小字说明：辅助文字、表单提示与表格注脚通常落在这个字号
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <span
              class="inline-flex items-center gap-1.5 rounded-md border-2 px-2 py-1 text-xs"
              :style="{ color: cssOf(fgColor), borderColor: cssOf(fgColor) }"
            >
              <UIcon name="lucide:contrast" class="size-4" />
              非文本：边框与图标
            </span>
            <span
              class="h-8 w-24 rounded-md border-2"
              :style="{ borderColor: cssOf(fgColor) }"
              aria-hidden="true"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <span class="text-3xl font-bold text-highlighted">{{ ratioText }}</span>
          <span class="text-sm text-dimmed">: 1 对比度</span>
          <UBadge :color="ratioTone" variant="subtle" :label="ratioNote" />
        </div>

        <p v-if="result.hasAlpha" class="text-xs leading-relaxed text-warning">
          有一侧带透明度：前景已按 alpha 合成到背景上再算比值；背景自身的透明度这里按不透明处理，
          实际取决于它叠在哪一层上。
        </p>

        <section class="overflow-hidden rounded-xl border border-default">
          <table class="w-full text-sm">
            <tbody>
              <tr v-for="row in result.rows" :key="row.key" class="border-b border-default last:border-b-0">
                <th scope="row" class="w-28 whitespace-nowrap px-3 py-2 text-left align-middle text-xs text-dimmed">
                  {{ row.label }}
                </th>
                <td class="w-16 px-3 py-2 align-middle font-mono text-default">≥ {{ row.threshold }}</td>
                <td class="w-20 px-3 py-2 align-middle">
                  <UBadge :color="row.pass ? 'success' : 'neutral'" variant="soft" :label="row.pass ? '通过' : '不通过'" />
                </td>
                <td class="px-3 py-2 align-middle text-xs text-dimmed">{{ row.hint }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section
          v-if="result.suggestion"
          class="flex flex-wrap items-center gap-3 rounded-xl border border-default p-4"
        >
          <span
            class="size-12 shrink-0 rounded-lg border border-default"
            :style="{ background: result.suggestion.hex }"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm text-default">
              {{ directionLabel }}：
              <code class="break-all font-mono">{{ result.suggestion.hex }}</code>
              <span class="text-dimmed">（{{ result.suggestion.ratio.toFixed(2) }}:1）</span>
            </p>
            <p v-if="result.suggestion.reached" class="mt-1 text-xs text-dimmed">
              保持背景不变、颜色也不换的情况下，把前景{{ directionLabel }}
              {{ movedPct }}% 就够正文 AA；改动更小的办法是放大字号或加粗。
            </p>
            <p v-else class="mt-1 text-xs text-dimmed">
              纯白与纯黑在这个背景上最高只有 {{ result.suggestion.ratio.toFixed(2) }}:1，
              靠调整明度到不了 4.5，需要同时改背景的明度或色相。
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              v-if="result.suggestion.reached"
              size="xs"
              color="neutral"
              variant="outline"
              label="换成这个前景"
              @click="applySuggestion"
            />
            <CopyButton :text="result.suggestion.hex" label="" size="xs" />
          </div>
        </section>

        <section v-if="cssLines.length" class="flex flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">取用</h2>
          <div
            v-for="line in cssLines"
            :key="line.label"
            class="flex items-center gap-3 rounded-lg border border-default px-3 py-2"
          >
            <span class="w-10 shrink-0 text-xs text-dimmed">{{ line.label }}</span>
            <code class="min-w-0 flex-1 break-all font-mono text-default">{{ line.value }}</code>
            <CopyButton :text="line.value" label="" size="xs" />
          </div>
        </section>
      </template>

      <section class="flex flex-col gap-1.5 rounded-xl border border-default p-4 text-xs leading-relaxed text-dimmed">
        <p>
          比值按 WCAG 2.x 的相对亮度算：先把 sRGB 通道转成线性值再按 0.2126 / 0.7152 / 0.0722 加权，
          取亮暗两侧各加 0.05 后相除，结果落在 1:1（同色）到 21:1（黑白）之间，与谁是前景谁是背景无关。
        </p>
        <p>
          「大字」指 ≥ 24 px，或 ≥ 18.66 px 且粗体——笔画更粗，所以同样对比度下更容易辨认，门槛从 4.5 降到 3。
          非文本 3:1 管的是图标、输入框边框、图表色块这类不含文字的界面元素。
        </p>
        <p>
          判定按 AA 优先：AA 是各国无障碍法规普遍引用的底线，AAA 是更严格的一档，两者都只针对文字与图形本身，
          不含字体渲染、行高与闪烁等要求。
        </p>
        <RouterLink
          to="/tools/color"
          class="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
        >
          <UIcon name="lucide:palette" class="size-4" />
          顺带做 HEX / RGB / HSL 互转与色阶预览 → 颜色转换器
        </RouterLink>
      </section>
    </div>
  </ToolShell>
</template>
