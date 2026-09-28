<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  HTML_SAMPLES,
  htmlToMarkdown,
  MD_SAMPLES,
  mdToHtml,
  type HtmlToMdOptions
} from '~/tools/html-md'
import { useStored } from '~/composables/useStored'

type Direction = 'html-to-md' | 'md-to-html'

const bullets: { label: string; value: HtmlToMdOptions['bullet'] }[] = [
  { label: '-（短横线）', value: '-' },
  { label: '*（星号）', value: '*' },
  { label: '+（加号）', value: '+' }
]
const linkStyles: { label: string; value: HtmlToMdOptions['linkStyle'] }[] = [
  { label: '行内 [文字](地址)', value: 'inline' },
  { label: '引用式 [文字][键]', value: 'reference' }
]

const direction = useStored<Direction>('tool.html-md.direction', 'html-to-md')
const html = useStored('tool.html-md.html', HTML_SAMPLES[0]!.value)
const markdown = useStored('tool.html-md.md', MD_SAMPLES[0]!.value)

const bullet = useStored<HtmlToMdOptions['bullet']>('tool.html-md.bullet', '-')
const linkStyle = useStored<HtmlToMdOptions['linkStyle']>('tool.html-md.link', 'inline')
const keepHardBreaks = useStored('tool.html-md.hard-breaks', true)
const keepTableHtml = useStored('tool.html-md.keep-table-html', true)

const breaks = useStored('tool.html-md.breaks', false)
const gfmTables = useStored('tool.html-md.gfm-tables', true)
const taskLists = useStored('tool.html-md.task-lists', true)
const strikethrough = useStored('tool.html-md.strike', true)
const pretty = useStored('tool.html-md.pretty', true)
const headingIds = useStored('tool.html-md.heading-ids', false)

const toMd = computed(() =>
  htmlToMarkdown(html.value, { bullet: bullet.value, linkStyle: linkStyle.value, keepHardBreaks: keepHardBreaks.value, keepTableHtml: keepTableHtml.value })
)
const toHtml = computed(() =>
  mdToHtml(markdown.value, {
    breaks: breaks.value,
    gfmTables: gfmTables.value,
    taskLists: taskLists.value,
    strikethrough: strikethrough.value,
    pretty: pretty.value,
    headingIds: headingIds.value
  })
)

const forward = computed(() => (direction.value === 'html-to-md' ? toMd.value : toHtml.value))
const source = computed({
  get: () => (direction.value === 'html-to-md' ? html.value : markdown.value),
  set: (value: string) => {
    if (direction.value === 'html-to-md') html.value = value
    else markdown.value = value
  }
})
const output = computed(() => forward.value.value)
const isEmpty = computed(() => !source.value.trim())

const samples = computed(() => (direction.value === 'html-to-md' ? HTML_SAMPLES : MD_SAMPLES))

/** 转换结果落回另一个输入框，方便连着一路转下去 */
function feed(): void {
  if (direction.value === 'html-to-md') markdown.value = output.value
  else html.value = output.value
}
</script>

<template>
  <ToolShell tool-id="html-md">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <UDropdownMenu
          :items="[
            [
              { label: 'HTML → Markdown', icon: 'lucide:file-code-2', onSelect: () => (direction = 'html-to-md') },
              { label: 'Markdown → HTML', icon: 'lucide:file-text', onSelect: () => (direction = 'md-to-html') }
            ]
          ]"
        >
          <UButton
            :icon="direction === 'html-to-md' ? 'lucide:file-code-2' : 'lucide:file-text'"
            :label="direction === 'html-to-md' ? 'HTML → Markdown' : 'Markdown → HTML'"
            trailing-icon="lucide:chevron-down"
            color="neutral"
            variant="subtle"
          />
        </UDropdownMenu>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in samples"
            :key="sample.label"
            :label="sample.label"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="source = sample.value"
          />
        </div>
      </div>

      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label for="hm-input" class="text-sm font-medium text-highlighted">
            {{ direction === 'html-to-md' ? 'HTML 源码' : 'Markdown 源码' }}
          </label>
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
          id="hm-input"
          v-model="source"
          :rows="10"
          :placeholder="direction === 'html-to-md' ? '<h1>标题</h1><p>正文</p>' : '# 标题\n\n正文'"
          :ui="{ base: 'font-mono text-sm' }"
        />
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-3">
        <span class="text-sm font-medium text-highlighted">选项</span>
        <div v-if="direction === 'html-to-md'" class="flex flex-wrap items-center gap-4">
          <UFormField label="列表符号" class="w-40">
            <USelect v-model="bullet" :items="bullets" size="sm" />
          </UFormField>
          <UFormField label="链接写法" class="w-44">
            <USelect v-model="linkStyle" :items="linkStyles" size="sm" />
          </UFormField>
          <UCheckbox v-model="keepHardBreaks" label="保留 &lt;br&gt; 为硬换行" size="sm" />
          <UCheckbox v-model="keepTableHtml" label="复杂表格降级为 HTML 代码块" size="sm" />
        </div>
        <div v-else class="flex flex-wrap items-center gap-4">
          <UCheckbox v-model="breaks" label="段内换行 → &lt;br&gt;" size="sm" />
          <UCheckbox v-model="gfmTables" label="GFM 管道表格" size="sm" />
          <UCheckbox v-model="taskLists" label="任务列表" size="sm" />
          <UCheckbox v-model="strikethrough" label="删除线" size="sm" />
          <UCheckbox v-model="pretty" label="块之间空行" size="sm" />
          <UCheckbox v-model="headingIds" label="标题补 id" size="sm" />
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-highlighted">
            {{ direction === 'html-to-md' ? 'Markdown' : 'HTML' }}
          </span>
          <div class="flex items-center gap-2">
            <UButton
              icon="lucide:arrow-left-right"
              label="填入另一侧"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="isEmpty"
              @click="feed"
            />
            <CopyButton :text="output" :disabled="isEmpty" label="复制结果" size="xs" />
          </div>
        </div>
        <pre
          class="max-h-96 overflow-auto rounded-xl border border-default bg-elevated px-3 py-2 font-mono text-xs text-default"
        >{{ isEmpty ? '（等待输入）' : output }}</pre>
        <div class="flex flex-col gap-1 text-xs">
          <p v-for="note in forward.notes" :key="note" class="text-muted">· {{ note }}</p>
          <p v-for="warn in forward.warnings" :key="warn" class="text-warning">· {{ warn }}</p>
        </div>
      </section>

      <p class="text-xs text-dimmed">
        HTML 解析是宽容的：标签不闭合会自动补齐、多余闭合标签忽略，问题写在上面的提示里。
        脚本、样式、表单等没有 Markdown 等价物的标签只保留文字；合并单元格的表格会整块留成 HTML 代码块。
        定义列表转出的 <code class="font-mono">术语 / : 释义</code> 是单向写法，反向不解析。
      </p>
    </div>
  </ToolShell>
</template>
