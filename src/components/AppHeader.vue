<script setup lang="ts">
import { ref } from 'vue'
import AppThemeToggle from './AppThemeToggle.vue'
import { toolCategories, toolsOfCategory, type CategoryId } from '~/tools/registry'
import { usePalette } from '~/composables/usePalette'

const navOpen = ref(false)
const { show: showPalette } = usePalette()
const countOf = (id: CategoryId): number => toolsOfCategory(id).length
</script>

<template>
  <header class="glass sticky top-0 z-30 border-b border-default">
    <div class="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
      <button
        type="button"
        class="-ms-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-default sm:hidden"
        aria-label="打开工具分类"
        aria-haspopup="dialog"
        :aria-expanded="navOpen"
        @click="navOpen = true"
      >
        <UIcon name="lucide:menu" class="size-5" />
      </button>

      <RouterLink to="/" class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md">
        <UIcon name="lucide:toolbox" class="size-6 shrink-0 text-primary" />
        <span class="text-base font-semibold tracking-tight text-highlighted">ToolBox</span>
        <span class="hidden text-sm text-muted md:inline">在线工具箱</span>
      </RouterLink>

      <div class="flex min-w-0 flex-1 justify-center px-1">
        <button
          type="button"
          class="hidden h-9 w-full max-w-sm items-center gap-2 rounded-full border border-default bg-elevated px-3 text-sm text-dimmed transition-colors hover:border-primary/40 hover:text-muted sm:flex"
          aria-label="搜索工具"
          aria-keyshortcuts="Control+K Meta+K"
          @click="showPalette"
        >
          <UIcon name="lucide:search" class="size-4 shrink-0" />
          <span class="truncate">搜索工具…</span>
          <span class="ms-auto hidden items-center gap-1 lg:flex">
            <UKbd value="Ctrl" size="sm" />
            <UKbd value="K" size="sm" />
          </span>
        </button>

        <!-- 窄屏放不下面包屑式搜索框，退成一个图标按钮 -->
        <button
          type="button"
          class="-me-2 ms-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-default sm:hidden"
          aria-label="搜索工具"
          @click="showPalette"
        >
          <UIcon name="lucide:search" class="size-5" />
        </button>
      </div>

      <AppThemeToggle />
    </div>

    <USlideover
      v-model:open="navOpen"
      title="工具分类"
      side="left"
      :ui="{ content: 'bg-default/80! backdrop-blur-2xl' }"
    >
      <template #body>
        <nav aria-label="工具分类">
          <ul class="flex flex-col">
            <li v-for="category in toolCategories" :key="category.id">
              <RouterLink
                :to="{ path: '/', query: { category: category.id } }"
                class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-default transition-colors hover:bg-elevated"
                @click="navOpen = false"
              >
                <UIcon :name="category.icon" class="size-5 shrink-0 text-primary" />
                <span class="min-w-0 flex-1 truncate">{{ category.label }}</span>
                <span class="shrink-0 text-xs text-dimmed">
                  {{ countOf(category.id) }}
                </span>
              </RouterLink>
            </li>
          </ul>
        </nav>
      </template>
    </USlideover>
  </header>
</template>
