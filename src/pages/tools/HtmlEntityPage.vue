<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  countNonAscii, countStructural, decodeHtml, encodeEntities, escapeHtml,
  looksEncoded, NAMED_ENTITIES, ENTITY_SAMPLES, type EntityMode
} from '~/tools/html-entity'
import { useStored } from '~/composables/useStored'

type Direction = 'encode' | 'decode'

const directionItems: { label: string; value: Direction }[] = [
  { label: '文本 → 实体', value: 'encode' },
  { label: '实体 → 文本', value: 'decode' }
]
const modeItems: { label: string; value: EntityMode }[] = [
  { label: 'HTML 文本', value: 'text' },
  { label: '属性值', value: 'attribute' }
]

const direction = useStored<Direction>('tool.html-entity.direction', 'encode')
const mode = useStored<EntityMode>('tool.html-entity.mode', 'text')
const nonAscii = useStored('tool.html-entity.nonAscii', false)
const source = useStored('tool.html-entity.source', '<a href="/a?x=1&y=2">它\'说「好」</a>')

const decoded = computed(() => decodeHtml(source.value))

const output = computed(() => {
  if (direction.value === 'decode') return decoded.value.text
  return nonAscii.value
    ? encodeEntities(source.value, mode.value)
    : escapeHtml(source.value, mode.value)
})

const stats = computed(() => ({
  structural: countStructural(source.value),
  nonAscii: countNonAscii(source.value),
  chars: [...source.value].length,
  replaced: direction.value === 'decode' ? decoded.value.count : (output.value.match(/&[^;]+;/g) ?? []).length
}))

/** 解码方向才有的两类问题：认不出的引用、被规范替换的越界码点 */
const unknown = computed(() => (direction.value === 'decode' ? decoded.value.unknown : []))
const warnings = computed(() => (direction.value === 'decode' ? decoded.value.warnings : []))

/** 全篇找不到裸 `<` `>`，却有成串的 `&xxx;` —— 大概率是已经编码过的文本 */
const alreadyEncoded = computed(
  () => direction.value === 'encode' && looksEncoded(source.value) && !/[<>]/.test(source.value)
)

const entityNames = computed(() => Object.keys(NAMED_ENTITIES).length)
const showTable = ref(false)
const tableRows = computed(() => (showTable.value ? Object.entries(NAMED_ENTITIES) : []))

function fill(sample: string) {
  source.value = sample
}
function swap() {
  direction.value = direction.value === 'encode' ? 'decode' : 'encode'
  if (direction.value === 'decode') source.value = output.value
}
function clearAll() {
  source.value = ''
}
</script>

