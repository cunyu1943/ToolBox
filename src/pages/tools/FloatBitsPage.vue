<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  CLASSIFICATION_CN, FLOAT_PRECISIONS, FLOAT_SAMPLES, inspectBits, inspectNumber,
  segmentBits, type FloatPrecision, type FloatView
} from '~/tools/float-bits'
import { useStored } from '~/composables/useStored'

type Direction = 'number' | 'bits'

const directionItems: { label: string; value: Direction }[] = [
  { label: '十进制 → 位布局', value: 'number' },
  { label: '位布局 → 数值', value: 'bits' }
]
const precisionItems: { label: string; value: FloatPrecision | 0 }[] = [
  { label: '按长度自动判定', value: 0 },
  ...FLOAT_PRECISIONS.map((precision) => ({ label: `${precision} 位（强制）`, value: precision }))
]

const direction = useStored<Direction>('tool.float-bits.direction', 'number')
const source = useStored('tool.float-bits.source', '0.1')
const forced = useStored<FloatPrecision | 0>('tool.float-bits.precision', 0)

const numberResult = computed(() =>
  direction.value === 'number' ? inspectNumber(source.value) : null
)
const bitsResult = computed(() =>
  direction.value === 'bits' ? inspectBits(source.value, forced.value || undefined) : null
)

const views = computed<FloatView[]>(() => {
  if (numberResult.value?.ok) return numberResult.value.views
  if (bitsResult.value?.ok && bitsResult.value.view) return [bitsResult.value.view]
  return []
})

const errorText = computed(() => numberResult.value?.error || bitsResult.value?.error || '')

/** 符号 / 指数 / 尾数三段，用于上色展示 */
function segments(view: FloatView) {
  return [
    { key: 'sign', label: '符号', bits: view.signBit, cls: 'text-error bg-error/10' },
    { key: 'exp', label: `指数（偏 ${view.layout.bias}）`, bits: view.expBit, cls: 'text-warning bg-warning/10' },
    { key: 'frac', label: '尾数', bits: view.fracBit, cls: 'text-primary bg-primary/10' }
  ]
}

const LOSSLESS: Record<'exact' | 'overflow' | 'approx', { label: string; color: 'success' | 'warning' | 'error' }> = {
  exact: { label: '可精确表示', color: 'success' },
  overflow: { label: '溢出为无穷', color: 'warning' },
  approx: { label: '只能近似', color: 'error' }
}

/** 只有「数字 → 位串」方向才有 lossless 标记；视图顺序与 FLOAT_PRECISIONS 一致 */
function losslessOf(view: FloatView) {
  const flag = numberResult.value?.lossless[FLOAT_PRECISIONS.indexOf(view.layout.precision)]
  if (flag === true) return LOSSLESS.exact
  if (flag === null) return LOSSLESS.overflow
  if (flag === false) return LOSSLESS.approx
  return null
}

const cards = computed(() => views.value.map((view) => ({ view, badge: losslessOf(view) })))

function fill(sample: string) {
  source.value = sample
}
function swap() {
  const current = views.value[0]
  if (direction.value === 'number') {
    direction.value = 'bits'
    if (current) source.value = segmentBits(current)
  } else {
    direction.value = 'number'
    if (current) source.value = current.shortForm
  }
}
function clearAll() {
  source.value = ''
}
</script>

