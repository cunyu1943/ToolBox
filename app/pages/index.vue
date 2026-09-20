<template>
  <div>
    <!-- Hero：对齐 Vue 官网大字标题 + 绿色高亮 -->
    <section class="py-12 sm:py-20 text-center">
      <h1 class="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
        <span class="text-slate-800 dark:text-white">一站式</span><br class="sm:hidden" />
        <span class="bg-gradient-to-r from-vue-600 to-vue-400 bg-clip-text text-transparent">在线工具箱</span>
      </h1>
      <p class="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
        纯前端、无后端、隐私友好。开发、编码、文本、颜色、单位与财务等常用工具，一处集齐。
      </p>
    </section>

    <!-- 搜索 + 分类 -->
    <section class="mb-6 space-y-4">
      <UInput
        v-model="query"
        icon="i-lucide-search"
        placeholder="搜索工具，如「时间戳」「JSON」「Base64」…"
        size="lg"
        class="w-full transition-opacity duration-200"
        :class="heroSearchVisible ? 'opacity-100' : 'pointer-events-none opacity-0'"
        :ui="{ base: 'text-base' }"
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
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="cat in categoryList"
          :key="cat"
          :label="cat"
          :color="category === cat ? 'primary' : 'neutral'"
          :variant="category === cat ? 'solid' : 'outline'"
          size="sm"
          @click="category = cat"
        />
      </div>
    </section>

    <!-- 卡片网格：手机 1 列 → 平板 2 → 桌面 3~4 -->
    <section
      v-if="filtered.length"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <ToolCard v-for="c in filtered" :key="c.key" :meta="c" />
    </section>

    <!-- 空状态 -->
    <GlassCard v-else custom-class="py-16 text-center">
      <UIcon name="i-lucide-search-x" class="h-10 w-10 text-slate-300" />
      <p class="mt-3 text-slate-500 dark:text-slate-400">未找到匹配的工具</p>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { query, category, categories, filtered } = useToolSearch()
const categoryList = categories

// 与头部紧凑搜索二选一：越过阈值后隐藏本页大搜索（阈值同 AppHeader 的 260）
const { y } = useWindowScroll()
const heroSearchVisible = computed(() => y.value <= 260)
</script>
