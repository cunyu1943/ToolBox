<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  extensionsOfType, findStatus, HTTP_METHODS, HTTP_STATUS, MIME_TYPES,
  mimeOfExtension, parseContentType, POPULAR_STATUS_CODES, searchStatus,
  STATUS_CLASSES, statusClass, type StatusClass
} from '~/tools/http-status'
import { useStored } from '~/composables/useStored'

type Filter = 'all' | StatusClass

const filterItems: { label: string; value: Filter }[] = [
  { label: '全部类别', value: 'all' },
  ...STATUS_CLASSES.map((item) => ({ label: `${item.label} ${item.range}`, value: item.id as Filter }))
]

const classColor: Record<StatusClass, 'neutral' | 'success' | 'primary' | 'warning' | 'error'> = {
  info: 'neutral',
  success: 'success',
  redirect: 'primary',
  client: 'warning',
  server: 'error'
}

const query = useStored('tool.http-status.query', '')
const filter = useStored<Filter>('tool.http-status.filter', 'all')
const selected = useStored('tool.http-status.selected', 200)
const mimeQuery = useStored('tool.http-status.mime', '')
const header = useStored('tool.http-status.header', 'text/html; charset="utf-8"')

const detail = computed(() => findStatus(selected.value))

const results = computed(() => {
  const list = searchStatus(query.value)
  if (filter.value === 'all') return list
  return list.filter((entry) => statusClass(entry.code) === filter.value)
})

const classMeta = computed(() => STATUS_CLASSES.find((item) => item.id === statusClass(selected.value)))

/** 表是静态数据，逐类计数只需在表变化时算一次 */
const classCounts = computed(() =>
  STATUS_CLASSES.map((item) => ({
    ...item,
    count: HTTP_STATUS.filter((entry) => statusClass(entry.code) === item.id).length
  }))
)

const mimeHits = computed(() => {
  const want = mimeQuery.value.trim().toLowerCase()
  if (!want) return MIME_TYPES
  return MIME_TYPES.filter(
    (entry) => entry.ext === want || entry.ext === `.${want}` || entry.type.includes(want) || entry.note.includes(want)
  )
})
const mimeExact = computed(() => [...mimeOfExtension(mimeQuery.value), ...extensionsOfType(mimeQuery.value)].length)

const parsedHeader = computed(() => parseContentType(header.value))
const headerExts = computed(() =>
  parsedHeader.value.ok ? extensionsOfType(`${parsedHeader.value.type}/${parsedHeader.value.subtype}`) : []
)
const paramEntries = computed(() => Object.entries(parsedHeader.value.params))

const showMethods = ref(true)
const showMimeTable = ref(false)

function pick(code: number) {
  selected.value = code
}

const codeFamily = (code: number) => `${Math.floor(code / 100)}xx`
</script>

