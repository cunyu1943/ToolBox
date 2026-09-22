<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <UTextarea v-model="input" :rows="5" placeholder="输入需要计算摘要的文本（UTF-8）…" autoresize :maxrows="12" class="w-full font-mono text-sm" />
      <p class="text-xs text-slate-400">
        基于浏览器原生 Web Crypto 计算 SHA 系列，MD5 由 js-md5 本地实现，数据不上传。
      </p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <div v-for="algo in HASH_ALGORITHMS" :key="algo" class="space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-600 dark:text-slate-300">{{ algo }}</span>
          <UButton
            icon="i-lucide-copy"
            label="复制"
            color="neutral"
            variant="soft"
            size="xs"
            :disabled="!digests[algo]"
            @click="copy(digests[algo])"
          />
        </div>
        <p class="break-all rounded-lg bg-slate-50 p-2.5 font-mono text-xs text-slate-700 dark:bg-white/5 dark:text-slate-200">
          {{ digests[algo] || '—' }}
        </p>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { HASH_ALGORITHMS, hashText } from '~/utils/hash'

const { copy: copyWithToast } = useCopy()


const input = ref('')
const digests = reactive<Record<string, string>>({})

// 用自增运行号丢弃过期结果，避免快速输入时旧摘要覆盖新摘要
let runId = 0
watchEffect(() => {
  const run = ++runId
  const text = input.value
  if (!text) {
    for (const a of HASH_ALGORITHMS) digests[a] = ''
    return
  }
  for (const a of HASH_ALGORITHMS) {
    hashText(a, text).then((hex) => {
      if (run === runId) digests[a] = hex
    })
  }
})

async function copy(text: string) {
  if (!text) return
  await copyWithToast(text)
}
</script>
