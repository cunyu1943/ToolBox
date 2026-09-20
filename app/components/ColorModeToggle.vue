<template>
  <UButton
    :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
    color="neutral"
    variant="ghost"
    square
    :aria-label="isDark ? '切换到明亮模式' : '切换到黑暗模式'"
    @click="toggle"
  />
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  // useColorMode 会持久化选择到 localStorage
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>
