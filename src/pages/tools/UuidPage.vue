<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { analyzeUuid, generateUuids } from '~/tools/uuid'
import { useStored } from '~/composables/useStored'

type Version = 'v4' | 'v7'

const versionItems: { label: string; value: Version }[] = [
  { label: 'v4 随机', value: 'v4' },
  { label: 'v7 时间有序', value: 'v7' }
]

const version = useStored<Version>('tool.uuid.version', 'v4')
const count = useStored('tool.uuid.count', 5)
const upper = useStored('tool.uuid.upper', false)
const hyphens = useStored('tool.uuid.hyphens', true)
const separator = useStored('tool.uuid.separator', '\n')

const list = ref<string[]>([])

const options = computed(() => ({
  version: version.value,
  count: count.value,
  upper: upper.value,
  hyphens: hyphens.value
}))

function regenerate() {
  list.value = generateUuids(options.value)
}

regenerate()

const joined = computed(() => list.value.join(separator.value || '\n'))
const countSafe = computed(() => Math.min(Math.max(Math.floor(Number(count.value)) || 1, 1), 1000))

const probe = ref('')
const analyzed = computed(() => (probe.value.trim() ? analyzeUuid(probe.value) : null))
</script>

<template>
  <ToolShell tool-id="uuid">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <USelect v-model="version" :items="versionItems" size="lg" class="w-40" aria-label="版本" />

        <label class="flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
          <span class="text-sm text-muted">数量</span>
          <input
            v-model.number="count"
            type="number"
            min="1"
            max="1000"
            class="w-16 border-0 bg-transparent p-0 font-mono text-sm text-default outline-none"
            aria-label="生成数量"
          />
        </label>

        <div class="flex h-11 items-center gap-3 rounded-lg border border-default bg-elevated px-3">
          <label class="inline-flex items-center gap-1.5 text-sm text-muted">
            <USwitch v-model="upper" size="sm" aria-label="大写" />
            大写
          </label>
          <label class="inline-flex items-center gap-1.5 text-sm text-muted">
            <USwitch v-model="hyphens" size="sm" aria-label="连字符" />
            连字符
          </label>
        </div>

        <UButton icon="lucide:refresh-cw" label="重新生成" color="primary" variant="solid" size="lg" @click="regenerate" />
      </div>

      <p class="text-xs text-dimmed">
        请求 {{ count }} 条，实际生成 {{ list.length }} 条（上限 1000）。v4 全随机；v7 前 48 位是毫秒时间戳，
        适合做可排序的主键。
      </p>

      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-muted">分隔符</span>
          <USelect
            v-model="separator"
            :items="[
              { label: '换行', value: '\n' },
              { label: '逗号', value: ',' },
              { label: '空格', value: ' ' },
              { label: '分号', value: ';' }
            ]"
            size="sm"
            class="w-28"
            aria-label="复制时的分隔符"
          />
          <CopyButton :text="joined" :label="`复制 ${list.length} 条`" size="xs" />
        </div>

        <ul class="flex flex-col overflow-hidden rounded-xl border border-default">
          <li
            v-for="(item, index) in list"
            :key="item"
            class="flex items-center gap-3 border-b border-default px-3 py-2 last:border-b-0 hover:bg-elevated"
          >
            <span class="w-8 shrink-0 text-xs text-dimmed">{{ index + 1 }}</span>
            <code class="min-w-0 flex-1 break-all font-mono text-sm text-default">{{ item }}</code>
            <CopyButton :text="item" label="" size="xs" />
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">UUID 解析</h2>
        <UInput
          v-model="probe"
          size="lg"
          placeholder="粘贴一个 UUID 查看版本与变体…"
          :ui="{ base: 'font-mono' }"
        />
        <p v-if="analyzed && !analyzed.ok" class="text-sm text-error">{{ analyzed.error }}</p>
        <dl v-else-if="analyzed" class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
          <div>
            <dt class="text-xs text-dimmed">版本</dt>
            <dd class="font-mono text-sm text-default">v{{ analyzed.version }}</dd>
          </div>
          <div>
            <dt class="text-xs text-dimmed">变体</dt>
            <dd class="font-mono text-sm text-default">{{ analyzed.variant }}</dd>
          </div>
          <div v-if="analyzed.timestamp !== undefined">
            <dt class="text-xs text-dimmed">v7 内嵌时间</dt>
            <dd class="break-all font-mono text-sm text-default">
              {{ new Date(analyzed.timestamp).toISOString() }}
            </dd>
          </div>
        </dl>
      </section>

      <p class="text-xs text-dimmed">
        随机源是 <code class="rounded bg-elevated px-1 py-0.5">crypto.getRandomValues</code>（密码学安全）。
        生成按钮：<code class="rounded bg-elevated px-1 py-0.5">{{ countSafe }}</code> 条为一次请求，页面不会把结果发往任何服务端。
      </p>
    </div>
  </ToolShell>
</template>
