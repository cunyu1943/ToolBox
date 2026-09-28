<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { groupThousands } from '~/tools/calculator'
import {
  MAX_LISTED_SUBNETS,
  enumerateSubnets,
  splitPrefix,
  summarize,
  suggestPrefix,
  type SubnetRow
} from '~/tools/ip-subnet'
import { useStored } from '~/composables/useStored'

const PRESETS = [
  { label: '192.168.1.130/26', value: '192.168.1.130/26' },
  { label: '10.0.0.0/8', value: '10.0.0.0/8' },
  { label: '172.16.5.0/24', value: '172.16.5.0/24' },
  { label: '192.168.1.7/32', value: '192.168.1.7/32' },
  { label: '100.64.0.1/10', value: '100.64.0.1/10' },
  { label: '224.0.0.5/4', value: '224.0.0.5/4' }
]

const factorItems = [1, 2, 3, 4, 6, 8].map((bits) => ({
  label: `借 ${bits} 位 · ${2 ** bits} 块`,
  value: bits
}))

const target = useStored('tool.ip-subnet.target', '192.168.1.130/26')
const factor = useStored('tool.ip-subnet.factor', 2)
const hostsNeeded = useStored('tool.ip-subnet.hosts', 100)

const result = computed(() => summarize(target.value))
const summary = computed(() => result.value.summary)

interface Field {
  label: string
  value: string
  copy?: string
}

const fields = computed<Field[]>(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: 'CIDR 记法', value: s.cidr },
    { label: '输入地址', value: s.inputAddress },
    { label: '网络地址', value: s.network },
    { label: '子网掩码', value: `${s.mask}（/${s.prefix}）`, copy: s.mask },
    { label: '反掩码', value: s.wildcard },
    { label: '广播地址', value: s.broadcast },
    { label: '可用主机范围', value: `${s.firstHost} – ${s.lastHost}`, copy: `${s.firstHost} - ${s.lastHost}` },
    { label: '地址总数', value: groupThousands(String(s.totalAddresses)) },
    { label: '可用主机数', value: groupThousands(String(s.usableHosts)) },
    { label: '前缀 / 主机位', value: `/${s.prefix} · ${s.hostBits} 位` },
    { label: '掩码二进制', value: s.maskBinary },
    { label: '网络二进制', value: s.networkBinary },
    { label: '有类别归属', value: s.classful },
    { label: '地址用途', value: s.specialUse },
    { label: '反向解析', value: s.reverseDns }
  ]
})

const splitInfo = computed(() =>
  summary.value ? splitPrefix(summary.value.prefix, Math.trunc(Number(factor.value) || 0)) : null
)

const subnetRows = computed<{ rows: SubnetRow[]; truncated: boolean; total: number; error?: string }>(() => {
  const info = splitInfo.value
  const newPrefix = info?.newPrefix
  if (!info?.ok || newPrefix === undefined) {
    return { rows: [], truncated: false, total: 0, error: info?.error }
  }
  return enumerateSubnets(target.value, newPrefix)
})

const plan = computed(() => suggestPrefix(Math.trunc(Number(hostsNeeded.value) || 0)))

function usePreset(value: string) {
  target.value = value
}
</script>

