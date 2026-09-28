<script setup lang="ts">
import { computed, watch } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { formatNumber } from '~/tools/calculator'
import { convertToAll, convertValue, findGroup, unitGroups, type Unit } from '~/tools/unit-convert'
import { useStored } from '~/composables/useStored'

const group = useStored('tool.unit.group', unitGroups[0]!.id)
const fromId = useStored('tool.unit.from', unitGroups[0]!.units[2]!.id)
const toId = useStored('tool.unit.to', unitGroups[0]!.units[3]!.id)
const raw = useStored('tool.unit.value', '1')

const current = computed(() => findGroup(group.value) ?? unitGroups[0]!)
const unitItems = computed(() => current.value.units.map((unit: Unit) => ({ label: unit.name, value: unit.id })))
const fromUnit = computed(() => current.value.units.find((unit) => unit.id === fromId.value))
const toUnit = computed(() => current.value.units.find((unit) => unit.id === toId.value))

// 换组后旧的单位 id 在新组里不存在，落到「第 2 个 → 第 3 个」这类可读默认值
watch(current, (next) => {
  if (!next.units.some((unit) => unit.id === fromId.value)) fromId.value = next.units[1]?.id ?? next.units[0]!.id
  if (!next.units.some((unit) => unit.id === toId.value)) toId.value = next.units[2]?.id ?? next.units[0]!.id
})

const amount = computed(() => {
  const text = raw.value.trim().replace(/,/g, '')
  const value = Number.parseFloat(text)
  return Number.isFinite(value) ? value : null
})

const converted = computed(() => {
  if (amount.value === null || !fromUnit.value || !toUnit.value) return null
  const result = convertValue(amount.value, fromUnit.value, toUnit.value)
  return result.ok ? result.value ?? null : null
})

const table = computed(() => {
  if (amount.value === null || !fromUnit.value) return []
  return convertToAll(amount.value, fromUnit.value, current.value).map((row) => ({
    ...row,
    text: formatNumber(row.value)
  }))
})

function swap() {
  const from = fromId.value
  fromId.value = toId.value
  toId.value = from
}

const sentence = computed(() => {
  if (converted.value === null || !fromUnit.value || !toUnit.value) return ''
  return `${formatNumber(amount.value as number)} ${fromUnit.value.symbol} = ${formatNumber(converted.value)} ${toUnit.value.symbol}`
})
</script>

<template>
  <ToolShell tool-id="unit-convert">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2" role="group" aria-label="单位组">
        <button
          v-for="entry in unitGroups"
          :key="entry.id"
          type="button"
          class="inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors"
          :class="
            group === entry.id
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-default text-muted glass-card hover:text-default'
          "
          :aria-pressed="group === entry.id"
          @click="group = entry.id"
        >
          {{ entry.label }}
          <span class="text-xs text-dimmed">{{ entry.units.length }}</span>
        </button>
      </div>

      <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">输入值（{{ current.base }}组）</span>
          <input
            v-model="raw"
            type="text"
            inputmode="decimal"
            spellcheck="false"
            class="h-11 w-full rounded-lg border border-default px-3 font-mono text-base text-default outline-none transition-colors focus:border-primary/50"
            :aria-invalid="amount === null ? 'true' : 'false'"
            aria-label="待换算的数值"
          />
        </label>
        <p v-if="amount === null" class="text-sm text-error">请输入一个有限数字</p>

        <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
          <label class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="text-sm text-muted">从</span>
            <USelect v-model="fromId" :items="unitItems" size="lg" class="w-full" aria-label="源单位" />
          </label>
          <UButton
            icon="lucide:arrow-down-up"
            label="交换"
            size="lg"
            color="neutral"
            variant="outline"
            class="justify-center sm:mb-0"
            @click="swap"
          />
          <label class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="text-sm text-muted">到</span>
            <USelect v-model="toId" :items="unitItems" size="lg" class="w-full" aria-label="目标单位" />
          </label>
        </div>

        <div v-if="sentence" class="flex flex-wrap items-center gap-3 border-t border-default pt-3">
          <p class="min-w-0 flex-1 break-all font-mono text-lg font-bold text-highlighted sm:text-xl">
            {{ sentence }}
          </p>
          <CopyButton :text="sentence" label="复制" size="sm" />
        </div>
      </div>

      <section class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">{{ current.label }} · 全表</h2>
          <span class="text-xs text-dimmed">基准单位为 {{ current.base }}</span>
        </div>
        <p v-if="amount === null" class="text-sm text-muted">填入数值后展示各组单位下的结果。</p>
        <ul v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="row in table"
            :key="row.unit.id"
            class="flex items-center justify-between gap-2 rounded-lg border border-default px-3 py-2"
            :class="row.unit.id === toUnit?.id ? 'border-primary/40 bg-primary/10' : ''"
          >
            <span class="min-w-0 text-sm text-muted">{{ row.unit.name }}</span>
            <code class="shrink-0 break-all font-mono text-sm text-default">{{ row.text }}</code>
          </li>
        </ul>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        线性单位按倍率精确换算；温度走偏移公式（°C ↔ °F ↔ K ↔ °Ré）。
        「月」按 30 天、「年」按 365 天、「马赫」按海平面音速 340.29 m/s 计，属约定值。
        数据存储同时给出 1000 进制（kB/MB）与 1024 进制（KiB/MiB）两套。
      </p>
    </div>
  </ToolShell>
</template>
