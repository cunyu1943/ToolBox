<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { commonZones, decodeTimestamp, encodeDate, formatInZone, humanizeDuration } from '~/tools/timestamp'
import { useStored } from '~/composables/useStored'

type UnitChoice = 'auto' | 's' | 'ms'

const unitItems: { label: string; value: UnitChoice }[] = [
  { label: '自动判断位数', value: 'auto' },
  { label: '秒', value: 's' },
  { label: '毫秒', value: 'ms' }
]

const stampInput = useStored('tool.timestamp.stamp', String(Math.floor(Date.now() / 1000)))
const unit = useStored<UnitChoice>('tool.timestamp.unit', 'auto')
const dateInput = useStored('tool.timestamp.date', 'now')

const now = ref(Date.now())
const timer = setInterval(() => (now.value = Date.now()), 1000)
onScopeDispose(() => clearInterval(timer))

const decoded = computed(() => decodeTimestamp(stampInput.value, unit.value))
const encoded = computed(() => encodeDate(dateInput.value))
const encodedStamp = computed(() => (encoded.value.ok ? encoded.value.ms : undefined))

const zones = computed(() => {
  const ms = decoded.value.ok ? decoded.value.ms : encodedStamp.value
  if (ms === undefined) return []
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const list = [localZone, ...commonZones.filter((zone) => zone !== localZone)]
  return list.map((zone) => ({ zone, text: formatInZone(ms, zone) }))
})

const diffFromNow = computed(() => {
  if (!decoded.value.ok || decoded.value.ms === undefined) return ''
  return humanizeDuration(decoded.value.ms - now.value)
})

function useNow() {
  stampInput.value = String(Math.floor(Date.now() / 1000))
  unit.value = 's'
  dateInput.value = 'now'
}

const secondsOfNow = computed(() => Math.floor(now.value / 1000))
const millisOfNow = computed(() => now.value)
</script>

<template>
  <ToolShell tool-id="timestamp">
    <div class="flex flex-col gap-6">
      <section class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">此刻</h2>
          <span class="text-xs text-dimmed">每秒自动刷新</span>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p class="text-xs text-dimmed">秒</p>
            <p class="font-mono text-lg text-highlighted">{{ secondsOfNow }}</p>
          </div>
          <div>
            <p class="text-xs text-dimmed">毫秒</p>
            <p class="font-mono text-sm break-all text-highlighted">{{ millisOfNow }}</p>
          </div>
          <div class="flex items-end gap-2">
            <UButton icon="lucide:play" label="填入此刻（秒）" size="sm" color="neutral" variant="outline" @click="useNow" />
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium text-highlighted">时间戳 → 日期</h2>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UInput
            v-model="stampInput"
            size="lg"
            class="sm:flex-1"
            placeholder="1760000000 或 1760000000000"
            :ui="{ base: 'font-mono' }"
          />
          <USelect v-model="unit" :items="unitItems" size="lg" class="sm:w-44" aria-label="单位" />
        </div>

        <UAlert
          v-if="!decoded.ok"
          color="error"
          variant="subtle"
          icon="lucide:circle-alert"
          title="无法解析"
          :description="decoded.error"
        />

        <template v-else>
          <dl class="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-default p-4 sm:grid-cols-2">
            <div v-for="row in decoded.breakdown" :key="row.label" class="flex min-w-0 flex-col">
              <dt class="text-xs text-dimmed">{{ row.label }}</dt>
              <dd class="break-all font-mono text-sm text-default">{{ row.value }}</dd>
            </div>
            <div class="flex min-w-0 flex-col">
              <dt class="text-xs text-dimmed">本地时区</dt>
              <dd class="font-mono text-sm text-default">{{ decoded.local }}</dd>
            </div>
            <div class="flex min-w-0 flex-col">
              <dt class="text-xs text-dimmed">距今</dt>
              <dd class="font-mono text-sm text-default">{{ decoded.relative }}（{{ diffFromNow }}）</dd>
            </div>
          </dl>

          <div class="flex items-center gap-2">
            <span class="text-xs text-muted">整段结果</span>
            <CopyButton :text="`${decoded.iso}`" size="xs" />
          </div>
        </template>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium text-highlighted">日期 → 时间戳</h2>
        <UInput
          v-model="dateInput"
          size="lg"
          placeholder="2026-09-23 08:30:00 / 2026-09-23T08:30:00+08:00 / now"
          :ui="{ base: 'font-mono' }"
        />
        <UAlert
          v-if="!encoded.ok"
          color="error"
          variant="subtle"
          icon="lucide:circle-alert"
          title="无法识别日期"
          :description="encoded.error"
        />
        <dl v-else class="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-default p-4 sm:grid-cols-3">
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">秒</dt>
            <dd class="font-mono text-sm text-default">{{ Math.floor((encoded.ms ?? 0) / 1000) }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">毫秒</dt>
            <dd class="break-all font-mono text-sm text-default">{{ encoded.ms }}</dd>
          </div>
          <div class="flex min-w-0 flex-col">
            <dt class="text-xs text-dimmed">ISO</dt>
            <dd class="break-all font-mono text-sm text-default">{{ new Date(encoded.ms ?? 0).toISOString() }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="zones.length" class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">多时区对照</h2>
        <p class="text-xs text-dimmed">第一个是你浏览器的本地时区；未识别的缩写（如 CST）请配合 ISO 串阅读。</p>
        <ul class="flex flex-col overflow-hidden rounded-xl border border-default">
          <li
            v-for="zone in zones"
            :key="zone.zone"
            class="flex flex-col gap-1 border-b border-default px-3 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
          >
            <span class="w-full shrink-0 font-mono text-xs text-primary sm:w-48">{{ zone.zone }}</span>
            <span class="min-w-0 flex-1 font-mono text-sm text-default">{{ zone.text }}</span>
          </li>
        </ul>
      </section>

      <p class="text-xs text-dimmed">
        换算走 <code class="rounded bg-elevated px-1 py-0.5">Date</code> 与
        <code class="rounded bg-elevated px-1 py-0.5">Intl.DateTimeFormat</code>，均为浏览器内置能力；
        秒级时间戳按 <code class="rounded bg-elevated px-1 py-0.5">×1000</code> 还原为毫秒，自动判断的阈值是 1e12。
      </p>
    </div>
  </ToolShell>
</template>
