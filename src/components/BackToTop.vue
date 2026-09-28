<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** 滚过约一屏的三分之一才出现：短页面（多数工具页首屏就够）不该多出一个浮动控件 */
const SHOWN_AFTER_PX = 480
const visible = ref(false)

function sync(): void {
  const next = window.scrollY > SHOWN_AFTER_PX
  if (next !== visible.value) visible.value = next
}

onMounted(() => {
  sync()
  window.addEventListener('scroll', sync, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', sync))

function toTop(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-3 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in pointer-events-none"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-3 opacity-0"
  >
    <button
      v-if="visible"
      type="button"
      aria-label="返回顶部"
      class="glass fixed right-4 bottom-5 z-20 grid size-11 place-items-center rounded-full border border-default text-muted shadow-lg hover:text-highlighted focus-visible:outline-primary sm:right-6 sm:bottom-6"
      @click="toTop"
    >
      <UIcon name="lucide:arrow-up" class="size-5" />
    </button>
  </Transition>
</template>
