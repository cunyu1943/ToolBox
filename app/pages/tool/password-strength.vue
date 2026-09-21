<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="flex items-center gap-2">
        <UInput
          v-model="password"
          :type="visible ? 'text' : 'password'"
          placeholder="输入密码进行实时评估"
          class="flex-1 font-mono"
          autocomplete="off"
        />
        <UButton
          :icon="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          size="sm"
          color="neutral"
          variant="outline"
          @click="visible = !visible"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-500">强度</span>
          <span :class="levelTextClass" class="font-semibold">{{ result.label }}</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="levelBarClass"
            :style="{ width: Math.max(result.percent, password ? 8 : 0) + '%' }"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p class="text-xs text-slate-400">长度</p>
          <p class="font-mono">{{ password.length }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p class="text-xs text-slate-400">字符集大小</p>
          <p class="font-mono">{{ result.charsetSize }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p class="text-xs text-slate-400">信息熵（bit）</p>
          <p class="font-mono">{{ result.entropy }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p class="text-xs text-slate-400">等级</p>
          <p class="font-mono">{{ result.score }} / 4</p>
        </div>
      </div>

      <div v-if="result.warnings.length && password" class="flex flex-wrap gap-2">
        <span
          v-for="w in result.warnings"
          :key="w"
          class="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        >{{ w }}</span>
      </div>

      <p class="text-xs text-slate-400">{{ result.suggestion }}</p>
    </GlassCard>
    <p class="text-xs text-slate-400">评估完全在浏览器本地完成，密码不会离开本页；熵按「长度 × log2(字符集)」估算，仅供参考。</p>
  </div>
</template>

<script setup lang="ts">
import { analyzePassword } from '~/utils/password-strength'

definePageMeta({ layout: 'tool' })

const password = ref('')
const visible = ref(false)

const result = computed(() => analyzePassword(password.value))
const levelTextClass = computed(() =>
  (['text-red-600 dark:text-red-400', 'text-orange-600 dark:text-orange-400', 'text-amber-600 dark:text-amber-400', 'text-lime-600 dark:text-lime-400', 'text-green-600 dark:text-green-400'] as const)[result.value.score]
)
const levelBarClass = computed(() =>
  (['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-green-500'] as const)[result.value.score]
)
</script>
