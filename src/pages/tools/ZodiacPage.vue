<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  WESTERN_SIGNS,
  ZODIAC_TABLE,
  chineseZodiac,
  signOfYearMonthDay,
  westernZodiac
} from '~/tools/zodiac'
import { parseDateText, partsOf } from '~/tools/date-diff'
import { useStored } from '~/composables/useStored'

const year = useStored('tool.zodiac.year', 2026)
const month = useStored('tool.zodiac.month', 9)
const day = useStored('tool.zodiac.day', 24)
const dateText = useStored('tool.zodiac.date', '1996-09-24')

const refYear = new Date().getFullYear()
const zodiac = computed(() => chineseZodiac(year.value ?? refYear, refYear))
const sign = computed(() => westernZodiac(month.value ?? 0, day.value ?? 0))

function fillFromDate(): void {
  const parsed = parseDateText(dateText.value ?? '')
  if (!parsed.ok || !parsed.parts) return
  year.value = parsed.parts.y
  month.value = parsed.parts.m
  day.value = parsed.parts.d
}

const fromBirth = computed(() => {
  const parsed = parseDateText(dateText.value ?? '')
  if (!parsed.ok || !parsed.parts) return null
  const { y, m, d } = parsed.parts
  return { iso: parsed.iso ?? '', ...signOfYearMonthDay(y, m, d) }
})

const elementColor = (element: string): 'primary' | 'success' | 'warning' | 'error' =>
  element === '火象' ? 'error' : element === '土象' ? 'success' : element === '风象' ? 'primary' : 'warning'

const currentYear = computed(() => chineseZodiac(refYear, refYear))
const today = partsOf(Date.now())
</script>

<template>
  <ToolShell tool-id="zodiac">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="年份（公历）" class="w-36">
        <UInputNumber v-model="year" :min="1" :max="9999" :step="1" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="月" class="w-24">
        <UInputNumber v-model="month" :min="1" :max="12" :step="1" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="日" class="w-24">
        <UInputNumber v-model="day" :min="1" :max="31" :step="1" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField label="或直接填出生日期" class="w-52">
        <UInput v-model="dateText" size="lg" class="w-full font-mono" placeholder="1996-09-24" @blur="fillFromDate" />
      </UFormField>
      <UButton label="读取日期" color="neutral" variant="soft" icon="lucide:arrow-down-to-line" @click="fillFromDate" />
    </div>

    <div class="flex flex-wrap gap-x-8 gap-y-3">
      <div class="flex min-w-40 flex-col gap-1">
        <p class="text-xs text-muted">生肖</p>
        <p class="text-3xl font-bold text-highlighted">
          {{ zodiac ? `${zodiac.animal}` : '—' }}
          <span v-if="zodiac" class="text-lg font-medium text-primary">{{ zodiac.ganzhi }}</span>
        </p>
        <p v-if="zodiac" class="text-xs text-muted">
          {{ zodiac.stem }}属{{ zodiac.element }} · {{ zodiac.branch }}年 · 本命年 {{ zodiac.recentYears.join(' / ') }}
        </p>
      </div>
      <div class="flex min-w-40 flex-col gap-1">
        <p class="text-xs text-muted">星座</p>
        <p class="text-3xl font-bold text-highlighted">{{ sign?.name ?? '日期无效' }}</p>
        <p v-if="sign" class="text-xs text-muted">
          {{ sign.en }} · {{ sign.element }} · {{ sign.from }}–{{ sign.to }}
        </p>
      </div>
      <div v-if="fromBirth" class="flex min-w-48 flex-col gap-1">
        <p class="text-xs text-muted">按出生日期 {{ fromBirth.iso }}</p>
        <p class="text-sm text-default">
          {{ fromBirth.zodiac?.animal ?? '—' }}年 · {{ fromBirth.sign?.name ?? '—' }}
        </p>
      </div>
      <div class="flex min-w-40 flex-col gap-1">
        <p class="text-xs text-muted">今年（{{ refYear }}）</p>
        <p class="text-sm text-default">{{ currentYear?.ganzhi }}{{ currentYear?.animal }}年</p>
      </div>
    </div>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-medium text-highlighted">十二地支与生肖</h2>
      <ul class="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        <li
          v-for="row in ZODIAC_TABLE"
          :key="row.branch"
          class="rounded-lg border px-2 py-1.5 text-xs"
          :class="zodiac?.branch === row.branch ? 'border-primary/40 bg-primary/10 text-highlighted' : 'border-default text-muted'"
        >
          <p class="font-medium">{{ row.branch }} · {{ row.animal }}</p>
          <p class="font-mono text-[11px]">{{ row.hours }}</p>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-medium text-highlighted">十二星座日期区间</h2>
      <ul class="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
        <li
          v-for="row in WESTERN_SIGNS"
          :key="row.name"
          class="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-xs"
          :class="sign?.name === row.name ? 'border-primary/40 bg-primary/10 text-highlighted' : 'border-default text-muted'"
        >
          <span class="font-medium">{{ row.name }}</span>
          <span class="font-mono">{{ row.from }}–{{ row.to }}</span>
          <UBadge :label="row.element" :color="elementColor(row.element)" variant="soft" size="sm" />
        </li>
      </ul>
    </section>

    <p class="text-xs text-dimmed">
      生肖按公历年近似，实际以春节（部分流派以立春）为界：{{ refYear }} 年 1—2 月间出生的人，生肖可能属于上一年。
      星座区间取通行版本，交界那一天前后可能漂移，需要精确到分钟时要查星历。
      当前参考日 {{ today.y }}-{{ today.m }}-{{ today.d }}，所有输入都留在本机。
    </p>
  </ToolShell>
</template>
