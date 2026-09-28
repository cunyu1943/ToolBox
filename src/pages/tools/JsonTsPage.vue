<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { generateTypes, TS_SAMPLES } from '~/tools/json-ts'
import { useStored } from '~/composables/useStored'

const indents = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 }
]

const source = useStored('tool.json-ts.source', TS_SAMPLES[0]?.value ?? '')
const rootName = useStored('tool.json-ts.root-name', 'Root')
const indent = useStored('tool.json-ts.indent', 2)
const semicolon = useStored('tool.json-ts.semicolon', true)
const readonly = useStored('tool.json-ts.readonly', false)
const exportAll = useStored('tool.json-ts.export-all', true)
const markOptional = useStored('tool.json-ts.mark-optional', true)
const stringLiterals = useStored('tool.json-ts.string-literals', true)
const tuples = useStored('tool.json-ts.tuples', false)
const sortKeys = useStored('tool.json-ts.sort-keys', false)

const result = computed(() =>
  generateTypes(source.value, {
    rootName: rootName.value || 'Root',
    indent: indent.value,
    semicolon: semicolon.value,
    readonly: readonly.value,
    exportAll: exportAll.value,
    markOptional: markOptional.value,
    stringLiterals: stringLiterals.value,
    tuples: tuples.value,
    sortKeys: sortKeys.value
  })
)
</script>

<template>
  <ToolShell tool-id="json-ts">
    <div class="flex flex-wrap items-center gap-2">
      <UFormField label="根类型名" class="w-40">
        <UInput v-model="rootName" size="lg" placeholder="Root" :ui="{ base: 'font-mono text-sm' }" />
      </UFormField>
      <USelect v-model="indent" :items="indents" size="lg" class="w-32" aria-label="缩进" />
    </div>

    <div class="flex flex-wrap gap-2">
      <label class="inline-flex h-9 items-center gap-2 rounded-lg border border-default bg-elevated px-2.5">
        <USwitch v-model="semicolon" size="sm" aria-label="行尾分号" />
        <span class="text-xs text-muted">行尾分号</span>
      </label>
      <label class="inline-flex h-9 items-center gap-2 rounded-lg border border-default bg-elevated px-2.5">
        <USwitch v-model="readonly" size="sm" aria-label="readonly" />
        <span class="text-xs text-muted">readonly</span>
      </label>
      <label class="inline-flex h-9 items-center gap-2 rounded-lg border border-default bg-elevated px-2.5">
        <USwitch v-model="exportAll" size="sm" aria-label="export" />
        <span class="text-xs text-muted">export</span>
      </label>
      <label class="inline-flex h-9 items-center gap-2 rounded-lg border border-default bg-elevated px-2.5">
        <USwitch v-model="markOptional" size="sm" aria-label="缺键标可选" />
        <span class="text-xs text-muted">缺键标可选</span>
      </label>
      <label class="inline-flex h-9 items-center gap-2 rounded-lg border border-default bg-elevated px-2.5">
        <USwitch v-model="stringLiterals" size="sm" aria-label="少量取值合成字面量" />
        <span class="text-xs text-muted">少量取值合成字面量</span>
      </label>
      <label class="inline-flex h-9 items-center gap-2 rounded-lg border border-default bg-elevated px-2.5">
        <USwitch v-model="tuples" size="sm" aria-label="定长混合数组用元组" />
        <span class="text-xs text-muted">定长混合数组用元组</span>
      </label>
      <label class="inline-flex h-9 items-center gap-2 rounded-lg border border-default bg-elevated px-2.5">
        <USwitch v-model="sortKeys" size="sm" aria-label="键排序" />
        <span class="text-xs text-muted">键排序</span>
      </label>
    </div>

    <UAlert
      v-if="!result.ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="解析失败"
      :description="result.error"
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="flex min-w-0 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">JSON 样本</h2>
          <UButton
            icon="lucide:eraser"
            label="清空"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="source = ''"
          />
        </div>
        <UTextarea
          v-model="source"
          :rows="18"
          placeholder="粘贴一个 JSON 对象、JSON 数组，或者一行一条的 NDJSON…"
          class="w-full"
          :ui="{ base: 'font-mono text-xs leading-relaxed' }"
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in TS_SAMPLES"
            :key="sample.label"
            :label="sample.label"
            size="xs"
            color="neutral"
            variant="subtle"
            @click="source = sample.value"
          />
        </div>
      </section>

      <section class="flex min-w-0 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">TypeScript</h2>
          <CopyButton :text="result.value" :disabled="!result.ok" />
        </div>
        <textarea
          :value="result.value"
          readonly
          rows="18"
          spellcheck="false"
          class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          :placeholder="result.ok ? '' : '解析失败时输出为空'"
        />
      </section>
    </div>

    <div v-if="result.ok && result.names.length" class="flex flex-wrap items-center gap-2 text-xs">
      <span class="text-muted">生成的名字：</span>
      <UBadge v-for="name in result.names" :key="name" :label="name" color="neutral" variant="subtle" class="font-mono" />
    </div>

    <ul v-if="result.notes.length" class="flex flex-col gap-1 text-xs text-muted">
      <li v-for="note in result.notes" :key="note">· {{ note }}</li>
    </ul>

    <p class="text-xs text-dimmed">
      类型是从样本<em>推断</em>出来的：只在样本里出现过的键会被当成必填，取值很少的字符串会被合成字面量联合——真实数据更全时记得关掉这些选项再重生成。
      可选与 <code class="rounded bg-elevated px-1 py-0.5">null</code> 是两回事：缺键才标 <code class="rounded bg-elevated px-1 py-0.5">?</code>，
      出现 <code class="rounded bg-elevated px-1 py-0.5">null</code> 会并进联合类型。整个推导在本地完成，JSON 不会离开浏览器。
    </p>
  </ToolShell>
</template>
