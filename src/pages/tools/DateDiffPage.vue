<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  countWorkdays,
  describeDate,
  diffDates,
  formatIso,
  parseDateList,
  parseDateText,
  shiftDate,
  toUtcMs,
  daysFromToday,
  type DateDescription
} from '~/tools/date-diff'
import { useStored } from '~/composables/useStored'

type OffsetKey = 'years' | 'months' | 'days'

function todayParts() {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}

const nowMs = toUtcMs(todayParts())
const todayIso = formatIso(todayParts())

const fromText = useStored('tool.date-diff.from', '2026-01-01')
const toText = useStored('tool.date-diff.to', todayIso)
const holidayText = useStored('tool.date-diff.holidays', '2026-01-01\n2026-02-16\n2026-05-01')
const skipWeekend = useStored('tool.date-diff.skipWeekend', true)
const skipHoliday = useStored('tool.date-diff.skipHoliday', true)
const baseText = useStored('tool.date-diff.base', todayIso)
const offset = useStored<Record<OffsetKey, number>>('tool.date-diff.offset', { years: 0, months: 0, days: 30 })

const offsetFields: { key: OffsetKey; label: string }[] = [
  { key: 'years', label: '年' },
  { key: 'months', label: '月' },
  { key: 'days', label: '日' }
]

const from = computed(() => parseDateText(fromText.value))
const to = computed(() => parseDateText(toText.value))
const base = computed(() => parseDateText(baseText.value))

const parseErrors = computed(() => {
  const list: string[] = []
  if (!from.value.ok) list.push(`起始日期：${from.value.error}`)
  if (!to.value.ok) list.push(`结束日期：${to.value.error}`)
  if (!base.value.ok) list.push(`推算基准：${base.value.error}`)
  return list
})
const parseWarnings = computed(() => [...from.value.warnings, ...to.value.warnings, ...base.value.warnings])

const diff = computed(() =>
  from.value.ok && to.value.ok ? diffDates(from.value.ms as number, to.value.ms as number) : null
)
const fromInfo = computed(() => (from.value.ok ? describeDate(from.value.ms as number) : null))
const toInfo = computed(() => (to.value.ok ? describeDate(to.value.ms as number) : null))
const endpoints = computed<{ title: string; info: DateDescription }[]>(() => {
  const list: { title: string; info: DateDescription }[] = []
  if (fromInfo.value) list.push({ title: '起始', info: fromInfo.value })
  if (toInfo.value) list.push({ title: '结束', info: toInfo.value })
  return list
})

const directionSentence = computed(() => {
  if (!diff.value || !fromInfo.value || !toInfo.value) return ''
  if (diff.value.signedDays === 0) return '两个日期是同一天'
  const forward = diff.value.signedDays > 0
  const earlier = forward ? fromInfo.value : toInfo.value
  const later = forward ? toInfo.value : fromInfo.value
  return `${later.iso} 距 ${earlier.iso} ${diff.value.spanLabel}`
})

function relativeToToday(iso: string): string {
  const parsed = parseDateText(iso)
  if (!parsed.ok) return ''
  const delta = daysFromToday(parsed.ms as number, nowMs)
  if (delta === 0) return '今天'
  return delta > 0 ? `${delta} 天后` : `${-delta} 天前`
}

const shifted = computed(() => {
  if (!base.value.ok) return null
  const ms = shiftDate(base.value.ms as number, {
    years: Math.trunc(Number(offset.value.years) || 0),
    months: Math.trunc(Number(offset.value.months) || 0),
    days: Math.trunc(Number(offset.value.days) || 0)
  })
  const info = describeDate(ms)
  return { info, relative: relativeToToday(info.iso) }
})

const holidays = computed(() => parseDateList(holidayText.value))

