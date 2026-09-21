<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <UInput v-model="input" size="lg" placeholder="如 192.168.1.5/24 或 10.0.0.80/255.255.255.192" class="w-full font-mono" icon="i-lucide-git-branch" />
      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="p in [8, 16, 20, 22, 24, 26, 27, 28, 29, 30]"
          :key="p"
          :label="`/${p}`"
          size="xs"
          :color="prefix === p ? 'primary' : 'neutral'"
          :variant="prefix === p ? 'subtle' : 'ghost'"
          @click="setPrefix(p)"
        />
      </div>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      <p v-else-if="!parsed" class="text-xs text-slate-400">支持 /24 前缀或点分掩码写法，自动求网络地址、广播地址与可用主机区间。</p>
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
import { parseCidr, subnetInfo } from '~/utils/subnet'
import { ipv4ToInt, intToIpv4 } from '~/utils/ip'

definePageMeta({ layout: 'tool' })

const input = ref('192.168.1.5/24')

const parsed = computed(() => {
  const r = parseCidr(input.value)
  return r.ok ? r : null
})
const error = computed(() => {
  const r = parseCidr(input.value)
  return r.ok ? '' : r.error
})
const prefix = computed(() => parsed.value?.prefix ?? null)

function setPrefix(p: number) {
  const r = parseCidr(input.value)
  const ip = r.ok ? r.ip : input.value.trim().split(/[\/\s]/)[0]
  input.value = `${ip}/${p}`
}

const rows = computed(() => {
  if (!parsed.value) return []
  const s = subnetInfo(parsed.value.ip, parsed.value.prefix)
  const range = s.hostMin && s.hostMax ? `${s.hostMin} ~ ${s.hostMax}` : '-'
  const first = ipv4ToInt(s.network)
  return [
    { label: 'CIDR', value: s.cidr },
    { label: '子网掩码', value: s.mask },
    { label: '通配符掩码', value: s.wildcard },
    { label: '网络地址', value: s.network },
    { label: '广播地址', value: s.broadcast },
    { label: '可用主机区间', value: range },
    { label: '可用主机数', value: String(s.usableHosts) },
    { label: '地址总数', value: String(s.totalAddresses) },
    { label: '地址块起始整数', value: String(first) },
    { label: '网络地址二进制', value: s.networkBinary },
    { label: '下一网段', value: intToIpv4(((first + s.totalAddresses) >>> 0)) }
  ]
})

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* 静默 */
  }
}
</script>
