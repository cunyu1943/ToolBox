<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          数量
          <UInput v-model.number="count" type="number" min="1" max="200" size="xs" class="w-20" />
        </label>
        <UCheckbox v-model="upper" label="转大写" />
        <UCheckbox v-model="noHyphen" label="去掉连字符" />
        <UCheckbox v-model="braces" label="包裹花括号" />
      </div>
      <div class="flex gap-2">
        <UButton label="重新生成" icon="i-lucide-refresh-cw" color="primary" @click="regenerate" />
        <UButton label="复制全部" icon="i-lucide-copy" color="neutral" variant="soft" :disabled="!items.length" @click="copyAll" />
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5">
      <ul class="space-y-1.5">
        <li v-for="(id, i) in items" :key="i" class="flex items-center justify-between gap-3">
          <code class="break-all font-mono text-sm text-slate-700 dark:text-slate-200">{{ id }}</code>
          <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy(id)" />
        </li>
      </ul>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { newUuid } from '~/utils/uuid'

definePageMeta({ layout: 'tool' })

const count = ref(5)
const upper = ref(false)
const noHyphen = ref(false)
const braces = ref(false)
const raw = ref<string[]>([])

function regenerate() {
  const n = Math.min(200, Math.max(1, Math.floor(count.value) || 1))
  raw.value = Array.from({ length: n }, () => newUuid())
}

const items = computed(() =>
  raw.value.map((id) => {
    let s = noHyphen.value ? id.replace(/-/g, '') : id
    if (upper.value) s = s.toUpperCase()
    if (braces.value) s = `{${s}}`
    return s
  })
)

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* 静默 */
  }
}

async function copyAll() {
  await copy(items.value.join('\n'))
}

onMounted(regenerate)
</script>
