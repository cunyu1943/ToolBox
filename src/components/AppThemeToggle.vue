<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { mode, label, cycle } = useTheme()

const icon = computed(
  () =>
    ({
      system: 'lucide:monitor',
      light: 'lucide:sun',
      dark: 'lucide:moon'
    })[mode.value]
)
</script>

<template>
  <!-- 用原生 button 而非 UButton：需要精确保证移动端可点区域 ≥ 44px（size-11）。
       顶栏恒为纯图标，文字只在悬停/键盘聚焦时浮现（CSS 实现，不引 Reka Tooltip：
       后者会把 @floating-ui 与 tooltip 运行时塞进入口块，实测 +41 kB raw / +13 kB gzip）。 -->
  <div class="group/theme relative inline-flex">
    <button
      type="button"
      class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-default bg-elevated text-default shadow-sm transition-colors hover:bg-accented"
      :aria-label="`当前主题：${label}，点击切换`"
      @click="cycle"
    >
      <UIcon :name="icon" class="size-5 shrink-0" />
    </button>
    <span
      role="tooltip"
      class="pointer-events-none invisible absolute top-full end-0 z-40 mt-2 inline-flex items-center rounded-lg border border-default bg-elevated px-2.5 py-1 text-xs leading-none text-muted whitespace-nowrap opacity-0 shadow-lg transition-opacity duration-150 group-hover/theme:visible group-hover/theme:opacity-100 group-focus-within/theme:visible group-focus-within/theme:opacity-100"
    >
      {{ label }}
    </span>
  </div>
</template>
