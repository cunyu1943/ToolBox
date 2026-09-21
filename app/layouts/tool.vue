<template>
  <div class="min-h-screen">
    <!-- 与主页一致的顶部导航（Logo / GitHub / 明暗切换），不再换成工具专属条 -->
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <!-- 移动端：折叠的全工具索引 -->
      <details class="mb-4 rounded-lg border border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/60 lg:hidden">
        <summary class="cursor-pointer select-none px-4 py-2 text-sm font-medium">
          工具目录（共 {{ tools.length }} 个）
        </summary>
        <div class="max-h-96 overflow-y-auto px-4 pb-4">
          <ToolSidebar />
        </div>
      </details>

      <div class="lg:flex lg:items-start lg:gap-8">
        <!-- 桌面端：粘性侧边栏索引 -->
        <aside
          class="sticky top-20 mb-6 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/60 lg:block"
          aria-label="工具索引"
        >
          <ToolSidebar />
        </aside>

        <div class="mx-auto min-w-0 max-w-2xl flex-1 lg:mx-0">
      <!-- 工具标题置于主内容区顶部：返回 + 图标 + 名称/描述 -->
      <div class="mb-5 flex items-center gap-3">
        <UButton
          to="/"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          square
          aria-label="返回首页"
        />
        <span
          class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-vue-500/10 text-vue-600 dark:text-vue-300"
        >
          <UIcon :name="meta?.icon ?? 'i-mdi-calculator'" class="h-6 w-6" />
        </span>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold text-slate-800 dark:text-slate-100">
            {{ meta?.name ?? '工具' }}
          </h1>
          <p v-if="meta" class="truncate text-xs text-slate-500 dark:text-slate-400">
            {{ meta.desc }}
          </p>
        </div>
      </div>

      <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { tools } from '~/utils/tools'

const route = useRoute()
// 用路由记录 path 匹配（不受子路径 baseURL 与目录尾斜杠影响），用于标题栏展示
const meta = computed(() => tools.find((c) => route.matched.some((m) => m.path === c.route)))
</script>
