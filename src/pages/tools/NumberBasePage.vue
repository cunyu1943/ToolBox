<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  BASE32_ALPHABET,
  BIT_WIDTHS,
  MAX_BASE,
  MIN_BASE,
  bitOps,
  bitOpOf,
  bitwise,
  convertAll,
  digitSetOf,
  groupByFour,
  parseBase32,
  parseInBase,
  placeValueBreakdown,
  quickBases,
  toBase,
  toBase32,
  type BitOp
} from '~/tools/number-base'
import { useStored } from '~/composables/useStored'

const input = useStored('tool.base.input', '255')
const preset = useStored('tool.base.preset', '10')
const customBase = useStored('tool.base.custom', 3)

const CUSTOM = 'custom'

const baseOptions = [
  ...quickBases.map((option) => ({ label: option.label, value: String(option.base) })),
  { label: '其他进制…', value: CUSTOM }
]

const fromBase = computed(() =>
  preset.value === CUSTOM ? Math.min(Math.max(Math.trunc(Number(customBase.value) || 0), MIN_BASE), MAX_BASE) : Number(preset.value)
)

const digits = computed(() => digitSetOf(fromBase.value))
const result = computed(() => convertAll(input.value, fromBase.value))
const rows = computed(() => result.value.rows ?? [])
const breakdown = computed(() => placeValueBreakdown(input.value, fromBase.value))
const binaryGrouped = computed(() => {
  const bin = result.value.rows?.find((row) => row.base === 2)?.value
  return bin ? groupByFour(bin) : ''
})
const showGrouped = ref(true)

const mainBase32 = computed(() =>
  result.value.ok && result.value.value !== undefined ? toBase32(result.value.value) : ''
)

/** RFC 4648 的 Base32：字母表与「32 进制」完全不同，所以单独一组输入框 */
const b32Text = useStored('tool.base.b32', 'AJ4=')
const b32 = computed(() => parseBase32(b32Text.value))
const b32Rows = computed(() => {
  if (!b32.value.ok || b32.value.value === undefined) return []
  const value = b32.value.value
  return [
    { label: '十进制', value: value.toString(10) },
    { label: '十六进制', value: toBase(value, 16) },
    { label: '二进制', value: groupByFour(toBase(value, 2)) },
    { label: '回写 Base32', value: toBase32(value) }
  ]
})

const widthOptions: { label: string; value: number }[] = BIT_WIDTHS.map((width) => ({
  label: `${width} 位`,
  value: width
}))
const opOptions = bitOps.map((option) => ({ label: option.label, value: option.value }))

const bitWidth = useStored('tool.base.bit.width', 8)
const bitOp = useStored('tool.base.bit.op', 'and' as BitOp)
const operandA = useStored('tool.base.bit.a', '240')
const operandB = useStored('tool.base.bit.b', '15')

/** 操作数沿用上方选定的源进制，避免同一页出现两套进制口径 */
const parsedA = computed(() => parseInBase(operandA.value, fromBase.value))
const parsedB = computed(() => parseInBase(operandB.value, fromBase.value))
const currentOp = computed(() => bitOpOf(bitOp.value))
const bits = computed(() =>
  bitwise(parsedA.value.value ?? 0n, parsedB.value.value ?? 0n, bitOp.value, bitWidth.value)
)
const bitError = computed(() => {
  if (!parsedA.value.ok) return `A：${parsedA.value.error}`
  if (currentOp.value.arity === 2 && !parsedB.value.ok) return `B：${parsedB.value.error}`
  return bits.value.error ?? ''
})
const bitRows = computed(() => {
  if (!bits.value.ok) return []
  return [
    { label: 'A', value: bits.value.a, text: bits.value.bitsA },
    {
      label: currentOp.value.shift ? 'B（位移量）' : 'B',
      value: bits.value.b,
      text: bits.value.bitsB
    },
    { label: currentOp.value.symbol, value: bits.value.value, text: bits.value.bitsValue }
  ].filter((row) => row.text !== '')
})
</script>

