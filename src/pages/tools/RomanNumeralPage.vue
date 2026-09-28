<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { breakdownRoman, fromRoman, ROMAN_SAMPLES, ROMAN_SYMBOLS, toRoman } from '~/tools/roman-numeral'
import { useStored } from '~/composables/useStored'

const input = useStored('tool.roman-numeral.input', '2026')

const isArabic = computed(() => /^[+-]?\d+$/.test(input.value.trim()))

const view = computed(() => {
  if (!input.value.trim()) {
    return { ok: false, roman: '', arabic: '', parts: [], error: '输入阿拉伯数字（转罗马）或罗马数字（转阿拉伯）', notes: [] }
  }
  if (isArabic.value) {
    const result = toRoman(input.value)
    return {
      ok: result.ok && Boolean(result.roman),
      roman: result.roman ?? '',
      arabic: input.value.trim(),
      parts: result.parts,
      error: result.error,
      notes: result.notes
    }
  }
  const result = fromRoman(input.value)
  return {
    ok: result.ok && result.value !== undefined,
    roman: input.value.trim().toUpperCase(),
    arabic: result.value === undefined ? '' : String(result.value),
    parts: result.parts,
    error: result.error,
    notes: result.notes
  }
})

/** 结果侧的展开：正向用回编结果，反向按字符贪心展开 */
const parts = computed(() => (view.value.ok && view.value.roman ? breakdownRoman(view.value.roman) : view.value.parts))
const total = computed(() => parts.value.reduce((sum, part) => sum + part.value, 0))

const report = computed(() =>
  view.value.ok ? `${view.value.arabic} = ${view.value.roman}` : `${input.value}：${view.value.error ?? ''}`
)
</script>

<template>
  <ToolShell tool-id="roman-numeral">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <span class="text-xs text-muted">输入（数字或罗马字母 I V X L C D M，双向自动识别）</span>
        <UInput
          v-model="input"
          placeholder="2026 或 MMXXVI"
          size="xl"
          class="w-full font-mono"
          aria-label="罗马数字输入"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="sample in ROMAN_SAMPLES"
          :key="sample.label"
          :label="sample.label"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="input = sample.value"
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1 rounded-xl border border-default bg-elevated p-4">
          <span class="text-xs text-dimmed">阿拉伯数字</span>
          <span class="text-2xl font-semibold tabular-nums text-highlighted">{{ view.ok ? view.arabic : '—' }}</span>
        </div>
        <div class="flex flex-col gap-1 rounded-xl border border-default bg-elevated p-4">
          <span class="text-xs text-dimmed">罗马数字</span>
          <span class="break-all text-2xl font-semibold tracking-widest text-highlighted">{{ view.ok ? view.roman : '—' }}</span>
        </div>
      </div>

      <p v-if="!view.ok" class="text-sm text-error">{{ view.error }}</p>
      <p v-else-if="view.notes.length" class="text-xs leading-relaxed text-warning">{{ view.notes.join('；') }}</p>

      <section v-if="view.ok" class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">按符号展开</h2>
          <CopyButton :text="report" label="复制等式" />
        </div>
        <ul class="flex flex-col gap-1">
          <li
            v-for="(part, index) in parts"
            :key="`${part.symbol}-${index}`"
            class="flex items-center justify-between gap-3 border-b border-default py-1 text-sm last:border-b-0"
          >
            <code class="font-mono text-lg tracking-wider text-default">{{ part.symbol }}</code>
            <code class="tabular-nums text-muted">{{ part.value }}</code>
          </li>
        </ul>
        <p class="text-sm">
          合计 <code class="font-mono text-lg font-semibold text-highlighted">{{ total }}</code>
          <span v-if="total !== Math.abs(Number(view.arabic))" class="text-warning">（与上面的数值不一致，说明输入非规范）</span>
        </p>
      </section>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">符号表（7 个基本符号 + 6 个减记形式）</h2>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="symbol in ROMAN_SYMBOLS"
            :key="symbol.symbol"
            :label="`${symbol.symbol} = ${symbol.value}`"
            :color="symbol.symbol.length > 1 ? 'primary' : 'neutral'"
            variant="subtle"
          />
        </div>
        <p class="text-xs leading-relaxed text-muted">
          彩色的是 CM、CD、XC、XL、IX、IV 这 6 个减记形式——小数放在大数前面表示「减去」，这是罗马数字唯一合法的减法。
        </p>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">读法与写法约定</h2>
        <ul class="flex list-disc flex-col gap-1 pl-5 text-xs leading-relaxed text-muted">
          <li>同一符号最多连写 3 次，所以 4 写作 IV 而不是 IIII（钟表盘面上的 IIII 是装饰性例外）。</li>
          <li>V、L、D 各代表 5、50、500，翻倍就是 X、C、M，因此它们最多出现一次。</li>
          <li>减法只允许 I 在 V/X 前、X 在 L/C 前、C 在 D/M 前；IL、IC、XD 都不合法（49 要写 XLIX）。</li>
          <li>没有 0，也没有负号；这套体系里没有位值，大数只能靠重复符号。</li>
          <li>上限 3999 = MMMCMXCIX。再往上传统写法是在符号上加悬线（overline）表示 ×1000，本工具不生成。</li>
        </ul>
      </section>
    </div>
  </ToolShell>
</template>
