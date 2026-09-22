<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UInput v-model="input" size="lg" placeholder="输入 IPv4 点分地址或 32 位整数，如 192.168.0.1 / 3232235521" class="w-full font-mono" icon="i-lucide-network" />
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <p v-else-if="!input.trim()" class="text-xs text-slate-400">支持点分十进制、整数、0x 十六进制输入，自动识别并换算。</p>
    </GlassCard>

    <GlassCard v-if="rows.length" custom-class="p-5">
      <div class="divide-y divide-slate-200/60 dark:divide-white/10">
        <div v-for="row in rows" :key="row.label" class="flex items-center justify-between gap-4 py-2.5">
          <div class="min-w-0">
            <p class="text-xs text-slate-400">{{ row.label }}</p>
            <code class="break-all font-mono text-sm text-slate-800 dark:text-slate-100">{{ row.value }}</code>
          </div>
          <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy(row.value)" />
        </div>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { isValidIpv4, ipv4ToInt, intToIpv4, ipv4ToHex, ipv4ToBinary } from '~/utils/ip'

const { copy: copyWithToast } = useCopy()


const input = ref('192.168.0.1')

const parsed = computed<{ int: number | null; error: string }>(() => {
  const s = input.value.trim()
  if (!s) return { int: null, error: '' }
  if (isValidIpv4(s)) return { int: ipv4ToInt(s), error: '' }
  if (/^0x[0-9a-fA-F]{1,8}$/.test(s)) {
    const n = Number.parseInt(s, 16)
    return n <= 0xffffffff ? { int: n, error: '' } : { int: null, error: '数值超出 32 位范围' }
  }
  if (/^\d{1,10}$/.test(s)) {
    const n = Number(s)
    return n <= 0xffffffff ? { int: n, error: '' } : { int: null, error: '数值超出 32 位范围' }
  }
  return { int: null, error: '无法识别，请输入合法 IPv4 或 0 ~ 4294967295 的整数' }
})

const error = computed(() => parsed.value.error)
const rows = computed(() => {
  const n = parsed.value.int
  if (n === null) return []
  const dotted = intToIpv4(n)
  return [
    { label: '点分十进制', value: dotted },
    { label: '32 位整数', value: String(n) },
    { label: '十六进制', value: ipv4ToHex(dotted) },
    { label: '二进制', value: ipv4ToBinary(dotted) }
  ]
})

async function copy(text: string) {
  await copyWithToast(text)
}
</script>
