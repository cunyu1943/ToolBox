<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePalette } from '~/composables/usePalette'

const route = useRoute()
const { show: showPalette } = usePalette()
const attempted = computed(() => route.fullPath)
</script>

<template>
  <section class="flex flex-col items-start gap-4 py-6">
    <p class="text-sm font-medium text-primary">404</p>
    <h1 class="text-2xl font-bold tracking-tight text-highlighted">这个页面不存在</h1>
    <p class="max-w-xl text-sm leading-relaxed text-muted">
      地址 <code class="rounded bg-elevated px-1 py-0.5">{{ attempted }}</code>
      没有对应的工具。可能是工具还没上线，或者链接拼错了。
    </p>
    <div class="flex flex-wrap gap-2">
      <UButton to="/" icon="lucide:toolbox" label="回到全部工具" color="primary" variant="solid" />
      <UButton
        icon="lucide:search"
        label="搜索工具"
        color="neutral"
        variant="outline"
        @click="showPalette"
      />
    </div>
  </section>
</template>
