/**
 * 年龄计算纯函数：精确年/月/日、总天数、下次生日倒计时。
 * 全部按本地日历日计算，不涉及时间戳与时区换算。
 */

export interface AgeResult {
  years: number
  months: number
  days: number
  totalDays: number
  /** 距下次生日天数；当天为 0 */
  daysToNextBirthday: number
  /** 下次生日是几周岁 */
  nextBirthdayAge: number
  /** 出生日是星期几（0=周日 … 6=周六） */
  birthWeekday: number
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
}

/** 解析 YYYY-MM-DD，非法返回 null */
export function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const [, ys, ms, ds] = m
  const y = Number(ys), mo = Number(ms), d = Number(ds)
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null
  return new Date(y, mo - 1, d)
}

const DAY_MS = 86_400_000

/** 出生日期晚于参考日时返回 null */
export function calcAge(birth: Date, ref: Date): AgeResult | null {
  if (birth > ref) return null

  let years = ref.getFullYear() - birth.getFullYear()
  let months = ref.getMonth() - birth.getMonth()
  let days = ref.getDate() - birth.getDate()
  if (days < 0) {
    months -= 1
    // 借上一个月的天数
    const pm = ref.getMonth() === 0 ? 12 : ref.getMonth()
    const py = ref.getMonth() === 0 ? ref.getFullYear() - 1 : ref.getFullYear()
    days += daysInMonth(py, pm)
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const totalDays = Math.round((ref.getTime() - birth.getTime()) / DAY_MS)

  // 下次生日：2/29 出生者在平年按 3/1 计（Date 自动溢出）
  let next = new Date(ref.getFullYear(), birth.getMonth(), birth.getDate())
  if (next < ref) next = new Date(ref.getFullYear() + 1, birth.getMonth(), birth.getDate())
  const daysToNextBirthday = Math.round((next.getTime() - ref.getTime()) / DAY_MS)

  return {
    years,
    months,
    days,
    totalDays,
    daysToNextBirthday,
    nextBirthdayAge: next.getFullYear() - birth.getFullYear(),
    birthWeekday: birth.getDay()
  }
}
