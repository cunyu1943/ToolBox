<template>
  <UButton
    icon="i-lucide-arrow-up"
    color="neutral"
    variant="soft"
    square
    aria-label="返回顶部"
    class="fixed bottom-6 right-6 z-40 shadow-lg transition-all duration-300"
    :class="visible ? 'opacity-100 translate-y-0' : 'pointer-events-none translate-y-4 opacity-0'"
    @click="toTop"
  />
</template>

<script setup lang="ts">
// 滚动超过阈值后浮现，点击平滑回到页顶。
const { y } = useWindowScroll()
const visible = computed(() => y.value > 400)

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>
