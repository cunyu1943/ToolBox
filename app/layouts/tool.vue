<template>
  <div class="min-h-screen">
    <!-- 与主页一致的顶部导航（Logo / GitHub / 明暗切换），不再换成工具专属条 -->
    <AppHeader />

    <main class="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6">
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
    </main>
  </div>
</template>

<script setup lang="ts">
import { tools } from '~/utils/tools'

const route = useRoute()
// 依当前路径匹配注册表条目，用于标题栏展示
const meta = computed(() => tools.find((c) => c.route === route.path))
</script>
