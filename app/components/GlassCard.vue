<template>
  <div
    :class="[
      'rounded-xl border shadow-sm transition-all duration-200',
      'bg-white border-slate-200/70 dark:bg-[#161618] dark:border-white/10',
      hoverable && 'hover:-translate-y-0.5 hover:border-vue-500/40 hover:shadow-md focus-within:-translate-y-0.5',
      interactive && 'cursor-pointer',
      customClass
    ]"
    v-bind="$attrs"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** 是否可 hover 上浮（卡片导航用） */
    hoverable?: boolean
    /** 是否作为可点击元素（配合 hoverable） */
    interactive?: boolean
    /** 追加的自定义类 */
    customClass?: string
  }>(),
  {
    hoverable: false,
    interactive: false,
    customClass: ''
  }
)
</script>
