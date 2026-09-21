<template>
  <nav class="space-y-4 text-sm">
    <div v-for="group in groups" :key="group.name">
      <p class="mb-1 px-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
        {{ group.name }} · {{ group.items.length }}
      </p>
      <NuxtLink
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
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { categories, tools } from '~/utils/tools'

const route = useRoute()

const groups = categories
  .map((name) => ({ name, items: tools.filter((t) => t.category === name) }))
  .filter((g) => g.items.length > 0)
</script>
