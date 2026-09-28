<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  buildQuery,
  decodeComponent,
  decodeUri,
  encodeComponent,
  encodeStrict,
  encodeUri,
  parseUrl,
  percentDecodedCount
} from '~/tools/url'
import { useStored } from '~/composables/useStored'

const text = useStored('tool.url.text', 'a b&c=中文/路径?x=1')
const address = useStored('tool.url.address', 'https://example.com:8443/search?q=工具箱&sort=time#result-2')

const transforms = computed(() =>
  [
    { label: 'encodeURIComponent', hint: '保留 A-Z a-z 0-9 - _ . ! ~ * \' ( )', r: encodeComponent(text.value) },
    { label: 'encodeURI', hint: '不转义 : / ? # [ ] @ & = + $ ,', r: encodeUri(text.value) },
    { label: '严格编码', hint: '连 ! \' ( ) * 也转义', r: encodeStrict(text.value) },
    { label: 'decodeURIComponent', hint: '百分号序列不合法时会报错', r: decodeComponent(text.value) },
    { label: 'decodeURI', hint: '保留保留字的解码', r: decodeUri(text.value) }
  ].map((item) => ({ key: item.label, hint: item.hint, ...item.r }))
)

const parsed = computed(() => parseUrl(address.value))

const parts = computed(() => {
  if (!parsed.value.ok) return []
  const { protocol, host, hostname, port, pathname, search, hash, origin } = parsed.value.parts
  return [
    { label: '协议 protocol', value: protocol },
    { label: '主机 host（含端口）', value: host },
    { label: '域名 hostname', value: hostname },
    { label: '端口 port', value: port || '（默认）' },
    { label: '路径 pathname', value: pathname },
    { label: '查询 search', value: search || '（无）' },
    { label: '哈希 hash', value: hash || '（无）' },
    { label: '源 origin', value: origin }
  ]
})

const params = computed(() => (parsed.value.ok ? parsed.value.parts.params : []))
const rebuilt = computed(() => {
  if (!parsed.value.ok) return ''
  const { origin, pathname, hash } = parsed.value.parts
  return `${origin}${pathname}${buildQuery(params.value)}${hash}`
})

const decodedHits = computed(() => percentDecodedCount(text.value))
</script>

<template>
  <ToolShell tool-id="url">
    <div class="flex flex-col gap-6">
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium text-highlighted">百分号编码 / 解码</h2>
        <UInput
          v-model="text"
          size="lg"
          placeholder="输入要编解码的片段…"
          :ui="{ base: 'font-mono text-sm' }"
        />
        <p class="text-xs text-dimmed">
          当前文本里有 {{ decodedHits }} 个 <code class="rounded bg-elevated px-1 py-0.5">%XX</code> 序列。
        </p>

        <div class="flex flex-col overflow-hidden rounded-xl border border-default">
          <div
            v-for="item in transforms"
            :key="item.key"
            class="flex flex-col gap-2 border-b border-default p-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
          >
            <div class="w-full shrink-0 sm:w-48">
              <p class="font-mono text-xs text-highlighted">{{ item.key }}</p>
              <p class="text-xs text-dimmed">{{ item.hint }}</p>
            </div>
            <p
              class="min-w-0 flex-1 break-all font-mono text-xs"
              :class="item.ok ? 'text-default' : 'text-error'"
            >
              {{ item.ok ? item.text || '（空）' : item.error }}
            </p>
            <CopyButton :text="item.ok ? item.text : ''" :disabled="!item.ok || !item.text" size="xs" />
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium text-highlighted">URL 解析</h2>
        <UInput
          v-model="address"
          size="lg"
          placeholder="https://example.com/path?a=1#frag"
          :ui="{ base: 'font-mono text-sm' }"
        />

        <UAlert
          v-if="!parsed.ok"
          color="error"
          variant="subtle"
          icon="lucide:circle-alert"
          title="解析失败"
          :description="parsed.error"
        />

        <template v-else>
          <dl class="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-default p-3 sm:grid-cols-2">
            <div v-for="part in parts" :key="part.label" class="flex min-w-0 flex-col">
              <dt class="text-xs text-dimmed">{{ part.label }}</dt>
              <dd class="break-all font-mono text-sm text-default">{{ part.value }}</dd>
            </div>
          </dl>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-medium text-highlighted">查询参数（{{ params.length }}）</h3>
              <CopyButton :text="rebuilt" label="复制重建结果" size="xs" />
            </div>
            <ul v-if="params.length" class="flex flex-col overflow-hidden rounded-xl border border-default">
              <li
                v-for="(param, index) in params"
                :key="`${param.key}-${index}`"
                class="flex items-center gap-3 border-b border-default px-3 py-2 last:border-b-0"
              >
                <span class="w-2 shrink-0 text-xs text-dimmed">{{ index + 1 }}</span>
                <span class="min-w-0 flex-1 break-all font-mono text-sm text-default">
                  <span class="text-primary">{{ param.key }}</span>
                  <span class="text-dimmed">=</span>{{ param.value }}
                </span>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">这个 URL 没有查询参数。</p>
            <p class="text-xs text-dimmed">
              重建结果按
              <code class="rounded bg-elevated px-1 py-0.5">URLSearchParams</code>
              规范化（键值重新编码、保持原顺序），可与原串对照找出差异。
            </p>
          </div>
        </template>
      </section>
    </div>
  </ToolShell>
</template>
