<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  AES_DEFAULT_ITERATIONS,
  AES_SAMPLES,
  decryptText,
  encryptText,
  environmentIssues,
  inspectPayload,
  type AesResult,
  type PayloadInfo
} from '~/tools/aes'
import { useStored } from '~/composables/useStored'

const modes = [
  { label: '加密', value: 'encrypt' as const },
  { label: '解密', value: 'decrypt' as const }
]
type Mode = (typeof modes)[number]['value']

/** 口令与明文都用普通 ref：一旦进 localStorage，等于把密钥副本留在磁盘上 */
const mode = useStored<Mode>('tool.aes.mode', 'encrypt')
const iterations = useStored('tool.aes.iterations', AES_DEFAULT_ITERATIONS)
const plain = ref('')
const payload = ref('')
const password = ref('')
const showPassword = ref(false)
const busy = ref(false)
const result = ref<AesResult | null>(null)

const issues = environmentIssues()
const canRun = computed(() => !busy.value && Boolean(password.value) && (mode.value === 'encrypt' ? Boolean(plain.value) : Boolean(payload.value)))

/** 解密前先就地自检载荷：口令错与格式错要分开报，别让人拿错口令去试 */
const info = computed<PayloadInfo | null>(() => (payload.value.trim() ? inspectPayload(payload.value) : null))

async function run(): Promise<void> {
  if (!password.value) {
    result.value = { ok: false, error: '请先填口令。', notes: [] }
    return
  }
  busy.value = true
  try {
    const options = { password: password.value, iterations: iterations.value }
    result.value =
      mode.value === 'encrypt'
        ? await encryptText(plain.value, options)
        : await decryptText(payload.value, options)
  } finally {
    busy.value = false
  }
}

function fillSample(label: string): void {
  const sample = AES_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  mode.value = 'encrypt'
  plain.value = sample.plain
  password.value = sample.password
  payload.value = ''
  result.value = null
}
</script>

<template>
  <ToolShell tool-id="aes">
    <UAlert
      v-for="issue in issues"
      :key="issue.label"
      :color="issue.severity === 'error' ? 'error' : 'warning'"
      variant="subtle"
      icon="lucide:triangle-alert"
      :title="issue.label"
      :description="issue.detail"
    />

    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="mode" :items="modes" size="lg" class="w-32" aria-label="模式" />
      <UFormField label="PBKDF2 迭代次数" class="w-44">
        <UInputNumber v-model="iterations" :min="1000" :max="2000000" :step="10000" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="口令" class="min-w-56 flex-1">
        <UInput
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :icon="showPassword ? 'lucide:eye' : 'lucide:eye-off'"
          size="lg"
          autocomplete="off"
          placeholder="用来推导 AES 密钥，不会保存"
          class="w-full"
        />
      </UFormField>
      <UButton
        icon="lucide:play"
        :label="busy ? '推导密钥中…' : mode === 'encrypt' ? '加密' : '解密'"
        :loading="busy"
        :disabled="!canRun"
        color="primary"
        variant="solid"
        size="lg"
        @click="run"
      />
      <UButton
        icon="lucide:eraser"
        label="清空"
        color="neutral"
        variant="ghost"
        size="lg"
        @click="plain = ''; payload = ''; password = ''; result = null"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="flex min-w-0 flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">{{ mode === 'encrypt' ? '明文' : '待解密载荷' }}</h2>
        <UTextarea
          v-if="mode === 'encrypt'"
          v-model="plain"
          :rows="12"
          placeholder="要加密的内容…"
          class="w-full"
          :ui="{ base: 'font-mono text-xs leading-relaxed' }"
        />
        <UTextarea
          v-else
          v-model="payload"
          :rows="12"
          placeholder="aes256-gcm.v1.迭代数.salt.iv.密文"
          class="w-full"
          :ui="{ base: 'font-mono text-xs leading-relaxed' }"
        />
        <div v-if="mode === 'decrypt' && info" class="text-xs">
          <p v-if="!info.ok" class="text-error">载荷自检失败：{{ info.error }}</p>
          <ul v-else class="flex flex-wrap gap-2 text-muted">
            <UBadge :label="`迭代 ${info.iterations}`" color="neutral" variant="subtle" />
            <UBadge :label="`salt ${info.saltBytes} 字节`" color="neutral" variant="subtle" />
            <UBadge :label="`IV ${info.ivBytes} 字节`" color="neutral" variant="subtle" />
            <UBadge :label="`密文 ${info.cipherBytes} 字节（含 16 字节标签）`" color="neutral" variant="subtle" />
            <UBadge :label="`明文约 ${info.plainBytes} 字节`" color="neutral" variant="subtle" />
          </ul>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in AES_SAMPLES"
            :key="sample.label"
            :label="sample.label"
            size="xs"
            color="neutral"
            variant="subtle"
            @click="fillSample(sample.label)"
          />
        </div>
      </section>

      <section class="flex min-w-0 flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">{{ mode === 'encrypt' ? '载荷' : '明文' }}</h2>
          <CopyButton :text="result?.ok ? result.value : ''" :disabled="!result?.ok" />
        </div>
        <textarea
          :value="result?.ok ? result.value : ''"
          readonly
          rows="12"
          spellcheck="false"
          class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          :placeholder="result?.ok ? '' : '点上面的按钮后，结果出现在这里'"
        />
        <p v-if="result && !result.ok" class="text-xs text-error">{{ result.error }}</p>
      </section>
    </div>

    <ul v-if="result?.ok && result.notes.length" class="flex flex-col gap-1 text-xs text-muted">
      <li v-for="note in result.notes" :key="note">· {{ note }}</li>
    </ul>

    <p class="text-xs text-dimmed">
      口令经 PBKDF2-SHA256 推导成 256 位密钥，salt 与 IV 每次随机并写进载荷，所以同一段明文两次加密会得到两个不同载荷，这不影响解密。
      GCM 自带认证标签，口令错与载荷被改过都是同一种失败。<strong class="font-medium text-warning">口令与明文都不写进
      localStorage</strong>，刷新即丢；密文可以随意复制粘贴，但请把它当成明文看待——任何人拿到口令就能解开。
    </p>
  </ToolShell>
</template>
