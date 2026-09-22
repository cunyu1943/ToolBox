<template>
  <UApp>
    <div class="min-h-screen app-aurora">
      <component :is="layout">
        <RouterView />
      </component>
      <BackToTop />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import DefaultLayout from './layouts/default.vue'
import ToolLayout from './layouts/tool.vue'

// UApp 为 @nuxt/ui v4 根容器（提供 toast/overlay 等上下文）
// 全局氛围背景（毛玻璃光晕）包裹所有布局，layout 负责具体结构（由路由 meta.layout 决定）
const route = useRoute()
const layout = computed(() => (route.meta.layout === 'tool' ? ToolLayout : DefaultLayout))
</script>