<template>
  <ToolShell tool-id="ip-subnet">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <label class="flex min-w-0 flex-col gap-1.5">
          <span class="text-sm text-muted">IP / CIDR</span>
          <UInput
            v-model="target"
            size="lg"
            spellcheck="false"
            autocomplete="off"
            placeholder="例如 192.168.1.130/26"
            :aria-invalid="result.ok ? 'false' : 'true'"
            :ui="{ base: 'font-mono text-base' }"
          />
        </label>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs text-dimmed">常用示例：</span>
          <UButton
            v-for="preset in PRESETS"
            :key="preset.value"
            :label="preset.label"
            size="xs"
            color="neutral"
            :variant="target.trim() === preset.value ? 'soft' : 'outline'"
            type="button"
            @click="usePreset(preset.value)"
          />
        </div>
        <p class="text-xs leading-relaxed text-dimmed">
          也接受 <code class="rounded bg-elevated px-1 py-0.5">192.168.1.0/255.255.255.0</code>
          与「IP 空格 掩码」的写法；只填 IP 不填前缀时按
          <code class="rounded bg-elevated px-1 py-0.5">/32</code> 单主机处理。
        </p>
      </div>

      <UAlert
        v-if="!result.ok"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        title="无法解析"
        :description="result.error"
      />

      <template v-else>
        <div v-if="result.warnings.length" class="flex flex-wrap items-center gap-2" aria-label="解析提示">
          <UBadge
            v-for="warning in result.warnings"
            :key="warning"
            :label="warning"
            color="warning"
            variant="subtle"
            icon="lucide:triangle-alert"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2" aria-label="地址属性">
          <UBadge
            :label="summary?.private ? '私有地址' : '公网地址'"
            :color="summary?.private ? 'primary' : 'neutral'"
            variant="subtle"
          />
          <UBadge :label="summary?.specialUse ?? ''" color="neutral" variant="subtle" />
          <UBadge :label="`可用主机 ${groupThousands(String(summary?.usableHosts ?? 0))}`" color="neutral" variant="subtle" />
        </div>

        <section class="flex flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">子网信息</h2>
          <ul class="grid overflow-hidden rounded-xl border border-default sm:grid-cols-2">
            <li
              v-for="field in fields"
              :key="field.label"
              class="flex items-center gap-3 border-b border-default px-3 py-2 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
            >
              <span class="w-28 shrink-0 text-xs text-dimmed">{{ field.label }}</span>
              <code
                class="min-w-0 flex-1 break-all font-mono text-sm text-default"
                :class="field.label === 'CIDR 记法' ? 'font-bold text-highlighted' : ''"
              >
                {{ field.value }}
              </code>
              <CopyButton :text="field.copy ?? field.value" label="" size="xs" />
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-sm font-medium text-highlighted">子网拆分</h2>
            <label class="flex items-center gap-2">
              <span class="text-xs text-muted">借位数</span>
              <USelect v-model="factor" :items="factorItems" size="sm" class="w-40" aria-label="借位数" />
            </label>
          </div>

          <p v-if="!splitInfo?.ok" class="text-sm text-error">{{ splitInfo?.error }}</p>
          <template v-else>
            <p class="text-xs leading-relaxed text-muted">
              /{{ summary?.prefix }} 借 {{ factor }} 位 →
              <code class="rounded bg-elevated px-1 py-0.5">/{{ splitInfo.newPrefix }}</code>
              共 <strong class="text-highlighted">{{ groupThousands(String(splitInfo.blocks ?? 0)) }}</strong> 块，每块
              <code class="rounded bg-elevated px-1 py-0.5">{{ splitInfo.perSubnet }}</code> 个地址 /
              可用主机 <strong class="text-highlighted">{{ groupThousands(String(splitInfo.usablePerSubnet ?? 0)) }}</strong>
              台。
            </p>
            <p v-if="subnetRows.error" class="text-sm text-error">{{ subnetRows.error }}</p>
            <div v-else class="overflow-x-auto">
              <table class="w-full min-w-[46rem] border-collapse text-left font-mono text-xs">
                <thead>
                  <tr class="border-b border-default text-dimmed">
                    <th class="w-10 py-1.5 pe-2 text-right font-normal">#</th>
                    <th class="py-1.5 pe-2 font-normal">子网 CIDR</th>
                    <th class="py-1.5 pe-2 font-normal">网络地址</th>
                    <th class="py-1.5 pe-2 font-normal">首个可用</th>
                    <th class="py-1.5 pe-2 font-normal">末个可用</th>
                    <th class="py-1.5 pe-2 font-normal">广播地址</th>
                    <th class="py-1.5 text-right font-normal">可用</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in subnetRows.rows"
                    :key="row.cidr"
                    class="border-b border-default/60 last:border-b-0"
                  >
                    <td class="py-1.5 pe-2 text-right text-dimmed">{{ row.index }}</td>
                    <td class="py-1.5 pe-2 font-bold text-highlighted">{{ row.cidr }}</td>
                    <td class="py-1.5 pe-2 text-default">{{ row.network }}</td>
                    <td class="py-1.5 pe-2 text-muted">{{ row.firstHost }}</td>
                    <td class="py-1.5 pe-2 text-muted">{{ row.lastHost }}</td>
                    <td class="py-1.5 pe-2 text-muted">{{ row.broadcast }}</td>
                    <td class="py-1.5 text-right text-muted">{{ groupThousands(String(row.usableHosts)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="subnetRows.truncated" class="text-xs text-dimmed">
              本次共 {{ groupThousands(String(subnetRows.total)) }} 个子网，为避免渲染过长只列出前
              {{ MAX_LISTED_SUBNETS }} 个；地址规律是每块递增
              {{ groupThousands(String(splitInfo.perSubnet ?? 0)) }}。
            </p>
          </template>
        </section>

        <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
          <h2 class="text-sm font-medium text-highlighted">按主机数规划</h2>
          <div class="flex flex-wrap items-end gap-3">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs text-muted">需要容纳的主机数</span>
              <input
                v-model.number="hostsNeeded"
                type="number"
                min="1"
                class="h-9 w-32 rounded-lg border border-default px-3 font-mono text-sm text-default outline-none focus:border-primary/50"
                aria-label="需要容纳的主机数"
              />
            </label>
            <p v-if="plan.ok" class="text-sm leading-relaxed text-muted">
              建议 <code class="rounded bg-elevated px-1 py-0.5 font-mono">/{{ plan.prefix }}</code>
              （掩码 <code class="rounded bg-elevated px-1 py-0.5 font-mono">{{ plan.mask }}</code>），可用主机
              <strong class="text-highlighted">{{ groupThousands(String(plan.usableHosts ?? 0)) }}</strong> 台，余量
              {{ groupThousands(String(plan.slackHosts ?? 0)) }} 台。
            </p>
            <p v-else class="text-sm text-error">{{ plan.error }}</p>
          </div>
          <p class="text-xs leading-relaxed text-dimmed">
            需要 2 台时推荐 <code class="rounded bg-elevated px-1 py-0.5">/30</code> 而非
            <code class="rounded bg-elevated px-1 py-0.5">/31</code>：RFC 3021 的
            <code class="rounded bg-elevated px-1 py-0.5">/31</code>
            只适用于点对点链路，普通网段规划不宜使用。
          </p>
        </section>
      </template>

      <p class="text-xs leading-relaxed text-dimmed">
        全部计算在浏览器内完成：掩码用
        <code class="rounded bg-elevated px-1 py-0.5">2³² − 2^(32−prefix)</code>
        而非 32 位移位，避开 JS 有符号整数的符号位截断；可用主机数按
        <code class="rounded bg-elevated px-1 py-0.5">/31 → 2</code>、<code
          class="rounded bg-elevated px-1 py-0.5"
        >/32 → 1</code
        >、其余「总数 − 2」计算。有类别归属与反向解析仅供查阅，现代网络一律按 CIDR 转发。
      </p>
    </div>
  </ToolShell>
</template>
