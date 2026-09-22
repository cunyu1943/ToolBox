<template>
  <nav class="space-y-3 text-sm">
    <div v-for="group in groups" :key="group.name">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800"
        :aria-expanded="!collapsed.has(group.name)"
        @click="toggle(group.name)"
      >
        <span>{{ group.name }} · {{ group.items.length }}</span>
        <UIcon
          name="i-lucide-chevron-down"
          class="h-3.5 w-3.5 shrink-0 transition-transform"
          :class="collapsed.has(group.name) ? '-rotate-90' : ''"
        />
      </button>
      <div v-show="!collapsed.has(group.name)" class="space-y-0.5">
        <RouterLink
          v-for="tool in group.items"
          :key="tool.key"
          :to="tool.route"
          class="block truncate rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          :class="
            route.matched.some((m) => m.path === tool.route)
              ? 'bg-vue-500/10 font-medium text-vue-600 dark:text-vue-300'
              : ''
          "
        >
          {{ tool.name }}
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { categories, tools } from '~/utils/tools'

const route = useRoute()

const groups = categories
  .map((name) => ({ name, items: tools.filter((t) => t.category === name) }))
  .filter((g) => g.items.length > 0)

const collapsed = ref<Set<string>>(new Set())

function toggle(name: string) {
  const next = new Set(collapsed.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  collapsed.value = next
}

// 每次导航后若目标工具所在分组被折叠，自动展开，避免当前项不可见（同分组内跳转也生效）
watch(
  () => route.fullPath,
  () => {
    const name = groups.find((g) =>
      g.items.some((t) => route.matched.some((m) => m.path === t.route))
    )?.name
    if (!name) return
    const next = new Set(collapsed.value)
    if (next.delete(name)) collapsed.value = next
  }
)
</script>
