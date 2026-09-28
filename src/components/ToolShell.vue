<script setup lang="ts">
import { computed } from 'vue'
import { categoryLabel, findTool } from '~/tools/registry'

const props = defineProps<{ toolId: string }>()

const tool = computed(() => findTool(props.toolId))
</script>

<template>
  <section v-if="tool" class="flex flex-col gap-5">
    <div>
      <RouterLink
        to="/"
        class="inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm text-muted transition-colors hover:text-default"
      >
        <UIcon name="lucide:arrow-left" class="size-4 shrink-0" />
        全部工具
      </RouterLink>

      <div class="mt-3 flex items-start gap-3">
        <span
          class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <UIcon :name="tool.icon" class="size-6" />
        </span>
        <div class="min-w-0">
          <h1 class="text-xl font-bold tracking-tight text-highlighted sm:text-2xl">
            {{ tool.name }}
          </h1>
          <p class="mt-1 text-sm leading-relaxed text-muted">{{ tool.description }}</p>
        </div>
      </div>

      <UBadge :label="categoryLabel(tool.category)" color="neutral" variant="subtle" class="mt-3 self-start" />
    </div>

    <slot />
  </section>
</template>
