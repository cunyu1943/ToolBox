<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  buildPattern,
  countGroups,
  FIND_SAMPLES,
  findAll,
  replaceAll,
  type ReplaceResult
} from '~/tools/find-replace'
import { useStored } from '~/composables/useStored'

const text = useStored('tool.find-replace.text', FIND_SAMPLES[0]!.text)
const search = useStored('tool.find-replace.search', FIND_SAMPLES[0]!.search)
const replace = useStored('tool.find-replace.replace', FIND_SAMPLES[0]!.replace)
const caseSensitive = useStored('tool.find-replace.case', false)
const useRegex = useStored('tool.find-replace.regex', false)
const wholeWord = useStored('tool.find-replace.whole', false)

const options = computed(() => ({
  search: search.value,
  replace: replace.value,
  caseSensitive: caseSensitive.value,
  useRegex: useRegex.value,
  wholeWord: wholeWord.value
}))

const pattern = computed(() => (search.value ? buildPattern(options.value) : undefined))
const groups = computed(() => (useRegex.value ? countGroups(search.value) : 0))
const scanned = computed<ReplaceResult>(() => findAll(text.value, options.value))
const done = computed<ReplaceResult>(() => replaceAll(text.value, options.value))

const active = computed(() => (search.value.trim() ? scanned.value : undefined))
const error = computed(() => active.value?.error)
const hits = computed(() => active.value?.matches ?? [])
const count = computed(() => active.value?.count ?? 0)
const isEmpty = computed(() => !text.value.trim())

const flags = computed(() => {
  const built = pattern.value?.flags ?? ''
  return built ? `/${pattern.value?.source}/${built}` : ''
})

function applySample(sample: (typeof FIND_SAMPLES)[number]): void {
  text.value = sample.text
  search.value = sample.search
  replace.value = sample.replace
  useRegex.value = sample.useRegex
}
</script>

<template>
  <ToolShell tool-id="find-replace">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-3 rounded-xl border border-default p-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <UFormField label="查找" class="min-w-0 flex-1">
            <UInput
              v-model="search"
              :icon="useRegex ? 'lucide:square-function' : 'lucide:text'"
              :placeholder="useRegex ? '\\b\\w+@\\w+\\.com\\b' : '要查找的文字'"
              :ui="{ base: 'font-mono text-sm' }"
            />
          </UFormField>
          <UFormField label="替换为" class="min-w-0 flex-1">
            <UInput
              v-model="replace"
              icon="lucide:arrow-right"
              :placeholder="useRegex ? '支持 $1、$& 反向引用' : '替换文字，留空即删除'"
              :ui="{ base: 'font-mono text-sm' }"
            />
          </UFormField>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <UCheckbox v-model="useRegex" label="正则模式" size="sm" />
          <UCheckbox v-model="caseSensitive" label="区分大小写" size="sm" />
          <UCheckbox v-model="wholeWord" label="全字匹配" size="sm" />
          <span v-if="flags" class="font-mono text-xs text-dimmed">{{ flags }}</span>
          <span v-if="groups" class="text-xs text-dimmed">{{ groups }} 个捕获组</span>
        </div>
        <p v-if="error" class="text-xs text-error">{{ error }}</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in FIND_SAMPLES"
            :key="sample.label"
            :label="sample.label"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="applySample(sample)"
          />
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <label for="fr-input" class="text-sm font-medium text-highlighted">原文</label>
            <UButton
              icon="lucide:eraser"
              label="清空"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="text = ''"
            />
          </div>
          <UTextarea
            id="fr-input"
            v-model="text"
            :rows="12"
            :ui="{ base: 'font-mono text-sm' }"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-highlighted">
              结果
              <UBadge
                v-if="!error && search"
                :label="`命中 ${count} 处`"
                :color="count ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </span>
            <div class="flex items-center gap-2">
              <UButton
                icon="lucide:arrow-down-to-line"
                label="覆盖原文"
                size="xs"
                color="neutral"
                variant="ghost"
                :disabled="!done.ok || done.value === text"
                @click="text = done.value"
              />
              <CopyButton :text="done.value" :disabled="isEmpty" label="复制结果" size="xs" />
            </div>
          </div>
          <pre
            class="max-h-[26rem] overflow-auto rounded-xl border border-default bg-elevated px-3 py-2 font-mono text-xs text-default"
          >{{ error ? '（正则有误，未生成结果）' : done.value }}</pre>
          <ul v-if="done.notes.length" class="flex flex-col gap-1 text-xs text-muted">
            <li v-for="note in done.notes" :key="note">· {{ note }}</li>
          </ul>
        </div>
      </section>

      <section v-if="hits.length" class="flex flex-col gap-2">
        <span class="text-sm font-medium text-highlighted">命中位置</span>
        <div class="max-h-64 overflow-auto rounded-xl border border-default">
          <table class="w-full text-xs">
            <caption class="sr-only">
              命中行的行号、列号与捕获组
            </caption>
            <thead class="sticky top-0 bg-elevated text-left text-muted">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">行</th>
                <th scope="col" class="px-3 py-2 font-medium">列</th>
                <th scope="col" class="px-3 py-2 font-medium">命中内容</th>
                <th v-if="groups" scope="col" class="px-3 py-2 font-medium">捕获组</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(hit, index) in hits" :key="`${hit.index}-${index}`" class="border-t border-default">
                <td class="px-3 py-1.5 tabular-nums text-muted">{{ hit.line }}</td>
                <td class="px-3 py-1.5 tabular-nums text-muted">{{ hit.column }}</td>
                <td class="px-3 py-1.5 font-mono break-all">{{ hit.text }}</td>
                <td v-if="groups" class="px-3 py-1.5 font-mono break-all">
                  {{ hit.groups.map((group, g) => `$${g + 1}=${group ?? '∅'}`).join(' ') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="active && active.more" class="text-xs text-dimmed">
          命中较多，只列出前 {{ hits.length }} 条（另有 {{ active.more }} 条未列出），替换仍覆盖全部。
        </p>
      </section>

      <p class="text-xs text-dimmed">
        全字匹配用 Unicode 字母/数字判断词边界，所以「用户ID是 12」里的 <code class="font-mono">ID</code> 也能被整词命中；
        正则模式里 <code class="font-mono">$1</code>、<code class="font-mono">$&</code> 是反向引用，要输出字面 <code class="font-mono">$</code> 写 <code class="font-mono">$$</code>。
      </p>
    </div>
  </ToolShell>
</template>
