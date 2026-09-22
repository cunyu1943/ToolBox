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
import { useDark } from '@vueuse/core'

const isDark = useDark()

function toggle() {
  // useDark 会持久化选择到 localStorage，并跟随系统偏好初始化
  isDark.value = !isDark.value
}
</script>
