/**
 * 年龄计算：出生日期到参考日的「岁 / 月 / 日」拆解、总天数、下次生日倒计时与万天里程碑。
 *
 * 全程按「日历日」算（走 date-diff 的 UTC 毫秒），不碰时区与夏令时。
 * 生日对应日的取法遵循《民法典》期间计算的口径：当月没有该日（2 月 29 日出生、平年过生日）
 * 时以该月最后一日为准，即平年按 2 月 28 日满周岁 —— 与 JS `Date` 自动溢出到 3 月 1 日的行为不同，
 * 所以这里不用 `new Date(y, 1, 29)`，而是自己钳到月末。
 */

import {
  DAY_MS,
  WEEKDAY_LABELS,
  daysInMonth,
  formatIso,
  isValidDate,
  partsOf,
  toUtcMs,
  weekdayOf,
  type CalendarDate
} from '../date-diff/index.ts'

export interface AgeResult {
  ok: boolean
  error?: string
  /** 满周岁 */
  years: number
  /** 周岁之后再满的整月（0–11） */
  months: number
  /** 整月之后剩余的天数 */
  days: number
  /** 「28 岁 3 个月 5 天」；不足一岁自动省略前面的段 */
  label: string
  totalDays: number
  totalWeeks: number
  totalMonths: number
  birthWeekday: number
  /** 满一万个 / 一十万天等节点 */
  milestones: { atDays: number; date: CalendarDate; passed: boolean }[]
  nextBirthday: CalendarDate
  daysToNextBirthday: number
  nextBirthdayWeekday: number
  /** 下次生日当天满几周岁 */
  nextAge: number
  lastBirthday: CalendarDate
  notes: string[]
}

/** `date` 之后（含当天）的第 `n` 个「月对应日」，无对应日时取月末 */
export function addMonthsClamped(date: CalendarDate, n: number): CalendarDate {
  const index = date.y * 12 + (date.m - 1) + n
  const y = Math.floor(index / 12)
  const m = (index % 12 + 12) % 12 + 1
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) }
}

function addDays(date: CalendarDate, n: number): CalendarDate {
  return partsOf(toUtcMs(date) + n * DAY_MS)
}

/** 出生日在第 `year` 年的对应日（2 月 29 日在平年落到 2 月 28 日） */
function birthdayIn(birth: CalendarDate, year: number): CalendarDate {
  return { y: year, m: birth.m, d: Math.min(birth.d, daysInMonth(year, birth.m)) }
}

const MILESTONE_DAYS = [3650, 7300, 10_000, 20_000, 30_000]

export function computeAge(birth: CalendarDate, ref: CalendarDate): AgeResult {
  const fail = (error: string): AgeResult => ({
    ok: false,
    error,
    years: 0,
    months: 0,
    days: 0,
    label: '',
    totalDays: 0,
    totalWeeks: 0,
    totalMonths: 0,
    birthWeekday: 0,
    milestones: [],
    nextBirthday: birth,
    daysToNextBirthday: 0,
    nextBirthdayWeekday: 0,
    nextAge: 0,
    lastBirthday: birth,
    notes: []
  })

  if (!isValidDate(birth)) return fail(`出生日期 ${formatIso(birth)} 不是真实日期`)
  if (!isValidDate(ref)) return fail(`参考日期 ${formatIso(ref)} 不是真实日期`)

  const birthMs = toUtcMs(birth)
  const refMs = toUtcMs(ref)
  if (birthMs > refMs) return fail('出生日期晚于参考日期')

  // 先数整月，再按锚点补天数：这样 1 月 31 日到 3 月 1 日得「1 个月 1 天」，
  // 而「先减年减月再借位」的写法会算出负的剩余天数。
  let totalMonths = (ref.y - birth.y) * 12 + (ref.m - birth.m)
  let anchor = addMonthsClamped(birth, totalMonths)
  if (toUtcMs(anchor) > refMs) {
    totalMonths -= 1
    anchor = addMonthsClamped(birth, totalMonths)
  }
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  const days = Math.round((refMs - toUtcMs(anchor)) / DAY_MS)
  const totalDays = Math.round((refMs - birthMs) / DAY_MS)

  // 「下次生日」按**年**对应日算，不是按月：1 月 31 日出生的人下一个生日是 1 月 31 日，
  // 复用按月锚点会得到下个月月末 —— 一个看起来仍然合理的错日期。
  let nbYear = ref.y
  let nextBirthday = birthdayIn(birth, nbYear)
  if (toUtcMs(nextBirthday) < refMs) {
    nbYear += 1
    nextBirthday = birthdayIn(birth, nbYear)
  }
  const nextAge = nbYear - birth.y
  const lastBirthday = birthdayIn(birth, years === 0 ? birth.y : ref.y)

  const label =
    years > 0
      ? months > 0
        ? `${years} 岁 ${months} 个月 ${days} 天`
        : days > 0
          ? `${years} 岁 ${days} 天`
          : `${years} 岁`
      : months > 0
        ? `${months} 个月 ${days} 天`
        : `${days} 天`

  const daysToNext = Math.round((toUtcMs(nextBirthday) - refMs) / DAY_MS)

  const leap = birth.m === 2 && birth.d === 29
  const notes: string[] = [
    daysToNext === 0
      ? `今天正是生日（${WEEKDAY_LABELS[weekdayOf(refMs)]}），满 ${nextAge} 周岁；出生那天是${WEEKDAY_LABELS[weekdayOf(birthMs)]}。`
      : `出生那天是${WEEKDAY_LABELS[weekdayOf(birthMs)]}；下次生日 ${formatIso(nextBirthday)}（${WEEKDAY_LABELS[weekdayOf(toUtcMs(nextBirthday))]}），满 ${nextAge} 周岁。`
  ]
  if (leap) {
    notes.push(
      '2 月 29 日出生：本工具在平年以 2 月 28 日为生日对应日（当月无 29 日，取月末），与 JS `Date` 自动溢出到 3 月 1 日的算法不同。'
    )
  }
  if (anchor.d !== birth.d) {
    notes.push(
      `生日在 ${birth.m} 月 ${birth.d} 日：${anchor.y} 年 ${anchor.m} 月没有这一天，满月数按月末（${anchor.d} 日）计。`
    )
  }

  return {
    ok: true,
    years,
    months,
    days,
    label,
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    totalMonths,
    birthWeekday: weekdayOf(birthMs),
    milestones: MILESTONE_DAYS.map((atDays) => ({
      atDays,
      date: addDays(birth, atDays),
      passed: atDays <= totalDays
    })),
    nextBirthday,
    daysToNextBirthday: daysToNext,
    nextBirthdayWeekday: weekdayOf(toUtcMs(nextBirthday)),
    nextAge,
    lastBirthday,
    notes
  }
}

/** 页面示例：点一下就把出生/参考两格都填好 */
export const AGE_SAMPLES: { label: string; birth: string; ref: string }[] = [
  { label: '今天满 30 岁', birth: '1996-09-24', ref: '2026-09-24' },
  { label: '差 1 天满 1 万天', birth: '1999-05-10', ref: '2026-09-24' },
  { label: '闰日出生（平年）', birth: '2000-02-29', ref: '2026-09-24' }
]