<template>
  <ToolShell tool-id="number-base">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4 sm:flex-row sm:items-end">
        <label class="flex min-w-0 flex-1 flex-col gap-1.5">
          <span class="text-sm text-muted">数值（按 {{ fromBase }} 进制读入）</span>
          <UInput
            v-model="input"
            size="lg"
            spellcheck="false"
            autocomplete="off"
            placeholder="例如 FF、11111111、377"
            :ui="{ base: 'font-mono text-base' }"
            :aria-invalid="result.ok ? 'false' : 'true'"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">源进制</span>
          <USelect v-model="preset" :items="baseOptions" size="lg" class="w-40" aria-label="源进制" />
        </label>

        <label v-if="preset === CUSTOM" class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">{{ MIN_BASE }}–{{ MAX_BASE }}</span>
          <input
            v-model.number="customBase"
            type="number"
            :min="MIN_BASE"
            :max="MAX_BASE"
            class="h-11 w-24 rounded-lg border border-default px-3 font-mono text-sm text-default outline-none focus:border-primary/50"
            aria-label="自定义源进制"
          />
        </label>
      </div>

      <p v-if="!result.ok" class="text-sm text-error">{{ result.error }}</p>

      <template v-else>
        <section class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-medium text-highlighted">各进制表示</h2>
            <label class="inline-flex items-center gap-1.5 text-sm text-muted">
              <USwitch v-model="showGrouped" size="sm" aria-label="按 4 位分组显示" />
              4 位分组
            </label>
          </div>
          <ul class="flex flex-col overflow-hidden rounded-xl border border-default">
            <li
              v-for="row in rows"
              :key="row.base"
              class="flex items-center gap-3 border-b border-default px-3 py-2 last:border-b-0"
            >
              <span class="w-24 shrink-0 text-xs text-dimmed">{{ row.label }}</span>
              <code
                class="min-w-0 flex-1 break-all font-mono text-sm text-default"
                :class="row.base === 10 ? 'font-bold text-highlighted' : ''"
              >
                {{ showGrouped && row.base !== 10 ? groupByFour(row.value) : row.value }}
              </code>
              <CopyButton :text="row.value" label="" size="xs" />
            </li>
          </ul>
        </section>

        <div class="flex flex-wrap items-center gap-2" aria-label="位宽信息">
          <UBadge :label="`位宽 ${result.bitLength} bit`" color="neutral" variant="subtle" />
          <UBadge :label="`字节 ${result.byteLength} B`" color="neutral" variant="subtle" />
          <UBadge :label="`十进制 ${result.decimalDigitCount} 位`" color="neutral" variant="subtle" />
        </div>

        <div class="flex items-center gap-3 rounded-xl border border-dashed border-default px-3 py-2">
          <span class="w-28 shrink-0 text-xs text-dimmed">Base32（RFC 4648）</span>
          <code class="min-w-0 flex-1 break-all font-mono text-sm text-default">{{ mainBase32 }}</code>
          <CopyButton :text="mainBase32" label="" size="xs" />
        </div>

        <section v-if="breakdown" class="flex flex-col gap-2 rounded-xl border border-default p-4">
          <h2 class="text-sm font-medium text-highlighted">按权展开</h2>
          <p class="break-all font-mono text-sm leading-relaxed text-muted">{{ breakdown }} = {{ input.trim() }}</p>
          <p v-if="binaryGrouped" class="break-all font-mono text-xs text-dimmed">
            BIN {{ binaryGrouped }}
          </p>
        </section>
      </template>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">Base32 反读</h2>
        <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4 sm:flex-row sm:items-end">
          <label class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="text-sm text-muted">粘贴 Base32（可带 <code>=</code> 填充）</span>
            <UInput
              v-model="b32Text"
              size="lg"
              spellcheck="false"
              autocomplete="off"
              placeholder="例如 NBUQ======"
              :ui="{ base: 'font-mono text-base' }"
              :aria-invalid="b32.ok ? 'false' : 'true'"
            />
          </label>
        </div>
        <p v-if="!b32.ok" class="text-sm text-error">{{ b32.error }}</p>
        <ul v-else class="flex flex-col overflow-hidden rounded-xl border border-default">
          <li
            v-for="row in b32Rows"
            :key="row.label"
            class="flex items-center gap-3 border-b border-default px-3 py-2 last:border-b-0"
          >
            <span class="w-28 shrink-0 text-xs text-dimmed">{{ row.label }}</span>
            <code class="min-w-0 flex-1 break-all font-mono text-sm text-default">{{ row.value }}</code>
            <CopyButton :text="row.value" label="" size="xs" />
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">按位运算</h2>
          <span class="text-xs text-dimmed">操作数按上方的 {{ fromBase }} 进制读入</span>
          <USelect
            v-model="bitWidth"
            :items="widthOptions"
            size="xs"
            color="neutral"
            variant="outline"
            class="w-24"
            aria-label="位宽"
          />
        </div>

        <div class="grid gap-3 rounded-xl border border-default bg-elevated p-4 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_1fr] lg:items-end">
          <label class="flex min-w-0 flex-col gap-1.5">
            <span class="text-sm text-muted">A</span>
            <UInput
              v-model="operandA"
              size="lg"
              spellcheck="false"
              autocomplete="off"
              placeholder="例如 240"
              :ui="{ base: 'font-mono text-base' }"
              :aria-invalid="parsedA.ok ? 'false' : 'true'"
            />
          </label>

          <label class="flex min-w-0 flex-col gap-1.5">
            <span class="text-sm text-muted">运算</span>
            <USelect v-model="bitOp" :items="opOptions" size="lg" aria-label="运算符" />
          </label>

          <label v-if="currentOp.arity === 2" class="flex min-w-0 flex-col gap-1.5 lg:col-start-3">
            <span class="text-sm text-muted">{{ currentOp.shift ? 'B（位移量）' : 'B' }}</span>
            <UInput
              v-model="operandB"
              size="lg"
              spellcheck="false"
              autocomplete="off"
              :placeholder="currentOp.shift ? '例如 3' : '例如 15'"
              :ui="{ base: 'font-mono text-base' }"
              :aria-invalid="parsedB.ok ? 'false' : 'true'"
            />
          </label>
        </div>

        <p v-if="bitError" class="text-sm text-error">{{ bitError }}</p>

        <template v-else-if="bits.ok">
          <ul class="flex flex-col overflow-hidden rounded-xl border border-default">
            <li
              v-for="row in bitRows"
              :key="row.label"
              class="flex flex-col gap-1 border-b border-default px-3 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
            >
              <span class="w-28 shrink-0 font-mono text-xs text-dimmed">{{ row.label }}</span>
              <code class="min-w-0 flex-1 break-all font-mono text-sm text-default">{{
                groupByFour(row.text)
              }}</code>
              <span class="shrink-0 font-mono text-xs text-muted">
                无符号 {{ row.value.toString() }} · HEX {{ toBase(row.value, 16) }}
              </span>
            </li>
          </ul>

          <div class="flex flex-wrap items-center gap-2" aria-label="结果">
            <UBadge :label="`结果（无符号）${bits.value.toString()}`" color="neutral" variant="subtle" />
            <UBadge :label="`结果（补码有符号）${bits.signed.toString()}`" color="neutral" variant="subtle" />
            <UBadge :label="`HEX ${toBase(bits.value, 16)}`" color="neutral" variant="subtle" />
            <UBadge
              v-if="bits.overflow"
              label="左移有溢出：高位被截掉"
              color="warning"
              variant="subtle"
            />
          </div>
          <p class="text-xs leading-relaxed text-dimmed">
            取反与移位都在选定的 {{ bitWidth }} 位宽度内做：操作数先按
            <code class="rounded bg-elevated px-1 py-0.5">2<sup>{{ bitWidth }}</sup></code>
            取补码截断，负数因此等同于它在本位宽下的无符号表示（例如 −1 在 8 位下就是 255）。
            右移是<strong class="font-medium text-default">逻辑</strong>右移（高位补 0），不做符号扩展 ——
            需要算术右移时用「结果的有符号值 ÷ 2ⁿ 向下取整」自行核对。
          </p>
        </template>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        内部用 <code class="rounded bg-elevated px-1 py-0.5">BigInt</code> 逐位累加，位数不受
        <code class="rounded bg-elevated px-1 py-0.5">Number.MAX_SAFE_INTEGER</code>（2⁵³−1）限制，
        超过 53 位的十进制数也不会丢精度。<code class="rounded bg-elevated px-1 py-0.5">0x / 0b / 0o</code>
        前缀与空格、下划线分隔会被忽略。{{ fromBase }} 进制使用的数字集：
        <code class="rounded bg-elevated px-1 py-0.5">{{ digits }}</code>。
        <strong class="font-medium text-warning">注意两套 Base32</strong>：本页的「Base32」用 RFC 4648 的
        <code class="rounded bg-elevated px-1 py-0.5">{{ BASE32_ALPHABET }}</code>（A=0 起、只用 2–7 六个数字），
        而「32 进制」那一行走的是 JS <code class="rounded bg-elevated px-1 py-0.5">toString(32)</code> 的
        <code class="rounded bg-elevated px-1 py-0.5">0–9A–V</code>，同一个数写出来并不相同。
        要编码字节串（文件名、密钥）请用 Base64 页那种「按 8 字符一组 + <code>=</code> 填充」的口径，本页只处理整数的数字表示。
      </p>
    </div>
  </ToolShell>
</template>