<template>
  <ToolShell tool-id="html-entity">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">方向</span>
          <USelect v-model="direction" :items="directionItems" size="lg" class="w-40" aria-label="转换方向" />
        </label>

        <label v-if="direction === 'encode'" class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">转义范围</span>
          <USelect v-model="mode" :items="modeItems" size="lg" class="w-32" aria-label="转义范围" />
        </label>

        <label
          v-if="direction === 'encode'"
          class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3"
        >
          <USwitch v-model="nonAscii" size="sm" aria-label="非 ASCII 字符转数字引用" />
          <span class="text-sm text-muted">非 ASCII 转 <code class="font-mono text-xs">&#38;#x…;</code></span>
        </label>

        <div class="ms-auto flex items-center gap-2">
          <UButton
            icon="lucide:arrow-left-right"
            label="换成反方向"
            color="neutral"
            variant="ghost"
            @click="swap"
          />
          <UButton icon="lucide:eraser" label="清空" color="neutral" variant="ghost" @click="clearAll" />
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="sample in ENTITY_SAMPLES"
          :key="sample.label"
          :label="sample.label"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="fill(sample.value)"
        />
      </div>

      <UAlert
        v-if="alreadyEncoded"
        color="warning"
        variant="subtle"
        icon="lucide:triangle-alert"
        title="输入里已经存在实体"
        description="再编码一次会把 &amp; 变成 &amp;amp;，页面上就会看到字面量。若这是有意为之可以忽略。"
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="flex min-w-0 flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            {{ direction === 'encode' ? '原始文本' : '含实体的文本' }}
          </h2>
          <UTextarea
            v-model="source"
            :rows="10"
            spellcheck="false"
            :placeholder="direction === 'encode' ? '粘贴要转义的文本' : '粘贴 &amp;lt; 之类的实体文本'"
            :ui="{ base: 'font-mono text-xs leading-relaxed resize-y' }"
          />
        </section>

        <section class="flex min-w-0 flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-highlighted">
              {{ direction === 'encode' ? '实体结果（可直接贴进 HTML）' : '还原后的文本' }}
            </h2>
            <CopyButton :text="output" :disabled="!output" />
          </div>
          <textarea
            :value="output"
            readonly
            rows="10"
            spellcheck="false"
            class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="结果会出现在这里"
          />
        </section>
      </div>

      <div class="flex flex-wrap items-center gap-2" aria-label="统计信息">
        <UBadge :label="`${stats.chars} 字符`" color="neutral" variant="subtle" />
        <UBadge :label="`${stats.structural} 个结构字符`" color="neutral" variant="subtle" />
        <UBadge :label="`${stats.nonAscii} 个非 ASCII`" color="neutral" variant="subtle" />
        <UBadge
          :label="direction === 'encode' ? `输出 ${stats.replaced} 个实体` : `还原 ${stats.replaced} 个实体`"
          color="primary"
          variant="subtle"
        />
      </div>

      <section v-if="unknown.length" class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">这些引用无法识别（已原样保留）</h2>
        <ul class="flex flex-wrap gap-2">
          <li v-for="item in unknown" :key="item">
            <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs text-error">{{ item }}</code>
          </li>
        </ul>
        <p class="text-xs text-dimmed">
          本工具内置 {{ entityNames }} 个命名实体（Latin-1、常用标点与符号、希腊字母、数学符号）。
          HTML5 完整表有 2231 项，此处不做的原因是它会让首屏无关的产物白白变大。
        </p>
      </section>

      <section v-if="warnings.length" class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">按规范做了替换</h2>
        <ul class="flex flex-col gap-1">
          <li v-for="item in warnings" :key="item" class="text-xs leading-relaxed text-warning">
            {{ item }}
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <button
          type="button"
          class="flex items-center justify-between gap-2 text-sm font-medium text-highlighted"
          :aria-expanded="showTable"
          @click="showTable = !showTable"
        >
          <span>{{ showTable ? '收起' : '展开' }}命名实体对照表（{{ entityNames }} 项）</span>
          <UIcon :name="showTable ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-4" />
        </button>
        <div v-if="showTable" class="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          <div
            v-for="[name, ch] in tableRows"
            :key="name"
            class="flex items-baseline justify-between gap-2 border-b border-default py-1 text-xs"
          >
            <code class="font-mono text-muted">&amp;{{ name }};</code>
            <span class="text-default">{{ ch }}</span>
          </div>
        </div>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        编码方向默认只转
        <code class="rounded bg-elevated px-1 py-0.5">&amp; &lt; &gt;</code>（属性模式再加
        <code class="rounded bg-elevated px-1 py-0.5">&quot; '</code>），其余字符原样保留；打开「非 ASCII
        转数字引用」后中文与 emoji 会变成
        <code class="rounded bg-elevated px-1 py-0.5">&#38;#xNN;</code>，适合只能承载 ASCII
        的通道。编码与解码互为逆运算，随机文本往返已核验。解码按 HTML 规范处理数字引用：NUL、UTF-16
        代理区与超出 U+10FFFF 的码点一律替换为
        <code class="rounded bg-elevated px-1 py-0.5">U+FFFD</code>，并且支持
        <code class="rounded bg-elevated px-1 py-0.5">&amp;ampx</code>
        这类历史「不带分号」写法。注意：转义只防结构性破坏，不能替代输出编码策略——往 DOM 里插用户内容仍应走
        <code class="rounded bg-elevated px-1 py-0.5">textContent</code>。
      </p>
    </div>
  </ToolShell>
</template>
