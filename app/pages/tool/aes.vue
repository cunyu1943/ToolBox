<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex items-center gap-2">
        <UButton
          label="加密"
          :color="mode === 'enc' ? 'primary' : 'neutral'"
          :variant="mode === 'enc' ? 'subtle' : 'outline'"
          @click="mode = 'enc'"
        />
        <UButton
          label="解密"
          :color="mode === 'dec' ? 'primary' : 'neutral'"
          :variant="mode === 'dec' ? 'subtle' : 'outline'"
          @click="mode = 'dec'"
        />
      </div>
      <UInput v-model="password" type="password" size="lg" placeholder="口令（遗忘后无法找回）" icon="i-lucide-key-round" autocomplete="new-password" />
      <UTextarea
        v-model="input"
        :rows="7"
        auto-resize
        :placeholder="mode === 'enc' ? '输入要加密的明文…' : '粘贴 AES-GCM: 开头的密文…'"
        :class="mode === 'enc' ? 'w-full' : 'w-full font-mono text-sm'"
      />
      <UButton :label="mode === 'enc' ? '加密' : '解密'" :loading="busy" icon="i-lucide-lock-keyhole-open" @click="run" />
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    </GlassCard>

    <GlassCard v-if="output" custom-class="p-4 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-400">{{ mode === 'enc' ? '密文' : '明文' }}</p>
        <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy" />
      </div>
      <pre class="overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-slate-800 dark:text-slate-100">{{ output }}</pre>
    </GlassCard>
    <p v-else-if="!error" class="text-xs text-slate-400">AES-256-GCM，PBKDF2-SHA256 十万轮派生密钥；随机盐与 IV 内嵌密文，同一明文每次密文不同。全程浏览器本地计算。</p>
  </div>
</template>

<script setup lang="ts">
import { decryptText, encryptText } from '~/utils/aes-tool'

definePageMeta({ layout: 'tool' })

const mode = ref<'enc' | 'dec'>('enc')
const password = ref('')
const input = ref('')
const output = ref('')
const error = ref('')
const busy = ref(false)

async function run() {
  busy.value = true
  output.value = ''
  error.value = ''
  try {
    if (mode.value === 'enc') {
      if (!input.value) {
        error.value = '请输入明文'
        return
      }
      output.value = await encryptText(input.value, password.value)
    } else {
      const r = await decryptText(input.value, password.value)
      if (r.ok) output.value = r.output
      else error.value = r.error
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(output.value)
  } catch {
    /* 静默 */
  }
}
</script>
