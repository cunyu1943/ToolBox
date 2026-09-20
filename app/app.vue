<template>
  <UApp>
    <div class="min-h-screen app-aurora">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <BackToTop />
    </div>
  </UApp>
</template>

<script setup lang="ts">
// UApp 为 @nuxt/ui v4 根容器（提供 toast/overlay 等上下文）
// 全局氛围背景（毛玻璃光晕）包裹所有布局，layout 负责具体结构
</script>
