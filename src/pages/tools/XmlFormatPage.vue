<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  formatXml,
  minifyXml,
  XML_SAMPLES,
  xmlToJson,
  type XmlError,
  type XmlResult
} from '~/tools/xml-format'
import { useStored } from '~/composables/useStored'

const modes = [
  { label: '格式化（美化缩进）', value: 'format' as const },
  { label: '压缩成一行', value: 'minify' as const },
  { label: '转 JSON', value: 'json' as const }
]
type Mode = (typeof modes)[number]['value']

const indents = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 },
  { label: 'Tab', value: 0 }
]

const mode = useStored<Mode>('tool.xml-format.mode', 'format')
const source = useStored('tool.xml-format.source', XML_SAMPLES[0]?.value ?? '')
const indent = useStored('tool.xml-format.indent', 2)
const keepComments = useStored('tool.xml-format.keep-comments', true)
const collapseText = useStored('tool.xml-format.collapse-text', true)
const sortAttributes = useStored('tool.xml-format.sort-attributes', false)
const attrsKey = useStored('tool.xml-format.attrs-key', '_attributes')
const textKey = useStored('tool.xml-format.text-key', '_text')
const mergeSameName = useStored('tool.xml-format.collapse', true)
const numbers = useStored('tool.xml-format.numbers', false)

const result = computed<XmlResult>(() => {
  if (!source.value.trim()) {
    return { ok: false, value: '', errors: [{ line: 1, column: 1, message: '请输入 XML。' }], notes: [] }
  }
  if (mode.value === 'format') {
    return formatXml(source.value, {
      indent: indent.value,
      keepComments: keepComments.value,
      collapseText: collapseText.value,
      sortAttributes: sortAttributes.value
    })
  }
  if (mode.value === 'minify') return minifyXml(source.value, { keepComments: keepComments.value })
  return xmlToJson(
    source.value,
    {
      attrsKey: attrsKey.value || '_attributes',
      textKey: textKey.value || '_text',
      collapse: mergeSameName.value,
      numbers: numbers.value
    },
    indent.value === 0 ? '\t' : indent.value
  )
})

const errors = computed<XmlError[]>(() => result.value.errors)
const stats = computed(() => result.value.stats)
</script>

<template>
  <ToolShell tool-id="xml-format">
    <div class="flex flex-wrap items-center gap-2">
      <USelect v-model="mode" :items="modes" size="lg" class="w-48" aria-label="处理方式" />
      <USelect
        v-if="mode !== 'minify'"
        v-model="indent"
        :items="indents"
        size="lg"
        class="w-32"
        aria-label="缩进"
      />
      <div class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
        <USwitch v-model="keepComments" size="sm" aria-label="保留注释" />
        <span class="text-sm text-muted">保留注释</span>
      </div>
      <div v-if="mode === 'format'" class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
        <USwitch v-model="collapseText" size="sm" aria-label="纯文本压一行" />
        <span class="text-sm text-muted">纯文本压一行</span>
      </div>
      <div v-if="mode === 'format'" class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
        <USwitch v-model="sortAttributes" size="sm" aria-label="属性排序" />
        <span class="text-sm text-muted">属性排序</span>
      </div>
      <div v-if="mode === 'json'" class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
        <USwitch v-model="mergeSameName" size="sm" aria-label="同名兄弟归数组" />
        <span class="text-sm text-muted">同名兄弟归数组</span>
      </div>
      <div v-if="mode === 'json'" class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
        <USwitch v-model="numbers" size="sm" aria-label="数字转 number" />
        <span class="text-sm text-muted">数字转 number</span>
      </div>
    </div>

    <div v-if="mode === 'json'" class="flex flex-wrap items-end gap-3 rounded-xl border border-default p-3">
      <UFormField label="属性放哪个键下" class="w-44">
        <UInput v-model="attrsKey" size="sm" :ui="{ base: 'font-mono text-xs' }" placeholder="_attributes" />
      </UFormField>
      <UFormField label="文本放哪个键下" class="w-44">
        <UInput v-model="textKey" size="sm" :ui="{ base: 'font-mono text-xs' }" placeholder="_text" />
      </UFormField>
    </div>

    <div
      v-if="stats"
      class="flex flex-wrap items-center gap-2 text-xs text-muted"
      aria-label="结构统计"
    >
      <UBadge :label="`元素 ${stats.elements}`" color="neutral" variant="subtle" />
      <UBadge :label="`属性 ${stats.attributes}`" color="neutral" variant="subtle" />
      <UBadge :label="`文本 ${stats.textNodes}`" color="neutral" variant="subtle" />
      <UBadge v-if="stats.comments" :label="`注释 ${stats.comments}`" color="neutral" variant="subtle" />
      <UBadge v-if="stats.cdata" :label="`CDATA ${stats.cdata}`" color="neutral" variant="subtle" />
      <UBadge :label="`深度 ${stats.maxDepth}`" color="neutral" variant="subtle" />
      <UBadge v-if="stats.prefixes.length" :label="`前缀 ${stats.prefixes.join('、')}`" color="neutral" variant="subtle" />
    </div>

    <UAlert
      v-if="errors.length"
      :color="result.ok ? 'warning' : 'error'"
      variant="subtle"
      icon="lucide:triangle-alert"
      :title="`结构检查：${errors.length} 处问题`"
      class="max-h-40 overflow-auto"
    >
      <template #description>
        <ul class="flex flex-col gap-1">
          <li v-for="issue in errors.slice(0, 20)" :key="`${issue.line}:${issue.column}:${issue.message}`">
            第 {{ issue.line }} 行第 {{ issue.column }} 列：{{ issue.message }}
          </li>
          <li v-if="errors.length > 20">…另有 {{ errors.length - 20 }} 处未列出</li>
        </ul>
      </template>
    </UAlert>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="flex min-w-0 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">XML 输入</h2>
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
          placeholder="把 XML 粘贴到这里…"
          class="w-full"
          :ui="{ base: 'font-mono text-xs leading-relaxed' }"
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in XML_SAMPLES"
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
          <h2 class="text-sm font-medium text-highlighted">
            {{ mode === 'format' ? '格式化结果' : mode === 'minify' ? '压缩结果' : 'JSON 结果' }}
          </h2>
          <CopyButton :text="result.value" :disabled="!result.ok" />
        </div>
        <textarea
          :value="result.value"
          readonly
          rows="18"
          spellcheck="false"
          class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          :placeholder="result.ok ? '' : '有错时输出为空'"
        />
      </section>
    </div>

    <ul v-if="result.notes.length" class="flex flex-col gap-1 text-xs text-muted">
      <li v-for="note in result.notes" :key="note">· {{ note }}</li>
    </ul>

    <p class="text-xs text-dimmed">
      解析器不抛异常：标签错配、未闭合、裸
      <code class="rounded bg-elevated px-1 py-0.5">&amp;</code>
      都会记成带行列号的问题列表，同时尽量恢复出树，所以坏 XML 也还能格式化出有用的结果。实体只认 5 个内置加数字引用，
      <code class="rounded bg-elevated px-1 py-0.5">&amp;nbsp;</code> 之类要 DTD 才有效，离线一律按未转义报错。全程在浏览器里算，输入不上传。
    </p>
  </ToolShell>
</template>
