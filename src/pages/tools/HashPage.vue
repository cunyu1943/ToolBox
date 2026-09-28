<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { bitLengthOf, digestAll, type DigestResult } from '~/tools/hash'
import { useStored } from '~/composables/useStored'

const source = useStored('tool.hash.input', 'abc')
const grouped = useStored('tool.hash.grouped', false)
const results = ref<DigestResult[]>([])
const pending = ref(false)
let token = 0

watch(
  [source, grouped],
  async () => {
    const current = ++token
    pending.value = true
    const next = await digestAll(source.value)
    if (current === token) {
      results.value = next
      pending.value = false
    }
  },
  { immediate: true }
)

const allHex = computed(() =>
  results.value.map((item) => `${item.algorithm.toLowerCase()}:${item.hex}`).join('\n')
)

const lengthOf = (item: DigestResult): string =>
  item.ok ? `${bitLengthOf(item.algorithm)} bit · ${item.hex.length} 字符` : '—'

const byteLength = computed(() => new TextEncoder().encode(source.value).length)
</script>

<template>
  <ToolShell tool-id="hash">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label for="hash-input" class="text-sm font-medium text-highlighted">待摘要内容</label>
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
          id="hash-input"
          v-model="source"
          :rows="6"
          placeholder="输入任意文本，摘要在本地计算…"
          :ui="{ base: 'font-mono text-sm' }"
        />
        <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
          <label class="inline-flex items-center gap-2">
            <UCheckbox v-model="grouped" aria-label="按 8 位分组显示" />
            按 8 位分组显示（便于人工比对）
          </label>
          <span>UTF-8 字节数：{{ byteLength }}</span>
          <span v-if="pending" class="text-dimmed">计算中…</span>
        </div>
      </section>

      <section class="flex flex-col overflow-hidden rounded-xl border border-default">
        <div
          v-for="item in results"
          :key="item.algorithm"
          class="flex flex-col gap-2 border-b border-default p-3 last:border-b-0 lg:flex-row lg:items-center lg:gap-4"
        >
          <div class="w-full shrink-0 lg:w-32">
            <p class="font-mono text-sm text-highlighted">{{ item.algorithm }}</p>
            <p class="text-xs text-dimmed">{{ lengthOf(item) }}</p>
          </div>
          <code
            class="min-w-0 flex-1 break-all font-mono text-xs"
            :class="item.ok ? 'text-default' : 'text-error'"
          >
            {{
              item.ok
                ? grouped
                  ? item.hex.replace(/(.{8})(?=.)/g, '$1 ')
                  : item.hex
                : item.error
            }}
          </code>
          <div class="flex gap-2">
            <CopyButton :text="item.hex" :disabled="!item.ok" size="xs" />
          </div>
        </div>
      </section>

      <div class="flex flex-wrap items-center gap-2">
        <CopyButton :text="allHex" label="复制全部（每行一条）" size="sm" />
        <span class="text-xs text-dimmed">
          校验例：<code class="rounded bg-elevated px-1 py-0.5">abc</code> 的 MD5 应为
          <code class="rounded bg-elevated px-1 py-0.5">900150983cd24fb0d6963f7d28e17f72</code>。
        </span>
      </div>

      <p class="text-xs text-dimmed">
        SHA 系列来自浏览器内置的
        <code class="rounded bg-elevated px-1 py-0.5">crypto.subtle</code>（需 HTTPS 或 localhost 等安全上下文）；
        MD5 由本仓库自带实现提供。摘要不可逆，但短口令可被穷举，请勿把它当加密。
      </p>
    </div>
  </ToolShell>
</template>