const work = computed(() => {
  if (!from.value.ok || !to.value.ok) return null
  const report = countWorkdays(
    from.value.ms as number,
    to.value.ms as number,
    new Set(skipHoliday.value ? holidays.value.list : [])
  )
  if (!report.ok) return { report, effective: 0 }
  let effective = report.totalDays
  if (skipWeekend.value) effective = report.workdays
  if (skipHoliday.value) effective -= report.holidayOnWorkday
  return { report, effective }
})

const workNote = computed(() => {
  const flags = [skipWeekend.value ? '排除周末' : '', skipHoliday.value ? '排除节假日' : ''].filter(Boolean)
  return flags.length ? `统计口径：${flags.join(' + ')}` : '统计口径：全部自然日'
})

function swap() {
  const nextFrom = toText.value
  toText.value = fromText.value
  fromText.value = nextFrom
}

function useToday() {
  fromText.value = todayIso
  toText.value = todayIso
}

function resetOffset() {
  offset.value = { years: 0, months: 0, days: 0 }
}
</script>

<template>
  <ToolShell tool-id="date-diff">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
        <label class="flex min-w-44 flex-1 flex-col gap-1.5">
          <span class="text-sm text-muted">起始日期</span>
          <UInput
            v-model="fromText"
            size="lg"
            spellcheck="false"
            autocomplete="off"
            placeholder="2026-01-01"
            :ui="{ base: 'font-mono' }"
            :aria-invalid="from.ok ? 'false' : 'true'"
          />
        </label>
        <label class="flex min-w-44 flex-1 flex-col gap-1.5">
          <span class="text-sm text-muted">结束日期</span>
          <UInput
            v-model="toText"
            size="lg"
            spellcheck="false"
            autocomplete="off"
            placeholder="2026/9/23"
            :ui="{ base: 'font-mono' }"
            :aria-invalid="to.ok ? 'false' : 'true'"
          />
        </label>
        <UButton icon="lucide:arrow-down-up" label="交换" color="neutral" variant="outline" size="lg" @click="swap" />
        <UButton
          icon="lucide:calendar-days"
          label="都设为今天"
          color="neutral"
          variant="ghost"
          size="lg"
          @click="useToday"
        />
      </div>

      <UAlert
        v-if="parseErrors.length"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        title="日期无法解析"
        :description="parseErrors.join('；')"
      />
      <p v-for="warning in parseWarnings" :key="warning" class="text-xs text-warning">{{ warning }}</p>

      <section
        v-if="diff && endpoints.length === 2"
        class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4"
      >
        <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p class="text-2xl font-bold text-highlighted">{{ diff.days }} 天</p>
          <p class="text-sm text-muted">{{ diff.spanLabel }}</p>
          <p class="text-sm text-muted">
            {{ diff.weeks }} 周{{ diff.remainder ? ` 余 ${diff.remainder} 天` : '' }} · 整月数 {{ diff.monthsTotal }}
          </p>
        </div>
        <p class="text-sm text-muted">{{ directionSentence }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="item in endpoints" :key="item.title" class="rounded-lg border border-default p-3">
            <p class="text-sm font-medium text-highlighted">{{ item.title }} · {{ item.info.cn }}</p>
            <ul class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <li>{{ item.info.weekday }}</li>
              <li>ISO {{ item.info.isoWeek }}（全年 {{ item.info.weeksInYear }} 周）</li>
              <li>年内第 {{ item.info.dayOfYear }} 天 · 剩 {{ item.info.daysLeft }} 天</li>
              <li>{{ item.info.quarter }} · 本月 {{ item.info.monthDays }} 天</li>
              <li>{{ relativeToToday(item.info.iso) }}</li>
            </ul>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <CopyButton :text="String(diff.days)" label="复制天数" />
          <CopyButton :text="diff.spanLabel" label="复制「年 月 日」" />
        </div>
      </section>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">日期推算</h2>
        <div class="flex flex-wrap items-end gap-3">
          <label class="flex min-w-40 flex-col gap-1.5">
            <span class="text-sm text-muted">基准日期</span>
            <UInput
              v-model="baseText"
              size="lg"
              spellcheck="false"
              autocomplete="off"
              placeholder="2026-09-23"
              :ui="{ base: 'font-mono' }"
            />
          </label>
          <label v-for="field in offsetFields" :key="field.key" class="flex w-20 flex-col gap-1.5">
            <span class="text-sm text-muted">{{ field.label }}</span>
            <input
              v-model.number="offset[field.key]"
              type="number"
              class="h-11 w-full rounded-lg border border-default px-3 font-mono text-sm text-default outline-none focus:border-primary/50"
              :aria-label="`偏移${field.label}`"
            />
          </label>
          <UButton icon="lucide:equal" label="清零" color="neutral" variant="ghost" size="lg" @click="resetOffset" />
        </div>
        <div v-if="shifted" class="flex flex-wrap items-center gap-2">
          <UBadge :label="`结果 ${shifted.info.cn}（${shifted.info.weekday}）`" color="primary" variant="subtle" />
          <UBadge :label="shifted.relative" color="neutral" variant="subtle" />
          <UBadge :label="`ISO ${shifted.info.isoWeek}`" color="neutral" variant="subtle" />
          <CopyButton :text="shifted.info.iso" label="复制 ISO" />
        </div>
        <p class="text-xs text-dimmed">
          先加年月并按月末截断（2026-01-31 加 1 个月 = 2026-02-28），再加天数；偏移填负数即向前推。
        </p>
      </section>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-highlighted">工作日统计</h2>
          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-muted">
              <USwitch v-model="skipWeekend" size="sm" aria-label="排除周末" />
              排除周末
            </label>
            <label class="flex items-center gap-2 text-sm text-muted">
              <USwitch v-model="skipHoliday" size="sm" aria-label="排除节假日" />
              排除节假日
            </label>
          </div>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">节假日清单（每行一个日期，也可用逗号分隔）</span>
          <UTextarea
            v-model="holidayText"
            :rows="4"
            spellcheck="false"
            placeholder="2026-10-01&#10;2026-10-02"
            :ui="{ base: 'font-mono text-sm resize-y' }"
          />
        </label>

        <p v-if="holidays.invalid.length" class="text-xs text-warning">无法识别：{{ holidays.invalid.join('、') }}</p>

        <template v-if="work && work.report.ok">
          <div class="flex flex-wrap items-center gap-2" aria-label="工作日统计结果">
            <UBadge :label="`可上班 ${work.effective} 天`" color="primary" variant="subtle" />
            <UBadge :label="`自然日 ${work.report.totalDays}`" color="neutral" variant="subtle" />
            <UBadge :label="`周末 ${work.report.weekendDays}`" color="neutral" variant="subtle" />
            <UBadge :label="`节假日撞工作日 ${work.report.holidayOnWorkday}`" color="neutral" variant="subtle" />
            <UBadge :label="workNote" color="neutral" variant="subtle" />
          </div>
          <ul class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <li
              v-for="item in work.report.perWeekday"
              :key="item.label"
              class="rounded-lg border border-default px-2 py-1.5 text-center"
            >
              <p class="text-xs text-dimmed">{{ item.label }}</p>
              <p class="font-mono text-sm text-highlighted">{{ item.count }}</p>
            </li>
          </ul>
          <p v-if="work.report.skippedHolidays.length" class="text-xs text-dimmed">
            区间内计入的节假日：{{ work.report.skippedHolidays.join('、') }}
          </p>
        </template>
        <p v-else-if="work" class="text-sm text-error">{{ work.report.error }}</p>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        全部按 <strong class="text-muted">UTC 日历日</strong>计算（<code class="rounded bg-elevated px-1 py-0.5">Date.UTC</code>），
        不引入本地时区与夏令时，因此「相差天数」恒等于两个日历日之差，跨夏令时的区间也不会出现 23/25 小时的偏差。
        ISO 周遵循 ISO 8601：周一为一周之始，包含该年第一个周四的那一周为第 1 周。
      </p>
    </div>
  </ToolShell>
</template>
