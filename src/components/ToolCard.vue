<script setup lang="ts">
import type { ToolDefinition } from '~/tools/registry'
import { categoryLabel } from '~/tools/registry'

defineProps<{ tool: ToolDefinition }>()
</script>

<template>
  <RouterLink
    :to="`/tools/${tool.id}`"
    class="group/card glass-card flex items-start gap-3 rounded-xl border border-default p-4 transition-colors hover:border-primary/40 focus-visible:border-primary/40"
  >
    <span
      class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
    >
      <UIcon :name="tool.icon" class="size-5" />
    </span>

    <div class="min-w-0 flex-1">
      <!-- 卡片必须等高：标题与简介各占一行，超出不换行、不撑高，先裁剪再横向滚出
           （标题行 gap-1 而非 gap-2：4 列档里名称只差 2~3px 就放得下，省下的 4px 免掉误导性省略号）。
           两处 span 的换行写法是刻意的：nowrap 会把缩进换行折成一个真空格，白占被测量的文字宽度。 -->
      <div class="flex items-center gap-1">
        <h2
          class="title-marquee min-w-0 flex-1 text-base font-bold leading-6 text-highlighted text-ellipsis text-nowrap sm:text-lg group-hover/card:text-clip group-focus-within/card:text-clip"
        >
          <span
            class="inline-block group-hover/card:title-scroll group-focus-within/card:title-scroll"
            >{{ tool.name }}</span
          >
        </h2>
        <UBadge
          :label="categoryLabel(tool.category)"
          color="neutral"
          variant="subtle"
          size="sm"
          class="shrink-0"
        />
      </div>
      <p
        class="title-marquee mt-1 text-xs leading-relaxed text-muted text-ellipsis text-nowrap sm:text-[13px] group-hover/card:text-clip group-focus-within/card:text-clip"
      >
        <span
          class="inline-block group-hover/card:title-scroll group-focus-within/card:title-scroll"
          >{{ tool.description }}</span
        >
      </p>
    </div>
  </RouterLink>
</template>
