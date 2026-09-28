<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { CommandPaletteItem } from '@nuxt/ui'
import { categoryLabel, toolCategories, tools } from '~/tools/registry'
import { searchTools } from '~/composables/useToolSearch'
import { usePalette } from '~/composables/usePalette'

const RESULT_LIMIT = 12

const router = useRouter()
const { open, searchTerm } = usePalette()

interface PaletteItem extends CommandPaletteItem {
  kind: 'tool' | 'category'
  target: string
}

const items = computed<PaletteItem[]>(() => {
  const term = searchTerm.value.trim()
  const hits = searchTools(term)
    .slice(0, RESULT_LIMIT)
    .map<PaletteItem>((tool) => ({
      kind: 'tool',
      target: `/tools/${tool.id}`,
      id: tool.id,
      label: tool.name,
      description: tool.description,
      icon: tool.icon,
      suffix: categoryLabel(tool.category)
    }))

  const categories = toolCategories
    .filter((category) => !term || category.label.includes(term))
    .slice(0, 3)
    .map<PaletteItem>((category) => ({
      kind: 'category',
      target: `/?category=${category.id}`,
      id: `category-${category.id}`,
      label: category.label,
      description: category.description,
      icon: category.icon,
      suffix: `${tools.filter((tool) => tool.category === category.id).length} 个工具`
    }))

  return [...hits, ...categories]
})

const groups = computed(() => {
  const toolItems = items.value.filter((item) => item.kind === 'tool')
  const categoryItems = items.value.filter((item) => item.kind === 'category')
  const result = []
  if (toolItems.length) {
    result.push({ id: 'tools', label: '工具', items: toolItems, ignoreFilter: true })
  }
  if (categoryItems.length) {
    result.push({ id: 'categories', label: '分类', items: categoryItems, ignoreFilter: true })
  }
  return result
})

function onPick(item: CommandPaletteItem | CommandPaletteItem[] | undefined) {
  const picked = Array.isArray(item) ? item[0] : item
  if (!picked) return
  open.value = false
  searchTerm.value = ''
  router.push((picked as PaletteItem).target)
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-lg bg-default/80! backdrop-blur-2xl' }">
    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        :close="true"
        placeholder="搜索工具，支持名称、描述与关键词…"
        class="h-96"
        @update:model-value="onPick"
      >
        <template #empty>
          <p class="px-3 py-6 text-center text-sm text-muted">
            没有匹配的工具，试试「base64」「时间」「颜色」。
          </p>
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>
