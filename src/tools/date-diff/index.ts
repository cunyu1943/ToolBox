export const DAY_MS = 86_400_000
/** 日期差最多跨度 100 年，避免逐日循环被超大区间拖住 */
export const MAX_RANGE_DAYS = 36_600

export interface CalendarDate {
  y: number
  m: number
  d: number
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29
  return DAYS_IN_MONTH[month - 1] ?? 31
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365
}

/** `Date.UTC` 会把 0–99 年映射到 1900+，这里显式覆盖年份，保证公元前后的两位数年也正确 */
export function toUtcMs(date: CalendarDate): number {
  const base = new Date(Date.UTC(2000, date.m - 1, date.d))
  base.setUTCFullYear(date.y)
  return base.getTime()
}

export function partsOf(ms: number): CalendarDate {
  const date = new Date(ms)
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() }
}

export function weekdayOf(ms: number): number {
  return new Date(ms).getUTCDay()
}

export function isValidDate(date: CalendarDate): boolean {
  return (
    Number.isInteger(date.y) &&
    Number.isInteger(date.m) &&
    Number.isInteger(date.d) &&
    date.m >= 1 &&
    date.m <= 12 &&
    date.d >= 1 &&
    date.d <= daysInMonth(date.y, date.m)
  )
}

const PATTERNS: { re: RegExp; pick: (m: RegExpMatchArray) => CalendarDate }[] = [
  { re: /^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?$/, pick: (m) => ({ y: +m[1]!, m: +m[2]!, d: +m[3]! }) },
  { re: /^(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})$/, pick: (m) => ({ y: +m[3]!, m: +m[1]!, d: +m[2]! }) },
  { re: /^(\d{4})(\d{2})(\d{2})$/, pick: (m) => ({ y: +m[1]!, m: +m[2]!, d: +m[3]! }) }
]

export interface DateParseResult {
  ok: boolean
  ms?: number
  parts?: CalendarDate
  iso?: string
  error?: string
  warnings: string[]
}

/** 接受 `2026-09-23` / `2026/9/23` / `2026.9.23` / `2026年9月23日` / `23/9/2026` / `20260923`，带时间的输入按日期截取 */
export function parseDateText(input: string): DateParseResult {
  const warnings: string[] = []
  let text = (input ?? '').trim()
  if (!text) return { ok: false, error: '请输入日期', warnings }

  const withoutTime = text.replace(/[T\s]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i, '')
  if (withoutTime !== text) {
    warnings.push('已忽略时间部分，本工具按「日历日」计算')
    text = withoutTime.trim()
  }

  for (const [index, { re, pick }] of PATTERNS.entries()) {
    const matched = text.match(re)
    if (!matched) continue
    const parts = pick(matched)
    if (index === 1 && parts.m > 12 && parts.d <= 12) {
      parts.m = +matched[2]!
      parts.d = +matched[1]!
    } else if (index === 1 && parts.m <= 12 && parts.d <= 12) {
      warnings.push(`「${text}」按 月/日/年 解析为 ${formatIso(parts)}，有歧义时建议写 2026-09-23`)
    }
    if (parts.m > 12 || parts.m < 1) {
      return { ok: false, error: `月份 ${parts.m} 无效（应为 1–12）`, warnings }
    }
    if (!isValidDate(parts)) {
      return {
        ok: false,
        error: `${parts.y}-${parts.m}-${parts.d} 不是真实日期（${parts.m} 月最多 ${daysInMonth(parts.y, parts.m)} 天）`,
        warnings
      }
    }
    const ms = toUtcMs(parts)
    return { ok: true, ms, parts, iso: formatIso(parts), warnings }
  }

  return { ok: false, error: '无法识别，试试 2026-09-23、2026/9/23 或 2026年9月23日', warnings }
}

