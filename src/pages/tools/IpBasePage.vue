<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  classify,
  formatsOf,
  fromInteger,
  IP_SAMPLES,
  parseIp,
  type IpClass,
  type ParseIpResult
} from '~/tools/ip-base'
import { useStored } from '~/composables/useStored'

const inputModes = [
  { label: '按 IP 写法解析', value: 'ip' as const },
  { label: '按整数还原（十进制 / 0x）', value: 'int' as const }
]
type InputMode = (typeof inputModes)[number]['value']

const scopeColor: Record<IpClass['scope'], 'success' | 'primary' | 'info' | 'warning' | 'neutral'> = {
  public: 'success',
  private: 'primary',
  loopback: 'info',
  'link-local': 'info',
  multicast: 'warning',
  reserved: 'neutral'
}

const mode = useStored<InputMode>('tool.ip-base.mode', 'ip')
const input = useStored('tool.ip-base.input', '192.0.2.145')

const parsed = computed<ParseIpResult>(() =>
  !input.value.trim()
    ? { ok: false, error: '请输入一个 IP 地址或整数。', hints: [] }
    : mode.value === 'ip'
      ? parseIp(input.value)
      : fromInteger(input.value)
)

/** 先分成两个 computed，模板里 `v-if="ip"` 的窄化才靠得住 */
const ip = computed(() => (parsed.value.ok ? parsed.value : null))
const failure = computed(() => (parsed.value.ok ? null : parsed.value))

const classOf = computed(() => (ip.value ? classify(ip.value) : null))
const formats = computed(() => (ip.value ? formatsOf(ip.value) : []))
const bytesText = computed(() =>
  ip.value ? ip.value.bytes.map((byte) => String(byte).padStart(3, ' ')).join(' ') : ''
)
</script>

<template>
  <ToolShell tool-id="ip-base">
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="mode" :items="inputModes" size="lg" class="w-60" aria-label="输入方式" />
      <UFormField label="输入" class="min-w-56 flex-1">
        <UInput
          v-model="input"
          size="lg"
          placeholder="192.0.2.145 / ::ffff:192.0.2.145 / 3221226129 / 0xc0000291"
          :ui="{ base: 'font-mono text-sm' }"
          :color="ip ? undefined : 'error'"
        />
      </UFormField>
      <UButton
        icon="lucide:eraser"
        label="清空"
        color="neutral"
        variant="ghost"
        size="lg"
        @click="input = ''"
      />
    </div>

    <UAlert v-if="failure" color="error" variant="subtle" icon="lucide:circle-alert" title="解析失败">
      <template #description>
        <p>{{ failure.error }}</p>
        <ul v-if="failure.hints.length" class="mt-1 flex flex-col gap-0.5">
          <li v-for="hint in failure.hints" :key="hint">· {{ hint }}</li>
        </ul>
      </template>
    </UAlert>

    <template v-if="ip">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <UBadge :label="`IPv${ip.family}`" color="primary" variant="subtle" />
        <UBadge v-if="classOf" :label="classOf.label" :color="scopeColor[classOf.scope]" variant="soft" />
        <UBadge v-if="classOf" :label="classOf.detail" color="neutral" variant="ghost" class="font-mono" />
        <UBadge :label="ip.family === 4 ? '32 位' : '128 位'" color="neutral" variant="subtle" />
        <span class="font-mono text-muted">{{ ip.normalized }}</span>
      </div>

      <ul v-if="ip.warnings.length" class="flex flex-col gap-1 text-xs text-warning">
        <li v-for="warn in ip.warnings" :key="warn">· {{ warn }}</li>
      </ul>

      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">等价写法</h2>
          <span class="text-xs text-dimmed">逐条复制，回去都能被本工具重新解析</span>
        </div>
        <ul class="overflow-hidden rounded-xl border border-default">
          <li
            v-for="item in formats"
            :key="item.label"
            class="flex flex-wrap items-center gap-2 border-b border-default px-3 py-2 last:border-b-0 even:bg-elevated/50"
          >
            <span class="w-36 shrink-0 text-xs text-muted">{{ item.label }}</span>
            <code class="min-w-0 flex-1 break-all font-mono text-xs text-default">{{ item.value }}</code>
            <CopyButton :text="item.value" label="" size="xs" />
            <span v-if="item.note" class="w-full ps-0 text-[11px] text-dimmed sm:w-auto sm:ps-36">{{ item.note }}</span>
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">字节</h2>
        <div class="flex items-center gap-2">
          <code class="flex-1 overflow-auto rounded-lg bg-elevated px-3 py-2 font-mono text-xs text-default">{{ bytesText }}</code>
          <CopyButton :text="bytesText.trim()" label="" size="xs" />
        </div>
        <p v-if="ip.expanded" class="text-xs text-dimmed">
          全展开：<code class="rounded bg-elevated px-1 py-0.5 font-mono">{{ ip.expanded }}</code>
        </p>
      </section>
    </template>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-medium text-highlighted">快速填入</h2>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="sample in IP_SAMPLES"
          :key="sample.label"
          :label="`${sample.label} ${sample.value}`"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="input = sample.value; mode = /^\d+$/.test(sample.value) ? 'int' : 'ip'"
        />
      </div>
    </section>

    <p class="text-xs text-dimmed">
      IPv4 的简写按 C 库 <code class="rounded bg-elevated px-1 py-0.5">inet_aton</code> 规则展开（
      <code class="rounded bg-elevated px-1 py-0.5">10.1</code> 是 10.0.0.1），前导 0 当八进制处理并一定给警告；
      IPv6 压缩按 RFC 5952：只压最长最靠前的全零段、字母小写。反向解析域 IPv4 用
      <code class="rounded bg-elevated px-1 py-0.5">in-addr.arpa</code>、IPv6 用半字节反写的
      <code class="rounded bg-elevated px-1 py-0.5">ip6.arpa</code>。全部计算在本地完成。
    </p>
  </ToolShell>
</template>
