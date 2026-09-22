<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UInput v-model="query" size="lg" placeholder="搜索状态码 / 英文名 / 中文说明，如 404、timeout、超时" class="w-full" icon="i-lucide-search" />
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="c in classes"
          :key="c.value"
          :label="c.label"
          size="sm"
          :color="activeClass === c.value ? 'primary' : 'neutral'"
          :variant="activeClass === c.value ? 'subtle' : 'outline'"
          @click="activeClass = c.value"
        />
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5">
      <p v-if="!list.length" class="text-sm text-slate-400">没有匹配的状态码。</p>
      <div v-else class="space-y-3">
        <div v-for="e in list" :key="e.code" class="flex items-start gap-3 rounded-lg border border-slate-200/60 p-3 dark:border-white/10">
          <span class="shrink-0 rounded-md px-2 py-0.5 font-mono text-sm font-semibold" :class="badgeClass(e.code)">{{ e.code }}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ e.name }} · {{ e.zh }}</p>
            <p class="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ e.desc }}</p>
          </div>
        </div>
      </div>
      <p class="mt-4 text-xs text-slate-400">共 {{ list.length }} 条，收录常见状态码（RFC 9110 及扩展）。</p>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { filterByClass, filterStatuses } from '~/utils/http-status'


const classes = [
  { label: '全部', value: 0 },
  { label: '1xx 信息', value: 1 },
  { label: '2xx 成功', value: 2 },
  { label: '3xx 重定向', value: 3 },
  { label: '4xx 客户端错误', value: 4 },
  { label: '5xx 服务器错误', value: 5 }
]

const query = ref('')
const activeClass = ref(0)

const list = computed(() => filterByClass(filterStatuses(query.value), activeClass.value))

function badgeClass(code: number) {
  const c = Math.floor(code / 100)
  if (c === 2) return 'bg-green-500/15 text-green-700 dark:text-green-300'
  if (c === 3) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
  if (c === 4) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  if (c === 5) return 'bg-red-500/15 text-red-700 dark:text-red-300'
  return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
}
</script>