export function formatIso(date: CalendarDate): string {
  return `${String(date.y).padStart(4, '0')}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
}

export function formatCn(date: CalendarDate): string {
  return `${date.y}年${date.m}月${date.d}日`
}

export function isoWeekOf(ms: number): { year: number; week: number; weekday: number } {
  const weekday = weekdayOf(ms) || 7
  const thursday = ms + (4 - weekday) * DAY_MS
  const year = partsOf(thursday).y
  const jan1 = toUtcMs({ y: year, m: 1, d: 1 })
  const week = Math.ceil(((thursday - jan1) / DAY_MS + 1) / 7)
  return { year, week, weekday }
}

/** 12 月 28 日一定落在该 ISO 年的最后一周 */
export function isoWeeksInYear(year: number): number {
  return isoWeekOf(toUtcMs({ y: year, m: 12, d: 28 })).week
}

export interface DateDescription {
  iso: string
  cn: string
  weekday: string
  isoWeek: string
  weekOf: number
  weeksInYear: number
  dayOfYear: number
  daysLeft: number
  quarter: string
  monthDays: number
  leap: boolean
}

export function describeDate(ms: number): DateDescription {
  const parts = partsOf(ms)
  const jan1 = toUtcMs({ y: parts.y, m: 1, d: 1 })
  const dayOfYear = Math.round((ms - jan1) / DAY_MS) + 1
  const week = isoWeekOf(ms)
  return {
    iso: formatIso(parts),
    cn: formatCn(parts),
    weekday: WEEKDAY_LABELS[weekdayOf(ms)] ?? '',
    isoWeek: `${week.year}-W${String(week.week).padStart(2, '0')}`,
    weekOf: week.week,
    weeksInYear: isoWeeksInYear(parts.y),
    dayOfYear,
    daysLeft: daysInYear(parts.y) - dayOfYear,
    quarter: `Q${Math.floor((parts.m - 1) / 3) + 1}`,
    monthDays: daysInMonth(parts.y, parts.m),
    leap: isLeapYear(parts.y)
  }
}

/** 加 n 个月并按月末截断，保证「起点 + 整月数 ≤ 终点」的判断与 shiftDate 一致 */
function addMonthsToDate(date: CalendarDate, months: number): CalendarDate {
  const index = date.y * 12 + (date.m - 1) + months
  const y = Math.floor(index / 12)
  const m = (index % 12) + 1
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) }
}

/**
 * 按日历拆成「年/月/日」。用「不断加整月直到超过终点」的方式，
 * 因为月末截断（1/31 + 1 月 = 2/28）会让一次借位的写法算出负数天。
 */
function calendarBetween(a: CalendarDate, b: CalendarDate): { years: number; months: number; days: number } {
  let months = 0
  while (toUtcMs(addMonthsToDate(a, months + 1)) <= toUtcMs(b)) months += 1
  const landed = addMonthsToDate(a, months)
  const days = Math.round((toUtcMs(b) - toUtcMs(landed)) / DAY_MS)
  return { years: Math.floor(months / 12), months: months % 12, days }
}

export interface DateDiff {
  ok: boolean
  error?: string
  signedDays: number
  days: number
  weeks: number
  remainder: number
  monthsTotal: number
  calendar: { years: number; months: number; days: number }
  direction: 'forward' | 'backward' | 'same'
  from: string
  to: string
  spanLabel: string
}

export function diffDates(fromMs: number, toMs: number): DateDiff {
  const signedDays = Math.round((toMs - fromMs) / DAY_MS)
  const days = Math.abs(signedDays)
  const [early, late] = fromMs <= toMs ? [partsOf(fromMs), partsOf(toMs)] : [partsOf(toMs), partsOf(fromMs)]
  const calendar = calendarBetween(early, late)
  const monthsTotal = calendar.years * 12 + calendar.months
  return {
    ok: true,
    signedDays,
    days,
    weeks: Math.floor(days / 7),
    remainder: days % 7,
    monthsTotal,
    calendar,
    direction: signedDays === 0 ? 'same' : signedDays > 0 ? 'forward' : 'backward',
    from: formatIso(partsOf(fromMs)),
    to: formatIso(partsOf(toMs)),
    spanLabel:
      signedDays === 0
        ? '同一天'
        : `${calendar.years > 0 ? `${calendar.years} 年 ` : ''}${calendar.months > 0 ? `${calendar.months} 个月 ` : ''}${calendar.days} 天`
  }
}

export interface DateOffset {
  years: number
  months: number
  days: number
}

/** 先按日历加年月（月末自动截断，如 1/31 + 1 月 = 2/28），再加天数 */
export function shiftDate(ms: number, offset: DateOffset): number {
  const shifted = addMonthsToDate(partsOf(ms), offset.years * 12 + offset.months)
  return toUtcMs(shifted) + offset.days * DAY_MS
}

export function daysFromToday(ms: number, todayMs: number): number {
  return Math.round((ms - todayMs) / DAY_MS)
}

export function parseDateList(text: string): { list: number[]; invalid: string[] } {
  const tokens = (text ?? '')
    .split(/[\s,，、;；]+/)
    .map((token) => token.trim())
    .filter(Boolean)
  const list: number[] = []
  const invalid: string[] = []
  for (const token of tokens) {
    const parsed = parseDateText(token)
    if (parsed.ok && parsed.ms !== undefined) list.push(parsed.ms)
    else invalid.push(token)
  }
  return { list, invalid }
}

export interface WorkdayReport {
  ok: boolean
  error?: string
  totalDays: number
  workdays: number
  weekendDays: number
  holidayOnWorkday: number
  effectiveWorkdays: number
  perWeekday: { label: string; count: number }[]
  skippedHolidays: string[]
}

/** 闭区间统计：`holidays` 是节假日的 UTC 毫秒集合 */
export function countWorkdays(fromMs: number, toMs: number, holidays: Set<number>): WorkdayReport {
  const start = Math.min(fromMs, toMs)
  const end = Math.max(fromMs, toMs)
  const totalDays = Math.round((end - start) / DAY_MS) + 1
  if (totalDays > MAX_RANGE_DAYS) {
    return {
      ok: false,
      error: `区间跨度 ${totalDays} 天，超过 ${MAX_RANGE_DAYS} 天上限，请缩小范围`,
      totalDays,
      workdays: 0,
      weekendDays: 0,
      holidayOnWorkday: 0,
      effectiveWorkdays: 0,
      perWeekday: WEEKDAY_LABELS.map((label) => ({ label, count: 0 })),
      skippedHolidays: []
    }
  }

  const perWeekday = new Array(7).fill(0) as number[]
  let workdays = 0
  let weekendDays = 0
  let holidayOnWorkday = 0
  const skippedHolidays: string[] = []

  for (let cursor = start; cursor <= end; cursor += DAY_MS) {
    const weekday = weekdayOf(cursor)
    perWeekday[weekday] = (perWeekday[weekday] ?? 0) + 1
    const isWeekend = weekday === 0 || weekday === 6
    if (isWeekend) {
      weekendDays += 1
      continue
    }
    workdays += 1
    if (holidays.has(cursor)) {
      holidayOnWorkday += 1
      skippedHolidays.push(formatIso(partsOf(cursor)))
    }
  }

  return {
    ok: true,
    totalDays,
    workdays,
    weekendDays,
    holidayOnWorkday,
    effectiveWorkdays: workdays - holidayOnWorkday,
    perWeekday: WEEKDAY_LABELS.map((label, index) => ({ label, count: perWeekday[index] ?? 0 })),
    skippedHolidays
  }
}
