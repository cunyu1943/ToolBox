<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UInput v-model="query" size="lg" placeholder="搜索：码号（65）、0x41、字符（A）、名称（NUL/Tab）或中文（换行）" class="w-full" icon="i-lucide-search" />
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="k in kinds"
          :key="k.value"
          :label="k.label"
          size="sm"
          :color="activeKind === k.value ? 'primary' : 'neutral'"
          :variant="activeKind === k.value ? 'subtle' : 'outline'"
          @click="activeKind = k.value"
        />
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5">
      <p v-if="!list.length" class="text-sm text-slate-400">没有匹配的码位。</p>
      <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <div
          v-for="e in list"
          :key="e.code"
          class="cursor-pointer rounded-lg border p-2 text-center transition-colors hover:border-vue-500"
          :class="e.kind === 'control' ? 'border-amber-300/50 bg-amber-500/5 dark:border-amber-400/20' : 'border-slate-200/60 dark:border-white/10'"
          @click="selected = e"
        >
          <p class="font-mono text-lg leading-6">{{ e.char || '·' }}</p>
          <p class="text-[10px] text-slate-400">{{ e.code }} / 0x{{ e.code.toString(16).padStart(2, '0').toUpperCase() }}</p>
          <p class="truncate text-[10px] text-slate-500 dark:text-slate-400">{{ e.name }}</p>
        </div>
      </div>
      <p class="mt-4 text-xs text-slate-400">共 {{ list.length }} 项。黄色为控制字符（不可打印），点击任一项查看详情。</p>
    </GlassCard>

    <GlassCard v-if="selected" custom-class="p-5 space-y-1">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">详情</h2>
      <p class="text-sm">
        十进制 <b class="font-mono">{{ selected.code }}</b> ·
        十六进制 <b class="font-mono">0x{{ selected.code.toString(16).padStart(2, '0') }}</b> ·
        八进制 <b class="font-mono">0{{ selected.code.toString(8) }}</b> ·
        名称 <b>{{ selected.name }}</b>（{{ selected.zh }}）
      </p>
      <p v-if="selected.char" class="text-sm text-slate-500 dark:text-slate-400">
        在 JS 中可写为 <code class="font-mono">'\u{{ selected.code.toString(16).padStart(4, '0') }}'</code>，
        HTML 实体 <code class="font-mono">&amp;#{{ selected.code }};</code>
      </p>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import type { AsciiEntry } from '~/utils/ascii-table'
import { searchAscii } from '~/utils/ascii-table'

definePageMeta({ layout: 'tool' })

const kinds = [
  { label: '全部', value: '' },
  { label: '控制字符', value: 'control' },
  { label: '可打印', value: 'printable' },
  { label: '空格', value: 'space' }
]

const query = ref('')
const activeKind = ref('')
const selected = ref<AsciiEntry | null>(null)

const list = computed(() => searchAscii(query.value).filter((e) => !activeKind.value || e.kind === activeKind.value))
</script>
