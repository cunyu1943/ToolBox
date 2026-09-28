<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  formatDuration, MORSE_CHARS, MORSE_SAMPLES, MORSE_TABLE,
  morseDecode, morseEncode, transmitSeconds,
  type MorseResult
} from '~/tools/morse'
import { useStored } from '~/composables/useStored'

type Direction = 'encode' | 'decode'

const directionItems: { label: string; value: Direction }[] = [
  { label: '文本 → 电码', value: 'encode' },
  { label: '电码 → 文本', value: 'decode' }
]
const wpmItems = [5, 10, 20, 30].map((value) => ({ label: `${value} WPM`, value }))

const source = useStored('tool.morse.source', MORSE_SAMPLES[1]!.value)
const direction = useStored<Direction>('tool.morse.direction', 'encode')
const wpm = useStored('tool.morse.wpm', 20)

const decode = computed(() => direction.value === 'decode')
const result = computed<MorseResult>(() => (decode.value ? morseDecode(source.value) : morseEncode(source.value)))
const seconds = computed(() => transmitSeconds(result.value.stats.units, wpm.value))

const groups = computed(() => {
  const letters = MORSE_CHARS.filter((ch) => /[A-Z]/.test(ch))
  const digits = MORSE_CHARS.filter((ch) => /[0-9]/.test(ch))
  const punctuation = MORSE_CHARS.filter((ch) => !/[A-Z0-9]/.test(ch))
  return [
    { label: '字母', items: letters },
    { label: '数字', items: digits },
    { label: '标点', items: punctuation }
  ]
})

const showTable = ref(false)

const report = computed(
  () =>
    `${result.value.value}\n\n${result.value.stats.chars} 个字符 · ${result.value.stats.words} 个词 · ${result.value.stats.units} 个时间单位 · ${wpm.value} WPM 下约 ${formatDuration(seconds.value)}`
)

function swap() {
  const previous = result.value.value
  direction.value = decode.value ? 'encode' : 'decode'
  if (previous) source.value = previous
}
</script>

<template>
  <ToolShell tool-id="morse">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">方向</span>
          <USelect v-model="direction" :items="directionItems" item-key="value" class="w-40" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">发报速度（决定时长估算）</span>
          <USelect v-model="wpm" :items="wpmItems" item-key="value" class="w-32" />
        </label>
        <UButton
          icon="lucide:arrow-left-right"
          label="反向并带入结果"
          color="neutral"
          variant="outline"
          @click="swap"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="sample in MORSE_SAMPLES"
          :key="sample.label"
          :label="sample.label"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="source = sample.value"
        />
        <UButton icon="lucide:eraser" label="清空" color="neutral" variant="ghost" size="sm" @click="source = ''" />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">{{ decode ? '电码（点用 · 或 .，划用 − 或 -，词间用 /）' : '文本（仅字母、数字与常用标点可编码）' }}</span>
          <UTextarea
            v-model="source"
            :rows="8"
            spellcheck="false"
            :placeholder="decode ? '... --- ...' : 'CQ CQ DE BG1ABC'"
            aria-label="摩尔斯输入"
            :class="decode ? 'font-mono' : ''"
          />
        </label>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted">结果</span>
            <CopyButton :text="report" :disabled="!result.ok" label="复制结果" />
          </div>
          <UTextarea
            :model-value="result.value"
            :rows="8"
            readonly
            spellcheck="false"
            aria-label="摩尔斯输出"
            class="font-mono"
            :ui="{ base: 'bg-elevated' }"
          />
        </div>
      </div>

      <p v-if="!result.ok && source" class="text-sm text-error">
        {{ decode ? '没有可识别的电码。' : '没有可编码的字符——摩尔斯表只收拉丁字母、数字与常用标点，中文不在其中。' }}
      </p>

      <div v-if="result.ok" class="flex flex-wrap items-center gap-2">
        <UBadge :label="`${result.stats.chars} 个字符`" color="neutral" variant="subtle" />
        <UBadge :label="`${result.stats.words} 个词`" color="neutral" variant="subtle" />
        <UBadge :label="`${result.stats.dits} 点 / ${result.stats.dahs} 划`" color="neutral" variant="subtle" />
        <UBadge :label="`${result.stats.units} 个时间单位`" color="neutral" variant="subtle" />
        <UBadge :label="`约 ${formatDuration(seconds)}`" color="primary" variant="subtle" />
      </div>

      <ul v-if="result.unknown.length" class="flex flex-col gap-1 text-sm">
        <li v-for="item in result.unknown" :key="item" class="text-warning">
          未收录：<code class="rounded bg-elevated px-1 py-0.5">{{ item }}</code>
        </li>
      </ul>
      <p v-if="result.notes.length" class="text-xs leading-relaxed text-warning">
        {{ result.notes.join('；') }}
      </p>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">电码对照表</h2>
          <UButton
            :icon="showTable ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            :label="showTable ? '收起' : '展开'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="showTable = !showTable"
          />
        </div>
        <div v-if="showTable" class="flex flex-col gap-4">
          <div v-for="group in groups" :key="group.label" class="flex flex-col gap-2">
            <h3 class="text-xs text-muted">{{ group.label }}</h3>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-5">
              <button
                v-for="ch in group.items"
                :key="ch"
                type="button"
                class="flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-elevated"
                @click="source = decode ? (MORSE_TABLE[ch] ?? '') : ch"
              >
                <code class="font-mono text-default">{{ ch }}</code>
                <code class="font-mono text-xs text-muted">{{ MORSE_TABLE[ch] }}</code>
              </button>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-dimmed">展开后可点任意条目，把它单独送进输入框。</p>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">时长是怎么算出来的</h2>
        <p class="text-xs leading-relaxed text-muted">
          以「点」为一个时间单位：划 = 3 单位，字符内码元之间隔 1 单位，字符之间隔 3 单位，词之间隔 7 单位；
          并按 PARIS 标准给每个词末尾再留一个 7 单位的间隔，所以 <code class="rounded bg-elevated px-1">PARIS</code> 恰好是 50 单位。
          速度用 WPM 表示，1 单位 = <code class="rounded bg-elevated px-1">1200 / WPM</code> 毫秒，20 WPM 即 60 ms，于是 PARIS 用 3 秒发完。
        </p>
        <p class="text-xs leading-relaxed text-dimmed">
          摩尔斯电码不加密、不容错纠错，实际通联靠重复播发；<code class="rounded bg-elevated px-1">SOS</code>（<code class="rounded bg-elevated px-1">... --- ...</code>）之所以成为遇险信号，正因为它的形状在任何抄收质量下都不易混。
        </p>
      </section>
    </div>
  </ToolShell>
</template>
