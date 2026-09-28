<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { useStored } from '~/composables/useStored'
import { diffLines, splitLines, toUnifiedPatch } from '~/tools/diff'

const left = useStored('tool.diff.left', 'const a = 1\nconst b = 2\n\nconsole.log(a + b)')
const right = useStored('tool.diff.right', 'const a = 1\nconst c = 3\n\nconsole.log(a + c)')

const ignoreCase = useStored('tool.diff.ignoreCase', false)
const ignoreWhitespace = useStored('tool.diff.ignoreWhitespace', false)
const onlyChanges = ref(false)

const options = computed(() => ({
  ignoreCase: ignoreCase.value,
  ignoreWhitespace: ignoreWhitespace.value
}))

const result = computed(() => diffLines(left.value, right.value, options.value))

interface RowData {
  kind: 'same' | 'add' | 'del'
  text: string
  leftNo: number | null
  rightNo: number | null
}

type Display = ({ type: 'row' } & RowData) | { type: 'fold'; hidden: number }

const display = computed<Display[]>(() => {
  const out: Display[] = []
  let run: RowData[] = []

  const flush = (): void => {
    if (run.length === 0) return
    if (onlyChanges.value && run.length > 1) out.push({ type: 'fold', hidden: run.length })
    else out.push(...run.map((row) => ({ type: 'row' as const, ...row })))
    run = []
  }

  for (const row of result.value.rows) {
    if (row.kind === 'same') run.push(row)
    else {
      flush()
      out.push({ type: 'row', ...row })
    }
  }
  flush()
  return out
})

const collapsedCount = computed(() =>
  display.value.reduce((sum, item) => sum + (item.type === 'fold' ? item.hidden : 0), 0)
)

const patch = computed(() => toUnifiedPatch(result.value.rows, { leftName: '原文', rightName: '新文' }))
const changed = computed(() => result.value.added + result.value.removed)
const identical = computed(() => result.value.rows.length > 0 && changed.value === 0)
const empty = computed(() => splitLines(left.value).length === 0 && splitLines(right.value).length === 0)

const kindClass: Record<string, string> = {
  same: 'bg-transparent text-muted',
  add: 'bg-success/10 text-default',
  del: 'bg-error/10 text-default'
}
const kindSign: Record<string, string> = { same: ' ', add: '+', del: '-' }

function swap(): void {
  const previous = left.value
  left.value = right.value
  right.value = previous
}
</script>

<template>
  <ToolShell tool-id="diff">
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">原文 / 旧版本</span>
          <UTextarea
            v-model="left"
            :rows="10"
            placeholder="粘贴第一段文本"
            class="w-full"
            :ui="{ base: 'font-mono text-xs leading-relaxed resize-y' }"
          />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">新文 / 新版本</span>
          <UTextarea
            v-model="right"
            :rows="10"
            placeholder="粘贴第二段文本"
            class="w-full"
            :ui="{ base: 'font-mono text-xs leading-relaxed resize-y' }"
          />
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <UButton icon="lucide:arrow-left-right" label="交换两侧" color="neutral" variant="outline" @click="swap" />
        <label class="inline-flex items-center gap-1.5 text-sm text-muted">
          <USwitch v-model="ignoreWhitespace" size="sm" aria-label="忽略空白差异" />
          忽略空白
        </label>
        <label class="inline-flex items-center gap-1.5 text-sm text-muted">
          <USwitch v-model="ignoreCase" size="sm" aria-label="忽略大小写" />
          忽略大小写
        </label>
        <label class="inline-flex items-center gap-1.5 text-sm text-muted">
          <USwitch v-model="onlyChanges" size="sm" aria-label="仅显示差异" />
          仅显示差异
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge color="neutral" variant="subtle" :label="`原 ${splitLines(left).length} 行 / 新 ${splitLines(right).length} 行`" />
        <UBadge color="success" variant="soft" :label="`新增 ${result.added}`" />
        <UBadge color="error" variant="soft" :label="`删除 ${result.removed}`" />
        <UBadge color="neutral" variant="soft" :label="`相同 ${result.same}`" />
        <UBadge v-if="collapsedCount" color="neutral" variant="outline" :label="`已折叠 ${collapsedCount} 行`" />
        <CopyButton v-if="patch" :text="patch" label="复制 unified patch" size="xs" />
      </div>

      <p v-if="result.error" class="text-sm text-warning">{{ result.error }}</p>
      <p v-else-if="empty" class="text-sm text-dimmed">两侧都是空文本。</p>
      <p v-else-if="identical" class="text-sm text-dimmed">按当前设置两侧完全一致。</p>

      <div v-else class="overflow-x-auto rounded-xl border border-default">
        <table class="w-full border-collapse font-mono text-xs leading-relaxed">
          <tbody>
            <template v-for="(item, index) in display" :key="index">
              <tr v-if="item.type === 'fold'" class="bg-elevated text-dimmed">
                <td colspan="4" class="px-3 py-1 text-center font-sans">
                  ⋯ 省略 {{ item.hidden }} 行相同内容
                </td>
              </tr>
              <tr v-else :class="kindClass[item.kind]">
                <td class="w-12 select-none border-r border-default px-2 text-right align-top text-dimmed">{{ item.leftNo ?? '' }}</td>
                <td class="w-12 select-none border-r border-default px-2 text-right align-top text-dimmed">{{ item.rightNo ?? '' }}</td>
                <td class="w-5 select-none align-top text-dimmed">{{ kindSign[item.kind] }}</td>
                <td class="whitespace-pre-wrap break-all px-2 py-0.5 align-top">{{ item.text || ' ' }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <p class="text-xs leading-relaxed text-dimmed">
        行级 LCS 比对：先裁掉公共前后缀，再对中间段做动态规划（上限 4×10⁶ 单元，超限退化为整体替换）。
        差异只在浏览器内存中计算，不会上传。
      </p>
    </div>
  </ToolShell>
</template>
