<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div class="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-white/10">
          <span class="text-slate-400">/</span>
          <input v-model="pattern" class="w-full bg-transparent py-2 font-mono text-sm outline-none" placeholder="正则表达式，如 \d+" />
          <span class="text-slate-400">/</span>
          <input v-model="flags" class="w-12 bg-transparent py-2 font-mono text-sm outline-none" placeholder="gi" />
        </div>
      </div>
      <UTextarea v-model="text" :rows="5" placeholder="被匹配的测试文本…" autoresize :maxrows="12" class="w-full font-mono text-sm" />
      <p class="text-xs text-slate-400">实时匹配。为避免卡死，最多显示前 5000 个匹配。</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          匹配 {{ result.count }} 处
        </h2>
        <UButton icon="i-lucide-copy" label="复制匹配" color="neutral" variant="soft" size="sm" :disabled="!matchedValues.length" @click="copy" />
      </div>
      <p v-if="!result.ok" class="text-sm text-red-500">{{ result.error }}</p>
      <div v-else-if="!result.count" class="text-sm text-slate-400">无匹配</div>
      <ul v-else class="max-h-80 space-y-1 overflow-auto">
        <li v-for="(m, i) in shown" :key="i" class="flex items-baseline gap-3 text-sm">
          <span class="w-10 shrink-0 text-right text-xs text-slate-400 tabular-nums">#{{ i + 1 }}</span>
          <code class="break-all font-mono text-vue-700 dark:text-vue-300">{{ m.value || '(空)' }}</code>
          <span v-if="m.groups.length" class="text-xs text-slate-400">组: {{ JSON.stringify(m.groups) }}</span>
        </li>
      </ul>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { testRegex } from '~/utils/regex'

const { copy: copyWithToast } = useCopy()


const pattern = ref('')
const flags = ref('g')
const text = ref('')

const result = computed(() => testRegex(pattern.value, flags.value, text.value))
const shown = computed(() => result.value.matches.slice(0, 5000))
const matchedValues = computed(() => shown.value.map((m) => m.value).join('\n'))

async function copy() {
  await copyWithToast(matchedValues.value)
}
</script>
