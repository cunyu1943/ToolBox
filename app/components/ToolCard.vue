<template>
  <RouterLink :to="meta.route" class="group block focus-visible:outline-none">
    <GlassCard
      hoverable
      interactive
      custom-class="h-full p-5 group-hover:border-vue-400/60 group-focus-visible:ring-2 group-focus-visible:ring-vue-400"
    >
      <div class="flex items-start gap-4">
        <span
          class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-vue-500/10 text-vue-600 ring-1 ring-vue-500/20 dark:text-vue-300"
        >
          <UIcon :name="meta.icon" class="h-6 w-6" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <h3 class="truncate font-semibold text-slate-800 dark:text-slate-100">
              {{ meta.name }}
            </h3>
            <UBadge :label="meta.category" color="neutral" variant="subtle" size="xs" />
          </div>
          <p class="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
            {{ meta.desc }}
          </p>
        </div>
      </div>
    </GlassCard>
  </RouterLink>
</template>

<script setup lang="ts">
import type { ToolMeta } from '~/types'

defineProps<{ meta: ToolMeta }>()
</script>
