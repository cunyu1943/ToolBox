<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  inspectYaml,
  jsonToYaml,
  YAML_SAMPLES,
  yamlToJson,
  type ConvertResult
} from '~/tools/yaml-json'
import { useStored } from '~/composables/useStored'

const directions = [
  { label: 'YAML → JSON', value: 'y2j' as const },
  { label: 'JSON → YAML', value: 'j2y' as const }
]
type Direction = (typeof directions)[number]['value']

const jsonIndents = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 },
  { label: '压成一行', value: 0 }
]
const yamlIndents = [
  { label: '2 空格', value: 2 },
  { label: '4 空格', value: 4 }
]
const flowLevels = [
  { label: '全部块式（-1）', value: -1 },
  { label: '第二层起流式（1）', value: 1 },
  { label: '第三层起流式（2）', value: 2 },
  { label: '全部流式（0）', value: 0 }
]

const direction = useStored<Direction>('tool.yaml-json.direction', 'y2j')
const source = useStored('tool.yaml-json.source', YAML_SAMPLES[1]?.value ?? '')
const jsonIndent = useStored('tool.yaml-json.json-indent', 2)
const allDocuments = useStored('tool.yaml-json.all-documents', true)
const yamlIndent = useStored('tool.yaml-json.yaml-indent', 2)
const sortKeys = useStored('tool.yaml-json.sort-keys', false)
const forceQuotes = useStored('tool.yaml-json.force-quotes', false)
const flowLevel = useStored('tool.yaml-json.flow-level', -1)
const wrap = useStored('tool.yaml-json.wrap', false)

const result = computed<ConvertResult>(() => {
  if (!source.value.trim()) return { ok: false, value: '', notes: [], error: '请输入内容。' }
  return direction.value === 'y2j'
    ? yamlToJson(source.value, { indent: jsonIndent.value, allDocuments: allDocuments.value })
    : jsonToYaml(source.value, {
        indent: yamlIndent.value,
        sortKeys: sortKeys.value,
        forceQuotes: forceQuotes.value,
        flowLevel: flowLevel.value,
        wrap: wrap.value
      })
})

/** YAML 方向额外做一次纯校验，好把「几个文档」这类信息单独拎出来 */
const checked = computed(() => (direction.value === 'y2j' && source.value.trim() ? inspectYaml(source.value) : null))

const roundTripOk = computed(() => result.value.notes.some((note) => note.includes('已往返验证')))
const roundTripBad = computed(() => result.value.notes.some((note) => note.includes('往返不一致')))
</script>

<template>
  <ToolShell tool-id="yaml-json">
    <div class="flex flex-wrap items-center gap-2">
      <USelect v-model="direction" :items="directions" size="lg" class="w-44" aria-label="转换方向" />
      <USelect
        v-if="direction === 'y2j'"
        v-model="jsonIndent"
        :items="jsonIndents"
        size="lg"
        class="w-36"
        aria-label="JSON 缩进"
      />
      <USelect v-else v-model="yamlIndent" :items="yamlIndents" size="lg" class="w-36" aria-label="YAML 缩进" />
      <USelect
        v-if="direction === 'j2y'"
        v-model="flowLevel"
        :items="flowLevels"
        size="lg"
        class="w-48"
        aria-label="流式层级"
      />
      <div v-if="direction === 'y2j'" class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
        <USwitch v-model="allDocuments" size="sm" aria-label="多文档合成数组" />
        <span class="text-sm text-muted">多文档合成数组</span>
      </div>
      <template v-if="direction === 'j2y'">
        <div class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
          <USwitch v-model="sortKeys" size="sm" aria-label="键排序" />
          <span class="text-sm text-muted">键排序</span>
        </div>
        <div class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
          <USwitch v-model="forceQuotes" size="sm" aria-label="全部加引号" />
          <span class="text-sm text-muted">全部加引号</span>
        </div>
        <div class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
          <USwitch v-model="wrap" size="sm" aria-label="按 80 列折行" />
          <span class="text-sm text-muted">80 列折行</span>
        </div>
      </template>
    </div>

    <UAlert
      v-if="result.error"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="转换失败"
      :description="result.error"
    />
    <UAlert
      v-else-if="roundTripBad"
      color="warning"
      variant="subtle"
      icon="lucide:triangle-alert"
      title="往返不一致"
      description="回读后的结构与输入不完全相同，最常见的是纯数字键与形似数字的字符串；建议打开「全部加引号」。"
    />
    <UAlert
      v-else-if="roundTripOk"
      color="success"
      variant="subtle"
      icon="lucide:check"
      title="往返一致"
      description="生成的 YAML 已回读比对过，结构与输入相同。"
    />

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="flex min-w-0 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">{{ direction === 'y2j' ? 'YAML 输入' : 'JSON 输入' }}</h2>
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
          :placeholder="direction === 'y2j' ? '把 YAML 粘贴到这里…' : '把 JSON 粘贴到这里…'"
          class="w-full"
          :ui="{ base: 'font-mono text-xs leading-relaxed' }"
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in YAML_SAMPLES"
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
          <h2 class="text-sm font-medium text-highlighted">{{ direction === 'y2j' ? 'JSON 输出' : 'YAML 输出' }}</h2>
          <CopyButton :text="result.value" :disabled="!result.ok" />
        </div>
        <textarea
          :value="result.value"
          readonly
          rows="18"
          spellcheck="false"
          class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          :placeholder="result.ok ? '' : '转换失败时输出为空'"
        />
      </section>
    </div>

    <ul v-if="result.notes.length" class="flex flex-col gap-1 text-xs text-muted">
      <li v-for="note in result.notes" :key="note">· {{ note }}</li>
    </ul>
    <p v-if="checked?.ok" class="text-xs text-dimmed">单独校验：{{ checked.notes.join('；') }}</p>

    <p class="text-xs text-dimmed">
      解析在本地完成（<code class="rounded bg-elevated px-1 py-0.5">js-yaml</code>），内容不会离开浏览器。几个已知的类型陷阱：
      <code class="rounded bg-elevated px-1 py-0.5">2026-01-02</code> 会被读成字符串、
      <code class="rounded bg-elevated px-1 py-0.5">yes/no/on/off</code> 在 YAML 1.2 里也只是字符串、
      <code class="rounded bg-elevated px-1 py-0.5">.inf</code> 与超长整数在 JSON 里没有对应写法（已在提示里说明），
      合并键 <code class="rounded bg-elevated px-1 py-0.5">&lt;&lt;:</code> 不展开、原样保留成一个叫
      <code class="rounded bg-elevated px-1 py-0.5">&lt;&lt;</code> 的键。
    </p>
  </ToolShell>
</template>
