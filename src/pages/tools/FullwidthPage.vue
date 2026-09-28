<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { convertWidth, FULLWIDTH_SAMPLES, type WidthDirection } from '~/tools/fullwidth'
import { useStored } from '~/composables/useStored'

const directionItems: { label: string; value: WidthDirection }[] = [
  { label: '全角 → 半角', value: 'to-half' },
  { label: '半角 → 全角', value: 'to-full' }
]

const source = useStored('tool.fullwidth.source', FULLWIDTH_SAMPLES[1]!.value)
const direction = useStored<WidthDirection>('tool.fullwidth.direction', 'to-half')
const mapPunctuation = useStored('tool.fullwidth.mapPunctuation', false)

const result = computed(() => convertWidth(source.value, direction.value, mapPunctuation.value))
const toHalf = computed(() => direction.value === 'to-half')

const report = computed(
  () =>
    `${result.value.value}\n\n` +
    `转换 ${result.value.converted} 个字符 · 全角 ${result.value.stats.fullWidth} · 半角 ${result.value.stats.halfWidth} · 其他 ${result.value.stats.untouched}`
)
</script>

<template>
  <ToolShell tool-id="fullwidth">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">转换方向</span>
          <USelect v-model="direction" :items="directionItems" item-key="value" class="w-44" />
        </label>
        <label v-if="toHalf" class="flex items-center gap-2 pb-2">
          <USwitch v-model="mapPunctuation" size="sm" aria-label="中文标点归一化" />
          <span class="text-sm">中文标点归一化（<code class="rounded bg-elevated px-1">。</code> → <code class="rounded bg-elevated px-1">.</code>）</span>
        </label>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in FULLWIDTH_SAMPLES"
            :key="sample.label"
            :label="sample.label"
            color="neutral"
            variant="subtle"
            size="sm"
            @click="source = sample.value"
          />
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">输入</span>
          <UTextarea
            v-model="source"
            :rows="8"
            spellcheck="false"
            placeholder="粘贴需要转换的文本"
            aria-label="待转换文本"
          />
        </label>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted">结果</span>
            <CopyButton :text="report" :disabled="!source" label="复制结果" />
          </div>
          <UTextarea
            :model-value="result.value"
            :rows="8"
            readonly
            spellcheck="false"
            aria-label="转换结果"
            :ui="{ base: 'bg-elevated' }"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge :label="`已转换 ${result.converted}`" :color="result.converted ? 'primary' : 'neutral'" variant="subtle" />
        <UBadge :label="`全角 ${result.stats.fullWidth}`" color="neutral" variant="subtle" />
        <UBadge :label="`半角 ${result.stats.halfWidth}`" color="neutral" variant="subtle" />
        <UBadge :label="`汉字/假名/其他 ${result.stats.untouched}`" color="neutral" variant="subtle" />
        <UBadge v-if="result.stats.spaces" :label="`空白 ${result.stats.spaces}`" color="neutral" variant="subtle" />
        <UBadge v-if="result.normalized.length" :label="`标点归一化 ${result.normalized.join('')}`" color="warning" variant="subtle" />
      </div>

      <UAlert
        v-if="result.notes.length"
        color="warning"
        variant="subtle"
        icon="lucide:info"
        title="转换说明"
        :description="result.notes.join('；')"
      />

      <p v-if="result.remaining.length" class="text-xs leading-relaxed text-dimmed">
        未参与转换的字符：<code class="rounded bg-elevated px-1 py-0.5">{{ result.remaining.join('') }}</code>
      </p>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">为什么只有这两段码位能互转</h2>
        <p class="text-xs leading-relaxed text-muted">
          半角可打印区是 <code class="rounded bg-elevated px-1">U+0020–U+007E</code>，全角形式是
          <code class="rounded bg-elevated px-1">U+FF01–U+FF5E</code>，两者逐位相差
          <code class="rounded bg-elevated px-1">0xFEE0</code>，所以映射是一对一、可逆的；全角空格
          <code class="rounded bg-elevated px-1">U+3000</code> 对应半角空格 <code class="rounded bg-elevated px-1">U+0020</code>。
        </p>
        <p class="text-xs leading-relaxed text-muted">
          <code class="rounded bg-elevated px-1">U+3000–U+303F</code> 的 CJK 标点（<code class="rounded bg-elevated px-1">。、《》</code>）
          不在那段区间里，也没有等价的单字节字符，只能靠人工映射，因此默认保持原样。「中文标点归一化」就是把这张人工映射表打开，
          它属于改写而不是等价转换，代码与数据字段里慎用。
        </p>
        <p class="text-xs leading-relaxed text-dimmed">
          最常见的用途是排错：密码、变量名、URL 里混进全角字符会「看着一样但比对不相等」，粘到这里转半角即可暴露差异。
        </p>
      </section>
    </div>
  </ToolShell>
</template>
