<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UTextarea v-model="token" :rows="4" placeholder="粘贴 JWT（形如 xxx.yyy.zzz）…" autoresize :maxrows="10" class="w-full font-mono text-sm" />
      <p class="text-xs text-slate-400">仅本地解码展示 Header / Payload，不校验签名，密钥不外泄。</p>
    </GlassCard>

    <GlassCard v-if="parsed.ok" custom-class="p-5 space-y-4">
      <section v-for="sec in sections" :key="sec.title" class="space-y-1">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ sec.title }}</h2>
          <UButton icon="i-lucide-copy" label="复制" color="neutral" variant="soft" size="xs" @click="copy(sec.value)" />
        </div>
        <pre class="overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-sm dark:bg-white/5">{{ sec.value || '—' }}</pre>
      </section>

      <div v-if="timeLines.length" class="space-y-1 border-t border-slate-200/60 pt-3 dark:border-white/10">
        <p v-for="line in timeLines" :key="line" class="text-sm text-slate-600 dark:text-slate-300">{{ line }}</p>
      </div>
    </GlassCard>

    <GlassCard v-else custom-class="p-5">
      <p class="text-sm text-red-500">{{ parsed.error || '等待输入' }}</p>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { parseJwt, describeJwtTime } from '~/utils/jwt'

definePageMeta({ layout: 'tool' })

const token = ref('')
const parsed = computed(() => parseJwt(token.value))
const sections = computed(() => [
  { title: 'Header', value: parsed.value.header ?? '' },
  { title: 'Payload', value: parsed.value.payload ?? '' },
  { title: 'Signature', value: parsed.value.signature ?? '' }
])
const timeLines = computed(() => (parsed.value.ok && parsed.value.payload ? describeJwtTime(parsed.value.payload) : []))

async function copy(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* 静默 */
  }
}
</script>
