<template>
  <header class="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/70 dark:bg-[#1b1b1f]/80 dark:border-white/10">
    <div
      class="mx-auto flex items-center gap-3 px-4 py-3 max-w-6xl sm:px-6"
    >
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2 focus-visible:outline-none" @click="onLogoClick">
        <span
          class="grid h-9 w-9 place-items-center rounded-lg bg-vue-500 text-white"
        >
          <UIcon name="i-mdi-toolbox-outline" class="h-5 w-5" />
        </span>
        <span class="text-lg font-semibold tracking-tight text-vue-ink dark:text-white">
          ToolBox
        </span>
      </NuxtLink>

      <!-- 紧凑搜索：仅首页且向下滚动后出现，与首页大搜索二选一（共享 query） -->
      <div
        class="flex flex-1 justify-end transition-opacity duration-200"
        :class="showSearch ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <UInput
          v-if="showSearch"
          v-model="query"
          icon="i-lucide-search"
          placeholder="搜索工具…"
          size="sm"
          class="w-full max-w-[15rem]"
        >
          <template #trailing>
            <UButton
              v-if="query"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              :padded="false"
              tabindex="-1"
              aria-label="清除搜索"
              @click="query = ''"
            />
          </template>
        </UInput>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <UButton
          v-if="!showSearch"
          to="/about"
          label="关于"
          color="neutral"
          variant="ghost"
          class="hidden sm:inline-flex"
        />
        <UButton
          v-if="showGithub"
          :to="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          icon="i-mdi-github"
          color="neutral"
          variant="ghost"
          square
          aria-label="项目地址"
        />
        <ColorModeToggle />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// 顶部导航：Logo + 应用名 +（滚动后）紧凑搜索 + 关于入口 + GitHub 入口 + 明暗切换
const { query } = useToolSearch()
const route = useRoute()
const { y } = useWindowScroll()

const isHome = computed(() => route.name === 'index')
// 越过阈值后首页大搜索已滚离视口，此处补上头部搜索，二者不同时出现
const showSearch = computed(() => isHome.value && y.value > 260)

// 点击 logo：非首页由 NuxtLink 跳转回顶；已在首页则平滑回到顶部
function onLogoClick() {
  if (isHome.value) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cfg = useRuntimeConfig().public
const githubUrl = computed(() => String(cfg.githubUrl || ''))
const showGithub = computed(() => Boolean(cfg.showGithub) && githubUrl.value.length > 0)
</script>
