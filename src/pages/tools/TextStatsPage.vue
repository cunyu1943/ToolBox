<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { analyzeText, TEXT_STATS_SAMPLES } from '~/tools/text-stats'
import { useStored } from '~/composables/useStored'

const source = useStored('tool.text-stats.source', TEXT_STATS_SAMPLES[0]!.value)

const stats = computed(() => analyzeText(source.value))

const cards = computed(() => [
  { label: '字符', value: stats.value.chars, hint: '按 Unicode 码点，emoji 算 1 个' },
  { label: '不含空白', value: stats.value.charsWithoutSpaces, hint: '去掉空格、制表与换行' },
  { label: 'UTF-8 字节', value: stats.value.utf8Bytes, hint: '汉字 3 字节，常用于容量估算' },
  { label: 'UTF-16 单元', value: stats.value.utf16Units, hint: '即 JS 的 length' },
  { label: '词', value: stats.value.words, hint: '拉丁词 + 中日韩逐字' },
  { label: '句子', value: stats.value.sentences, hint: '按句读近似切分' },
  { label: '段落', value: stats.value.paragraphs, hint: '空行分隔' },
  { label: '行', value: stats.value.nonEmptyLines, hint: `共 ${stats.value.lines} 行，含空行` }
])

const cjkShare = computed(() => {
  const total = stats.value.charsWithoutSpaces
  if (!total) return 0
  return Math.round(((stats.value.cjkChars + stats.value.cjkPunct) / total) * 100)
})

const report = computed(() => {
  const s = stats.value
  const lines = [
    `字符 ${s.chars}（不含空白 ${s.charsWithoutSpaces}）`,
    `词 ${s.words}（拉丁 ${s.latinWords} + 中日韩 ${s.cjkChars}）`,
    `句子 ${s.sentences} · 段落 ${s.paragraphs} · 行 ${s.nonEmptyLines}/${s.lines}`,
    `UTF-8 字节 ${s.utf8Bytes} · UTF-16 单元 ${s.utf16Units}`,
    `空白：空格 ${s.spaces} · 制表 ${s.tabs} · 换行 ${s.newlines}`,
    `其他：字母 ${s.letters} · 数字 ${s.digits} · 中日韩标点 ${s.cjkPunct} · 符号 ${s.symbols}`,
    `阅读时长 ${s.reading.label}（中文 300 字/分、英文 200 词/分折算）`
  ]
  if (s.topWords.length) {
    lines.push(`高频词：${s.topWords.map((item) => `${item.word}×${item.count}`).join('、')}`)
  }
  return lines.join('\n')
})
</script>

<template>
  <ToolShell tool-id="text-stats">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="sample in TEXT_STATS_SAMPLES"
          :key="sample.label"
          :label="sample.label"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="source = sample.value"
        />
        <UButton
          icon="lucide:eraser"
          label="清空"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="source = ''"
        />
      </div>

      <UTextarea
        v-model="source"
        :rows="12"
        spellcheck="false"
        placeholder="粘贴或输入要统计的文本，统计结果实时刷新"
        aria-label="待统计文本"
        :ui="{ base: 'leading-relaxed' }"
      />

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="card in cards" :key="card.label" class="flex flex-col gap-1 rounded-xl border border-default bg-elevated p-3">
          <span class="text-xs text-dimmed">{{ card.label }}</span>
          <span class="text-2xl leading-none font-semibold tabular-nums text-highlighted">{{ card.value }}</span>
          <span class="text-xs leading-snug text-muted">{{ card.hint }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">阅读时长</h2>
          <CopyButton :text="report" :disabled="!stats.charsWithoutSpaces" label="复制统计报告" />
        </div>
        <p class="text-2xl leading-none font-semibold text-highlighted">{{ stats.reading.label }}</p>
        <p class="text-xs leading-relaxed text-muted">
          按中文 300 字/分、英文 200 词/分折算后相加，是估算值；朗读、精读或扫读都会明显偏离这个数。
        </p>
      </div>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">中英占比</h2>
        <div class="h-2 overflow-hidden rounded-full bg-elevated" role="presentation">
          <div class="h-full rounded-full bg-primary transition-[width] duration-200" :style="{ width: `${cjkShare}%` }" />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge :label="`中日韩文字 ${stats.cjkChars}`" color="neutral" variant="subtle" />
          <UBadge :label="`其他字母 ${stats.letters}`" color="neutral" variant="subtle" />
          <UBadge :label="`数字 ${stats.digits}`" color="neutral" variant="subtle" />
          <UBadge :label="`中日韩标点 ${stats.cjkPunct}`" color="neutral" variant="subtle" />
          <UBadge :label="`符号 ${stats.symbols}`" color="neutral" variant="subtle" />
          <UBadge v-if="cjkShare" :label="`占比约 ${cjkShare}%`" color="primary" variant="subtle" />
        </div>
        <p class="text-xs leading-relaxed text-dimmed">
          中文标点与全角符号单独计数，不会混进「字数」里；半角标点与 emoji 归入「符号」。
        </p>
      </section>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">空白构成</h2>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge :label="`空格 ${stats.spaces}`" color="neutral" variant="subtle" />
          <UBadge :label="`制表符 ${stats.tabs}`" color="neutral" variant="subtle" />
          <UBadge :label="`换行 ${stats.newlines}`" color="neutral" variant="subtle" />
          <UBadge :label="`最长行 ${stats.longestLine} 字符`" color="neutral" variant="subtle" />
        </div>
        <p v-if="stats.tabs" class="text-xs leading-relaxed text-warning">
          文本里同时存在制表符与空格缩进的可能性较大，粘贴进代码前建议统一缩进风格。
        </p>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">高频英文词</h2>
        <div v-if="stats.topWords.length" class="flex flex-col gap-1">
          <div
            v-for="item in stats.topWords"
            :key="item.word"
            class="flex items-center justify-between gap-3 border-b border-default py-1 text-sm last:border-b-0"
          >
            <code class="font-mono text-default">{{ item.word }}</code>
            <span class="tabular-nums text-muted">{{ item.count }} 次</span>
          </div>
        </div>
        <p v-else class="text-sm text-dimmed">没有可统计的英文词（已排除停用词、单字母与纯数字）。</p>
        <p class="text-xs leading-relaxed text-dimmed">
          只统计拉丁字母词；中文分词需要词典，纯前端不做，所以「词数」里的中文按字计。
        </p>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        计数全部在浏览器内完成，输入内容不会离开本机。句子切分是启发式的：中文按
        <code class="rounded bg-elevated px-1 py-0.5">。！？…</code>
        归句，西文的 <code class="rounded bg-elevated px-1 py-0.5">. ! ?</code>
        只在后面紧跟空白或行尾时算句末，因此 <code class="rounded bg-elevated px-1 py-0.5">3.14</code>
        与 <code class="rounded bg-elevated px-1 py-0.5">v1.2.3</code> 不会被切碎。
      </p>
    </div>
  </ToolShell>
</template>