<template>
  <ToolShell tool-id="http-status">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="flex flex-wrap items-end gap-3">
          <label class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="text-sm text-muted">查状态码（数字、中文名、英文、说明、出处都能搜）</span>
            <UInput
              v-model="query"
              icon="lucide:search"
              placeholder="429 / 限流 / Gateway"
              size="lg"
              class="w-full"
              aria-label="状态码查询"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-sm text-muted">类别</span>
            <USelect v-model="filter" :items="filterItems" size="lg" class="w-40" aria-label="按类别筛选" />
          </label>
          <UButton
            icon="lucide:eraser"
            label="清空"
            color="neutral"
            variant="ghost"
            size="lg"
            @click="query = ''"
          />
        </div>

        <div class="flex flex-wrap gap-1.5">
          <UButton
            v-for="code in POPULAR_STATUS_CODES"
            :key="code"
            :label="String(code)"
            :color="selected === code ? 'primary' : 'neutral'"
            :variant="selected === code ? 'soft' : 'subtle'"
            size="xs"
            @click="pick(code)"
          />
        </div>

        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="item in classCounts"
            :key="item.id"
            :label="`${item.label} ${item.count}`"
            color="neutral"
            variant="subtle"
          />
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section class="flex min-w-0 flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            结果 <span class="text-dimmed">{{ results.length }} / {{ HTTP_STATUS.length }}</span>
          </h2>
          <ul class="flex max-h-[28rem] flex-col divide-y divide-default overflow-y-auto rounded-xl border border-default">
            <li v-for="entry in results" :key="entry.code">
              <button
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-elevated"
                :class="entry.code === selected ? 'bg-primary/10' : ''"
                @click="pick(entry.code)"
              >
                <code class="w-12 shrink-0 font-mono text-sm font-semibold tabular-nums text-highlighted">
                  {{ entry.code }}
                </code>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm text-default">{{ entry.zh }}</span>
                  <span class="block truncate text-xs text-dimmed">{{ entry.en }}</span>
                </span>
                <UBadge :label="codeFamily(entry.code)" :color="classColor[statusClass(entry.code)]" variant="soft" size="sm" />
              </button>
            </li>
            <li v-if="!results.length" class="px-3 py-6 text-center text-sm text-dimmed">
              没有匹配的状态码，换个关键词或清空类别筛选。
            </li>
          </ul>
        </section>

        <section v-if="detail" class="flex min-w-0 flex-col gap-3 rounded-xl border border-default p-4">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-mono text-3xl leading-none font-semibold text-highlighted">{{ detail.code }}</h2>
            <UBadge
              v-if="classMeta"
              :label="`${classMeta.label} ${classMeta.range}`"
              :color="classColor[classMeta.id]"
              variant="soft"
            />
            <CopyButton
              :text="`${detail.code} ${detail.zh} / ${detail.en}\n${detail.summary}\n${detail.detail}\n出处：${detail.spec}`"
              label="复制该条"
            />
          </div>
          <p class="text-sm text-default">{{ detail.en }}</p>
          <p class="text-sm leading-relaxed text-muted">{{ detail.summary }}</p>
          <p class="text-sm leading-relaxed text-default">{{ detail.detail }}</p>
          <div class="flex flex-wrap items-center gap-2 border-t border-default pt-3">
            <UBadge :label="detail.spec" color="neutral" variant="subtle" icon="lucide:file-text" />
            <span v-if="classMeta" class="text-xs text-dimmed">{{ classMeta.desc }}</span>
          </div>
        </section>
      </div>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <button
          type="button"
          class="flex items-center justify-between gap-2 text-sm font-medium text-highlighted"
          :aria-expanded="showMethods"
          @click="showMethods = !showMethods"
        >
          <span>请求方法一览（{{ HTTP_METHODS.length }} 个）</span>
          <UIcon :name="showMethods ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-4" />
        </button>
        <div v-if="showMethods" class="overflow-x-auto">
          <table class="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr class="border-b border-default text-xs text-dimmed">
                <th scope="col" class="py-1.5 pe-3 text-start font-medium">方法</th>
                <th scope="col" class="py-1.5 pe-3 text-start font-medium">安全</th>
                <th scope="col" class="py-1.5 pe-3 text-start font-medium">幂等</th>
                <th scope="col" class="py-1.5 pe-3 text-start font-medium">请求体</th>
                <th scope="col" class="py-1.5 text-start font-medium">说明</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in HTTP_METHODS" :key="item.name" class="border-b border-default last:border-b-0 align-top">
                <td class="py-1.5 pe-3 font-mono text-default">{{ item.name }}</td>
                <td class="py-1.5 pe-3">
                  <UBadge :label="item.safe ? 'safe' : '—'" :color="item.safe ? 'success' : 'neutral'" variant="subtle" size="sm" />
                </td>
                <td class="py-1.5 pe-3">
                  <UBadge
                    :label="item.idempotent ? '幂等' : '—'"
                    :color="item.idempotent ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                  />
                </td>
                <td class="py-1.5 pe-3 font-mono text-xs text-dimmed">{{ item.requestBody ? '有' : '无' }}</td>
                <td class="py-1.5 text-xs leading-relaxed text-muted">{{ item.summary }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs leading-relaxed text-dimmed">
          「安全」指不会改变服务器状态，因此可以预取；「幂等」指重复执行效果相同，因此可以安全重试。
          两个概念互相独立：<code class="rounded bg-elevated px-1 py-0.5">DELETE</code> 不安全但幂等，
          <code class="rounded bg-elevated px-1 py-0.5">POST</code> 两者都不是。
        </p>
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="flex min-w-0 flex-col gap-3 rounded-xl border border-default p-4">
          <h2 class="text-sm font-medium text-highlighted">扩展名 ↔ 媒体类型</h2>
          <UInput
            v-model="mimeQuery"
            icon="lucide:search"
            placeholder="png / image/png / svg"
            class="w-full"
            aria-label="媒体类型查询"
          />
          <p v-if="mimeExact" class="text-xs leading-relaxed text-primary">
            命中 {{ mimeExact }} 条精确对应（扩展名或类型完全相同）。
          </p>
          <ul class="flex max-h-72 flex-col divide-y divide-default overflow-y-auto rounded-lg border border-default">
            <li v-for="(item, index) in mimeHits" :key="`${item.ext}-${item.type}-${index}`" class="flex flex-col gap-0.5 px-3 py-1.5">
              <div class="flex items-center gap-2">
                <code class="w-20 shrink-0 font-mono text-xs text-muted">{{ item.ext || '（无扩展名）' }}</code>
                <code class="min-w-0 flex-1 truncate font-mono text-xs text-default">{{ item.type }}</code>
              </div>
              <p class="text-xs leading-relaxed text-dimmed">{{ item.note }}</p>
            </li>
            <li v-if="!mimeHits.length" class="px-3 py-4 text-center text-sm text-dimmed">
              表内没有该类型，换个写法（不带点、或只写子类型）再试。
            </li>
          </ul>
          <p class="text-xs leading-relaxed text-dimmed">
            这份表只收常见项。浏览器实际看的是 <code class="rounded bg-elevated px-1 py-0.5">Content-Type</code>
            与嗅探策略，文件名后缀本身不参与判断。
          </p>
        </section>

        <section class="flex min-w-0 flex-col gap-3 rounded-xl border border-default p-4">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-highlighted">Content-Type 解析</h2>
            <CopyButton
              :text="header"
              :disabled="!parsedHeader.ok"
              label="复制头"
              size="xs"
            />
          </div>
          <UInput
            v-model="header"
            placeholder="text/html; charset=utf-8"
            class="w-full font-mono text-xs"
            aria-label="Content-Type 头的值"
          />
          <UAlert
            v-if="!parsedHeader.ok"
            color="error"
            variant="subtle"
            icon="lucide:circle-alert"
            title="不符合参数语法"
            :description="parsedHeader.error"
          />
          <template v-else>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :label="`${parsedHeader.type}/${parsedHeader.subtype}`" color="primary" variant="soft" />
              <UBadge v-if="headerExts.length" :label="`常见扩展名 ${headerExts.join(' ')}`" color="neutral" variant="subtle" />
              <UBadge v-else label="表中无对应扩展名" color="neutral" variant="subtle" />
            </div>
            <dl v-if="paramEntries.length" class="flex flex-col divide-y divide-default overflow-hidden rounded-lg border border-default">
              <div v-for="[name, value] in paramEntries" :key="name" class="flex items-baseline gap-3 px-3 py-1.5">
                <dt class="w-28 shrink-0 font-mono text-xs text-muted">{{ name }}</dt>
                <dd class="min-w-0 flex-1 font-mono text-xs text-default">{{ value }}</dd>
              </div>
            </dl>
            <p v-else class="text-sm text-dimmed">该头不带参数。</p>
          </template>
          <ul v-if="parsedHeader.notes.length" class="flex flex-col gap-1">
            <li v-for="note in parsedHeader.notes" :key="note" class="text-xs leading-relaxed text-warning">
              {{ note }}
            </li>
          </ul>
          <p class="text-xs leading-relaxed text-dimmed">
            参数按 RFC 9110 的 token / quoted-string 语法手工扫描，因此引号内的
            <code class="rounded bg-elevated px-1 py-0.5">;</code> 与反斜杠转义不会被误当成边界；
            参数名大小写不敏感，已统一转小写。
          </p>
        </section>
      </div>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <button
          type="button"
          class="flex items-center justify-between gap-2 text-sm font-medium text-highlighted"
          :aria-expanded="showMimeTable"
          @click="showMimeTable = !showMimeTable"
        >
          <span>{{ showMimeTable ? '收起' : '展开' }}完整媒体类型表（{{ MIME_TYPES.length }} 条）</span>
          <UIcon :name="showMimeTable ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-4" />
        </button>
        <div v-if="showMimeTable" class="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(item, index) in MIME_TYPES"
            :key="`all-${item.ext}-${item.type}-${index}`"
            class="flex items-baseline justify-between gap-2 border-b border-default py-1 text-xs"
          >
            <code class="shrink-0 font-mono text-muted">{{ item.ext || '—' }}</code>
            <code class="min-w-0 truncate font-mono text-default">{{ item.type }}</code>
          </div>
        </div>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        状态码表以 RFC 9110 §15 为主线，另收 WebDAV（RFC 4918/5842）、RFC 2324 的茶壶码与
        nginx/IIS 的约定俗成扩展（<code class="rounded bg-elevated px-1 py-0.5">444</code>
        <code class="rounded bg-elevated px-1 py-0.5">499</code>
        <code class="rounded bg-elevated px-1 py-0.5">599</code>），后者已在出处里标明「非标准」，
        不要写进对外接口契约。判读线上问题时先分「4xx 是自己的请求有问题、5xx 是服务端有问题」，
        再看 <code class="rounded bg-elevated px-1 py-0.5">429</code> 的
        <code class="rounded bg-elevated px-1 py-0.5">Retry-After</code> 与
        <code class="rounded bg-elevated px-1 py-0.5">502/504</code> 的 upstream 日志。
      </p>
    </div>
  </ToolShell>
</template>
