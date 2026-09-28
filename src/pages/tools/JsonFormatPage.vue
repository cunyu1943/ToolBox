<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { formatJson, tryParseLoose, type JsonIndent } from '~/tools/json-format'

const indentItems = [
  { label: '2 空格', value: 2 as JsonIndent },
  { label: '4 空格', value: 4 as JsonIndent },
  { label: 'Tab', value: '\t' as JsonIndent },
  { label: '压缩（无缩进）', value: 0 as JsonIndent }
]

const source = ref('{"name":"ToolBox","tools":["json","url"],"nested":{"ok":true,"n":[1,2,3]}}')
const indent = ref<JsonIndent>(2)
const sortKeys = ref(false)
const output = ref('')
const errorText = ref('')
const errorAt = ref('')
const stats = ref<{ keys: number; values: number; depth: number; chars: number } | null>(null)

const hasOutput = computed(() => output.value.length > 0)

function clearError() {
  errorText.value = ''
  errorAt.value = ''
}

function apply(text: string) {
  output.value = text
  stats.value = null
}

function resetAll() {
  source.value = ''
  apply('')
  clearError()
}

function run() {
  clearError()
  stats.value = null
  if (!source.value.trim()) {
    apply('')
    errorText.value = '请输入 JSON 文本。'
    return
  }
  const result = formatJson(source.value, { indent: indent.value, sortKeys: sortKeys.value })
  if (result.ok) {
    apply(result.text)
    stats.value = result.summary
    return
  }
  apply('')
  errorText.value = result.error.message
  errorAt.value =
    result.error.line && result.error.column ? `第 ${result.error.line} 行第 ${result.error.column} 列附近` : ''
}

/** 先试标准解析；失败则剥掉行注释、块注释与尾随逗号再试一次。 */
function runTolerant() {
  const parsed = tryParseLoose(source.value)
  if (!parsed.ok) {
    run()
    return
  }
  clearError()
  const pad = indent.value === '\t' ? '\t' : indent.value || undefined
  apply(JSON.stringify(parsed.value, null, pad) ?? 'null')
  stats.value = null
}

function loadExample() {
  source.value = '{\n  // 带注释与尾随逗号的“类 JSON”\n  "id": 7,\n  "tags": ["a", "b",],\n}'
  runTolerant()
}
</script>

<template>
  <ToolShell tool-id="json-format">
    <div class="flex flex-wrap items-center gap-2">
      <USelect v-model="indent" :items="indentItems" size="lg" class="w-40" aria-label="缩进方式" />
      <div class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
        <USwitch v-model="sortKeys" size="sm" aria-label="按键名排序" />
        <span class="text-sm text-muted">按键名排序</span>
      </div>
      <UButton icon="lucide:sparkles" label="格式化" color="primary" variant="solid" size="lg" @click="run" />
      <UButton
        icon="lucide:file-text"
        label="宽松解析（去注释/尾逗号）"
        color="neutral"
        variant="outline"
        size="lg"
        @click="runTolerant"
      />
      <UButton
        icon="lucide:info"
        label="填入含注释的例子"
        color="neutral"
        variant="ghost"
        size="lg"
        class="ms-auto"
        @click="loadExample"
      />
    </div>

    <UAlert
      v-if="errorText"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      :title="errorAt ? `解析失败 · ${errorAt}` : '解析失败'"
      :description="errorText"
    />

    <div
      v-if="stats"
      class="flex flex-wrap items-center gap-2 text-xs text-muted"
      aria-label="统计信息"
    >
      <UBadge :label="`键 ${stats.keys}`" color="neutral" variant="subtle" />
      <UBadge :label="`标量值 ${stats.values}`" color="neutral" variant="subtle" />
      <UBadge :label="`深度 ${stats.depth}`" color="neutral" variant="subtle" />
      <UBadge :label="`输出 ${stats.chars} 字符`" color="neutral" variant="subtle" />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="flex min-w-0 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">输入</h2>
          <UButton
            icon="lucide:eraser"
            label="清空"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="resetAll"
          />
        </div>
        <UTextarea
          v-model="source"
          :rows="16"
          placeholder="把 JSON 粘贴到这里…"
          class="w-full"
          :ui="{ base: 'font-mono text-xs leading-relaxed' }"
        />
      </section>

      <section class="flex min-w-0 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">输出</h2>
          <CopyButton :text="output" :disabled="!hasOutput" />
        </div>
        <textarea
          :value="output"
          readonly
          rows="16"
          spellcheck="false"
          class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          :placeholder="errorText ? '解析失败，输出为空' : '格式化结果会出现在这里'"
        />
      </section>
    </div>

    <p class="text-xs text-dimmed">
      解析与序列化都发生在本地（<code class="rounded bg-elevated px-1 py-0.5">JSON.parse</code> /
      <code class="rounded bg-elevated px-1 py-0.5">JSON.stringify</code>），内容不会离开浏览器。注意
      <code class="rounded bg-elevated px-1 py-0.5">JSON.parse</code>
      对重复键取最后一个、不支持注释与尾随逗号，需要宽松解析时点上面第二个按钮。
    </p>
  </ToolShell>
</template>