<template>
  <ToolShell tool-id="float-bits">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">方向</span>
          <USelect v-model="direction" :items="directionItems" size="lg" class="w-44" aria-label="转换方向" />
        </label>

        <label v-if="direction === 'bits'" class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">精度</span>
          <USelect v-model="forced" :items="precisionItems" size="lg" class="w-44" aria-label="强制精度" />
        </label>

        <div class="ms-auto flex items-center gap-2">
          <UButton icon="lucide:arrow-left-right" label="换成反方向" color="neutral" variant="ghost" @click="swap" />
          <UButton icon="lucide:eraser" label="清空" color="neutral" variant="ghost" @click="clearAll" />
        </div>
      </div>

      <div v-if="direction === 'number'" class="flex flex-wrap gap-2">
        <UButton
          v-for="sample in FLOAT_SAMPLES"
          :key="sample.value"
          :label="sample.label"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="fill(sample.value)"
        />
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">
          {{ direction === 'number' ? '十进制数' : '二进制位串（16 / 32 / 64 位，空格与下划线会被忽略）' }}
        </h2>
        <UInput
          v-model="source"
          size="lg"
          spellcheck="false"
          :placeholder="direction === 'number' ? '0.1、-3.5、1e-8、NaN、Infinity' : '0 01111011 00110011001100110011010'"
          :ui="{ base: 'font-mono' }"
        />
      </div>

      <UAlert
        v-if="errorText"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        title="无法解析"
        :description="errorText"
      />

      <section
        v-if="numberResult?.ok"
        class="flex flex-col gap-2 rounded-xl border border-default bg-elevated p-4"
      >
        <h2 class="text-sm font-medium text-highlighted">你输入的十进制字面量，精确值就是</h2>
        <p class="break-all font-mono text-sm leading-relaxed text-default">{{ numberResult.inputExact }}</p>
        <p class="text-xs text-dimmed">
          整数部分 {{ numberResult.inputDigits.integer }} 位、小数部分 {{ numberResult.inputDigits.fraction }} 位。
          它能不能被各种浮点格式精确装下，看下面每张卡片的标记。
        </p>
        <UAlert
          v-for="note in numberResult.notes"
          :key="note"
          color="warning"
          variant="subtle"
          icon="lucide:triangle-alert"
          :title="note"
        />
      </section>

      <section v-for="{ view, badge } in cards" :key="view.layout.precision" class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            {{ view.layout.name }}
            <span class="ms-1 text-xs font-normal text-dimmed">{{ view.layout.alias }}</span>
          </h2>
          <UBadge :label="CLASSIFICATION_CN[view.classification]" color="neutral" variant="subtle" size="sm" />
          <UBadge v-if="badge" :label="badge.label" :color="badge.color" variant="subtle" size="sm" />
          <div class="ms-auto flex items-center gap-2">
            <span class="text-xs text-dimmed">复制位串</span>
            <CopyButton :text="view.bits" size="xs" />
          </div>
        </div>

        <div class="flex flex-wrap gap-2" :aria-label="`${view.layout.name} 位布局`">
          <div v-for="part in segments(view)" :key="part.key" class="flex min-w-0 flex-col gap-1">
            <span class="text-xs text-dimmed">{{ part.label }} · {{ part.bits.length }} 位</span>
            <code class="overflow-x-auto rounded-md px-2 py-1.5 font-mono text-xs tracking-wider whitespace-nowrap" :class="part.cls">{{ part.bits }}</code>
          </div>
        </div>

        <dl class="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-default p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">三段拼接</dt>
            <dd class="break-all font-mono text-sm text-default">{{ segmentBits(view) }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">JS 读到的值（最短往返）</dt>
            <dd class="break-all font-mono text-sm text-highlighted">{{ view.shortForm }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">该位模式表示的精确十进制</dt>
            <dd class="break-all font-mono text-sm text-default">{{ view.exactDecimal }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">指数位 / 真指数</dt>
            <dd class="break-all font-mono text-sm text-default">{{ view.biasedExponent }} → {{ view.unbiasedExponent }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">还原式 value = (−1)^s × 有效数 × 2^e</dt>
            <dd class="break-all font-mono text-sm text-default">({{ view.negative ? '−1' : '+1' }}) × {{ view.significand }} × 2^{{ view.exp2 }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">实际有效位 / 精确小数位</dt>
            <dd class="break-all font-mono text-sm text-default">{{ view.significantBits }} 位 / 小数 {{ view.exactDigits.fraction }} 位</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">相邻间距（1 ulp）</dt>
            <dd class="break-all font-mono text-sm text-default">{{ view.ulpDecimal }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">nextUp</dt>
            <dd class="break-all font-mono text-sm text-default">{{ view.nextUp }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">nextDown</dt>
            <dd class="break-all font-mono text-sm text-default">{{ view.nextDown }}</dd>
          </div>
        </dl>

        <ul v-if="view.notes.length" class="flex flex-col gap-1">
          <li v-for="note in view.notes" :key="note" class="text-xs leading-relaxed text-warning">{{ note }}</li>
        </ul>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        双精度用 <strong class="text-muted">52 位尾数 + 11 位指数</strong>，能精确表示到约 15–17 位有效十进制数字，
        但 0.1 这类「十进制有限小数」在二进制里是无限循环的，所以只能存成最接近的可表示值——这就是
        <code class="rounded bg-elevated px-1 py-0.5">0.1 + 0.2 !== 0.3</code> 的全部原因。
        本页的精确十进制展开、1 ulp 与 nextUp/nextDown 全部由
<code class="rounded bg-elevated px-1 py-0.5">BigInt</code> 长除算出（binary16 由本模块自行编解码，
        因为 JS 没有原生 half 类型），并与 <code class="rounded bg-elevated px-1 py-0.5">DataView</code>
        的读写结果交叉核验过。金额计算请改用整数「分」或十进制库，别依赖浮点。
      </p>
    </div>
  </ToolShell>
</template>
