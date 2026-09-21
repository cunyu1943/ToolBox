<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UInput
        v-model="expr"
        size="lg"
        class="w-full font-mono"
        placeholder="输入 5 字段 Cron，如 */15 9-18 * * 1-5"
        icon="i-lucide-clock"
        @keyup.enter="refresh"
      />
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <p v-else-if="describe" class="text-sm text-slate-500 dark:text-slate-400">{{ describe }}</p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="p in CRON_PRESETS"
          :key="p.expr"
          :label="p.label"
          color="neutral"
          variant="outline"
          size="xs"
          @click="pick(p.expr)"
        />
      </div>
    </GlassCard>

    <GlassCard v-if="fields.length" custom-class="p-5">
      <div class="grid grid-cols-5 gap-2 text-center">
        <div v-for="f in fields" :key="f.label">
          <p class="text-xs text-slate-400">{{ f.label }}</p>
          <code class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ f.expr }}</code>
          <p class="mt-1 break-all font-mono text-[11px] text-slate-400">
            {{ f.any ? '*' : f.values.join(',') }}
          </p>
        </div>
      </div>
    </GlassCard>

    <GlassCard v-if="runs.length" custom-class="p-5">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-medium text-slate-600 dark:text-slate-300">接下来的执行时间（本地）</p>
        <UButton label="以当前时间重算" size="xs" variant="ghost" icon="i-lucide-refresh-ccw" @click="refresh" />
      </div>
      <ol class="space-y-1.5">
        <li v-for="(r, i) in runs" :key="i" class="flex items-center gap-3 text-sm">
          <UBadge :label="String(i + 1)" color="neutral" variant="subtle" />
          <span class="font-mono text-slate-700 dark:text-slate-200">{{ format(r) }}</span>
        </li>
      </ol>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { CRON_PRESETS, nextRuns, parseCron, type CronField } from '~/utils/cron'

definePageMeta({ layout: 'tool' })

const expr = ref('0 9 * * 1-5')
const base = ref(new Date())

const parsed = computed(() => parseCron(expr.value))
const error = computed(() => (parsed.value.ok ? '' : parsed.value.error))
const describe = computed(() => (parsed.value.ok ? parsed.value.describe : ''))
const fields = computed<CronField[]>(() => (parsed.value.ok ? parsed.value.fields : []))

const runs = computed(() => nextRuns(expr.value, base.value, 5))

const fmt = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', weekday: 'short'
})
function format(d: Date) {
  return fmt.format(d)
}

function refresh() {
  base.value = new Date()
}

function pick(e: string) {
  expr.value = e
  refresh()
}
</script>
