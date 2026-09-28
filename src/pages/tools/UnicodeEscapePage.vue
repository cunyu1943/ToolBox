<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  escapeUnicode, unescapeUnicode, UNICODE_SAMPLES,
  type EscapeForm
} from '~/tools/unicode-escape'
import { useStored } from '~/composables/useStored'

type Direction = 'escape' | 'unescape'

const directionItems: { label: string; value: Direction }[] = [
  { label: '原文 → 转义', value: 'escape' },
  { label: '转义 → 原文', value: 'unescape' }
]
const formItems: { label: string; value: EscapeForm }[] = [
  { label: '\\uXXXX（UTF-16 码元）', value: 'utf16' },
  { label: '\\u{…}（码点，ES2015）', value: 'codepoint' }
]

const source = useStored('tool.unicode-escape.source', UNICODE_SAMPLES[2]!.text)
const direction = useStored<Direction>('tool.unicode-escape.direction', 'escape')
const form = useStored<EscapeForm>('tool.unicode-escape.form', 'utf16')
const nonAsciiOnly = useStored('tool.unicode-escape.nonAsciiOnly', true)
const uppercaseHex = useStored('tool.unicode-escape.uppercaseHex', false)

const escaping = computed(() => direction.value === 'escape')

const escaped = computed(() =>
  escapeUnicode(source.value, { form: form.value, nonAsciiOnly: nonAsciiOnly.value, uppercaseHex: uppercaseHex.value })
)
const unescaped = computed(() => unescapeUnicode(source.value))

const output = computed(() => (escaping.value ? escaped.value.value : unescaped.value.value))
const notes = computed(() => (escaping.value ? escaped.value.notes : unescaped.value.notes))
const invalid = computed(() => (escaping.value ? [] : unescaped.value.invalid))
const ok = computed(() => Boolean(output.value) || !source.value)

function fillSample(sample: (typeof UNICODE_SAMPLES)[number]) {
  source.value = escaping.value ? sample.text : sample.escaped
}
</script>

<template>
  <ToolShell tool-id="unicode-escape">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">方向</span>
          <USelect v-model="direction" :items="directionItems" item-key="value" class="w-44" />
        </label>
        <label v-if="escaping" class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">转义形式</span>
          <USelect v-model="form" :items="formItems" item-key="value" class="w-60" />
        </label>
        <label v-if="escaping" class="flex items-center gap-2 pb-2">
          <USwitch v-model="nonAsciiOnly" size="sm" aria-label="只转义非 ASCII 字符" />
          <span class="text-sm">只转非 ASCII</span>
        </label>
        <label v-if="escaping" class="flex items-center gap-2 pb-2">
          <USwitch v-model="uppercaseHex" size="sm" aria-label="十六进制大写" />
          <span class="text-sm">大写十六进制</span>
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="sample in UNICODE_SAMPLES"
          :key="sample.label"
          :label="sample.label"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="fillSample(sample)"
        />
        <UButton icon="lucide:eraser" label="清空" color="neutral" variant="ghost" size="sm" @click="source = ''" />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">{{ escaping ? '原文' : '含转义序列的文本' }}</span>
          <UTextarea
            v-model="source"
            :rows="8"
            spellcheck="false"
            :placeholder="escaping ? '输入要转义的文本' : '\\u5de5\\u5177\\u7bb1'"
            aria-label="Unicode 输入"
            :class="escaping ? '' : 'font-mono'"
          />
        </label>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted">结果</span>
            <CopyButton :text="output" :disabled="!output" label="复制结果" />
          </div>
          <UTextarea
            :model-value="output"
            :rows="8"
            readonly
            spellcheck="false"
            aria-label="Unicode 输出"
            class="font-mono"
            :ui="{ base: 'bg-elevated' }"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge :label="`输入 ${source.length} 字符`" color="neutral" variant="subtle" />
        <UBadge :label="`输出 ${output.length} 字符`" color="neutral" variant="subtle" />
        <UBadge v-if="escaping && escaped.escaped" :label="`被转义 ${escaped.escaped} / ${escaped.total} 码点`" color="primary" variant="subtle" />
        <UBadge v-if="!escaping" :label="`已还原 ${unescaped.decoded} 条转义`" :color="unescaped.decoded ? 'primary' : 'neutral'" variant="subtle" />
        <UBadge v-if="invalid.length" :label="`无法识别 ${invalid.length} 处`" color="warning" variant="subtle" />
      </div>

      <p v-if="!ok" class="text-sm text-error">输出为空，请检查输入里的转义写法。</p>

      <ul v-if="invalid.length" class="flex flex-col gap-1 rounded-xl border border-warning/40 bg-warning/5 p-3">
        <li v-for="item in invalid" :key="item" class="text-xs text-warning">
          <code class="font-mono">{{ item }}</code> —— 位数不足或含非十六进制字符，已原样保留
        </li>
      </ul>

      <ul v-if="notes.length" class="flex list-disc flex-col gap-1 pl-5">
        <li v-for="note in notes" :key="note" class="text-xs leading-relaxed text-muted">{{ note }}</li>
      </ul>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">两种写法差在代理对</h2>
        <p class="text-xs leading-relaxed text-muted">
          <code class="rounded bg-elevated px-1 py-0.5">\uXXXX</code>
          只能表示 4 位十六进制（最多 U+FFFF），所以 emoji 与生僻字要拆成一对代理项，例如
          <code class="rounded bg-elevated px-1 py-0.5">𠮷</code> →
          <code class="rounded bg-elevated px-1 py-0.5">\ud842\udfb7</code>。
          <code class="rounded bg-elevated px-1 py-0.5">\u{20bb7}</code>
          是 ES2015 的码点写法，读起来直接对上 Unicode 码位，但 JSON 规范里不存在这种转义，Java/C 的解析器也不认。
        </p>
        <p class="text-xs leading-relaxed text-dimmed">
          反斜杠本身一定会被转义成 <code class="rounded bg-elevated px-1 py-0.5">\\</code>：否则它紧跟一条
          <code class="rounded bg-elevated px-1 py-0.5">\uXXXX</code> 时，解码方会把它读成「转义符自身」而吃掉后面那条序列。
        </p>
      </section>
    </div>
  </ToolShell>
</template>
