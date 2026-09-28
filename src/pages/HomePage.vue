<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolCard from '~/components/ToolCard.vue'
import { isCategoryId, toolCategories, tools, toolsOfCategory, type CategoryId } from '~/tools/registry'
import { searchTools, type CategoryFilter } from '~/composables/useToolSearch'
import { usePalette } from '~/composables/usePalette'

const route = useRoute()
const router = useRouter()
const { show: showPalette } = usePalette()

const readFilter = (): CategoryFilter =>
  isCategoryId(route.query.category) ? route.query.category : 'all'

const query = ref('')
const filter = ref<CategoryFilter>(readFilter())

watch(
  () => route.query.category,
  () => {
    filter.value = readFilter()
  }
)

watch(filter, (next) => {
  const current = typeof route.query.category === 'string' ? route.query.category : null
  const wanted = next === 'all' ? null : next
  if (current !== wanted) {
    router.replace({ query: wanted ? { category: wanted } : {} })
  }
})

const results = computed(() => searchTools(query.value, filter.value))

function resetFilters() {
  query.value = ''
  filter.value = 'all'
}

const chips = computed(() => [
  { label: '全部', value: 'all' as CategoryFilter, count: tools.length },
  ...toolCategories.map((category) => ({
    label: category.label,
    value: category.id as CategoryId,
    count: toolsOfCategory(category.id).length
  }))
])
</script>

<template>
  <section class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
        常用小工具，打开即用
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        共 {{ tools.length }} 个工具，全部在浏览器本地运行：不上传、不请求后端，偏好只存
        <code class="rounded bg-elevated px-1 py-0.5 text-[0.85em]">localStorage</code>。
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <UBadge label="纯前端" color="primary" variant="subtle" />
        <UBadge label="离线可用" color="neutral" variant="subtle" />
        <UBadge label="Ctrl K 搜索" color="neutral" variant="subtle" class="hidden sm:inline-flex" />
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="query"
          icon="lucide:search"
          placeholder="按名称、描述或关键词筛选…"
          size="lg"
          class="sm:max-w-sm"
          aria-label="筛选工具"
        />
        <UButton
          icon="lucide:command"
          label="命令面板"
          color="neutral"
          variant="outline"
          size="lg"
          class="justify-center sm:ms-auto"
          @click="showPalette"
        />
      </div>

      <div class="flex flex-wrap gap-2" role="group" aria-label="按分类筛选">
        <button
          v-for="chip in chips"
          :key="chip.value"
          type="button"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors"
          :class="
            filter === chip.value
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-default text-muted glass-card hover:text-default'
          "
          :aria-pressed="filter === chip.value"
          @click="filter = chip.value"
        >
          {{ chip.label }}
          <span class="text-xs text-dimmed">{{ chip.count }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="results.length"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
    >
      <ToolCard v-for="tool in results" :key="tool.id" :tool="tool" />
    </div>

    <div v-else class="glass-card rounded-xl border border-dashed border-default p-8 text-center">
      <p class="text-sm text-muted">
        没有匹配的工具。
        <button
          type="button"
          class="ms-1 text-primary underline-offset-4 hover:underline"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </p>
    </div>

    <p class="text-xs text-dimmed">
      工具会持续增加；每个工具都是独立页面，可收藏直达（如
      <code class="rounded bg-elevated px-1 py-0.5">/tools/json-format</code>）。
    </p>
  </section>
</template>
