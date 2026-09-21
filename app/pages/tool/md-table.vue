<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">分隔符</span>
          <USelect v-model="delimLabel" :items="DELIM_ITEMS.map(i => i.label)" size="xs" class="w-28" />
        </div>
        <UButton
          :label="pad ? '源码补白：开' : '源码补白：关'"
          size="xs"
          :color="pad ? 'primary' : 'neutral'"
          :variant="pad ? 'subtle' : 'outline'"
          @click="pad = !pad"
        />
      </div>
      <UTextarea v-model="input" :rows="7" autoresize :maxrows="14" placeholder="每行一条数据，单元格用分隔符隔开，首行作表头" class="w-full font-mono text-sm" />
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <div v-if="!error && rows.length" class="flex flex-wrap gap-3">
        <div v-for="(_, i) in colCount" :key="i" class="flex items-center gap-1.5 text-xs">
          <span class="text-slate-400">第{{ i + 1 }}列</span>
          <USelect v-model="alignLabels[i]" :items="['左对齐', '居中', '右对齐']" size="xs" class="w-20" />
        </div>
      </div>
    </GlassCard>

    <GlassCard v-if="output" custom-class="p-4 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-400">Markdown 表格（{{ rows.length }} 行 × {{ colCount }} 列）</p>
        <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy" />
      </div>
      <pre class="overflow-x-auto whitespace-pre font-mono text-sm text-slate-800 dark:text-slate-100">{{ output }}</pre>
    </GlassCard>
    <p v-else-if="!error" class="text-xs text-slate-400">支持从 Excel/终端复制的 Tab 或空格分隔文本；单元格内的竖线与换行会自动处理。</p>
  </div>
</template>

<script setup lang="ts">
import { detectDelimiter, generateMarkdownTable, parseTableInput, type MdAlign } from '~/utils/markdown-table'

definePageMeta({ layout: 'tool' })

const DELIM_ITEMS = [
  { label: '自动探测', value: 'auto' },
  { label: 'Tab 制表符', value: '\t' },
  { label: '逗号', value: ',' },
  { label: '分号', value: ';' },
  { label: '竖线', value: '|' },
  { label: '连续空格', value: '  ' }
]
const ALIGN_MAP: Record<string, MdAlign> = { 左对齐: 'left', 居中: 'center', 右对齐: 'right' }

const input = ref('产品名称\t价格\t库存\n机械键盘\t399\t12\n显示器\t1299\t5\n鼠标\t99\t0')
const delimLabel = ref('自动探测')
const pad = ref(true)
const alignLabels = ref<string[]>([])

function resolveDelim(): string {
  const item = DELIM_ITEMS.find((d) => d.label === delimLabel.value)!
  return item.value === 'auto' ? detectDelimiter(input.value) : item.value
}

const rows = computed(() => {
  if (!input.value.trim()) return []
  try {
    return parseTableInput(input.value, resolveDelim())
  } catch {
    return []
  }
})
const colCount = computed(() => (rows.value[0]?.length ?? 0))
const error = computed(() => (input.value.trim() && !rows.value.length ? '未解析到数据行，请检查分隔符选择是否正确' : ''))
watch(colCount, (n) => {
  const list = alignLabels.value.slice(0, n)
  while (list.length < n) list.push('左对齐')
  alignLabels.value = list
}, { immediate: true })

const output = computed(() => {
  if (!input.value.trim() || !colCount.value) return ''
  try {
    return generateMarkdownTable(input.value, {
      delimiter: resolveDelim(),
      alignments: alignLabels.value.map((l) => ALIGN_MAP[l] ?? 'left'),
      pad: pad.value
    })
  } catch {
    return ''
  }
})

async function copy() {
  try {
    await navigator.clipboard.writeText(output.value)
  } catch {
    /* 静默 */
  }
}
</script>
