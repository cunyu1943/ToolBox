<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  ASCII_CODE_GROUPS, asciiByCode, asciiTable, ctrlCombo, formatsFor, searchAscii,
  type AsciiEntry, type AsciiFilter
} from '~/tools/ascii-table'
import { useStored } from '~/composables/useStored'

const filters: { label: string; value: AsciiFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '控制字符', value: 'control' },
  { label: '可打印', value: 'printable' },
  { label: '空格', value: 'space' }
]

const query = useStored('tool.ascii-table.query', '')
const filter = useStored<AsciiFilter>('tool.ascii-table.filter', 'all')
const selected = useStored('tool.ascii-table.selected', 65)

const results = computed(() => searchAscii({ text: query.value, filter: filter.value }))
const counts = computed(() => ({
  all: asciiTable.length,
  control: asciiTable.filter((entry) => entry.kind === 'control').length,
  printable: asciiTable.filter((entry) => entry.kind === 'printable').length,
  space: 1
}))

const entry = computed<AsciiEntry | undefined>(() => asciiByCode(selected.value))
const formats = computed(() => (entry.value ? formatsFor(entry.value.code) : []))
const report = computed(() =>
  entry.value
    ? [
        `ASCII ${entry.value.code}（${entry.value.name} · ${entry.value.zh}）`,
        ...formats.value.map((item) => `${item.label}: ${item.value}`)
      ].join('\n')
    : ''
)

const kindLabel: Record<AsciiEntry['kind'], string> = {
  control: '控制字符',
  space: '空白',
  printable: '可打印'
}

function pick(code: number) {
  selected.value = code
}

function resetFilters() {
  query.value = ''
  filter.value = 'all'
}
</script>

<template>
  <ToolShell tool-id="ascii-table">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <label class="min-w-0 flex-1 sm:flex-none">
          <span class="text-xs text-muted">查询（支持 <code>65</code>、<code>0x41</code>、<code>41h</code>、<code>U+0041</code>、<code>&amp;#38;</code>、字符本身或名称）</span>
          <UInput v-model="query" placeholder="例如 Tab、LF、CR、38" class="w-full sm:w-64" aria-label="查询 ASCII 码位" />
        </label>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="item in filters"
            :key="item.value"
            :label="`${item.label} ${counts[item.value]}`"
            :color="filter === item.value ? 'primary' : 'neutral'"
            :variant="filter === item.value ? 'subtle' : 'ghost'"
            size="sm"
            @click="filter = item.value"
          />
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            码表 <span class="text-muted">（{{ results.length }} / 128）</span>
          </h2>
          <UButton
            v-if="results.length !== 128 || filter !== 'all'"
            icon="lucide:eraser"
            label="重置筛选"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="resetFilters"
          />
        </div>
        <div class="grid max-h-[28rem] grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-8 lg:grid-cols-12">
          <button
            v-for="item in results"
            :key="item.code"
            type="button"
            class="flex h-14 flex-col items-center justify-center gap-0.5 rounded-md border text-center transition-colors"
            :class="
              item.code === selected
                ? 'border-primary bg-primary/15 text-highlighted'
                : 'border-default bg-elevated text-muted hover:border-primary/40'
            "
            :aria-label="`${item.code} ${item.name}`"
            @click="pick(item.code)"
          >
            <code class="text-base leading-none font-mono text-default">{{ item.char || '·' }}</code>
            <code class="text-[10px] leading-none text-dimmed">{{ item.code }}</code>
            <code class="text-[10px] leading-none text-dimmed">{{ item.code.toString(16).toUpperCase() }}</code>
          </button>
        </div>
        <p v-if="!results.length" class="text-sm text-dimmed">没有匹配的码位。可以试 <code class="rounded bg-elevated px-1">9</code>、<code class="rounded bg-elevated px-1">0x2f</code> 或 <code class="rounded bg-elevated px-1">换行</code>。</p>
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          <span v-for="group in ASCII_CODE_GROUPS" :key="group.label" class="text-xs text-dimmed">
            <code class="rounded bg-elevated px-1">{{ group.label }}</code> {{ group.note }}
          </span>
        </div>
      </div>

      <section v-if="entry" class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl font-mono text-primary">
              {{ entry.char || '·' }}
            </span>
            <div class="flex flex-col gap-1">
              <h2 class="text-lg font-semibold text-highlighted">
                {{ entry.name }}
                <UBadge :label="kindLabel[entry.kind]" :color="entry.kind === 'control' ? 'warning' : 'neutral'" variant="subtle" />
              </h2>
              <p class="text-sm text-muted">{{ entry.zh }}</p>
              <p v-if="entry.kind === 'control'" class="text-xs text-dimmed">键盘组合：<code class="font-mono">{{ ctrlCombo(entry.code) }}</code></p>
            </div>
          </div>
          <CopyButton :text="report" label="复制全部写法" />
        </div>

        <p v-if="entry.hint" class="rounded-lg bg-elevated p-3 text-xs leading-relaxed text-muted">{{ entry.hint }}</p>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[34rem] border-collapse text-sm">
            <tbody>
              <tr v-for="item in formats" :key="item.label" class="border-b border-default last:border-b-0">
                <th scope="row" class="w-40 whitespace-nowrap p-2 text-left align-top text-xs font-normal text-dimmed">
                  {{ item.label }}
                </th>
                <td class="p-2 align-top">
                  <code class="break-all font-mono text-default">{{ item.value }}</code>
                </td>
                <td class="w-10 p-2 align-top text-right">
                  <CopyButton :text="item.value" label="" size="xs" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">这张表只有 128 个位置</h2>
        <p class="text-xs leading-relaxed text-muted">
          ASCII 用 7 位表示 0–127，最高位恒为 0。1961 年定稿时把 0–31 与 127 划给控制字符（今天只剩
          <code class="rounded bg-elevated px-1">Tab</code>、<code class="rounded bg-elevated px-1">LF</code>、
          <code class="rounded bg-elevated px-1">CR</code>、<code class="rounded bg-elevated px-1">ESC</code> 还在日常使用），
          32–126 是 95 个可打印字符，其中 33–47、58–64、91–96、123–126 是符号与标点。
        </p>
        <p class="text-xs leading-relaxed text-dimmed">
          128–255 不属于 ASCII：在 ISO-8859-1 里是带重音的拉丁字母，在 GBK/Big5 里是半个汉字，在 UTF-8 里只是多字节序列的一部分——
          这正是「乱码」的来源。Unicode 与 UTF-8 的查算请用「文本统计」「HTML 实体编解码」「Unicode 转义」三页。
        </p>
      </section>
    </div>
  </ToolShell>
</template>
