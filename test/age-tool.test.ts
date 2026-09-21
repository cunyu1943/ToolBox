import { describe, expect, it } from 'vitest'
import { calcAge, daysInMonth, parseDate } from '../app/utils/age-tool'

const d = (s: string) => {
  const r = parseDate(s)
  if (!r) throw new Error(`bad date ${s}`)
  return r
}

describe('parseDate', () => {
  it('合法日期', () => {
    expect(d('2000-01-31')).toEqual(new Date(2000, 0, 31))
  })
  it('拒绝非法格式与日期', () => {
    expect(parseDate('2000-1-31')).toBeNull()
    expect(parseDate('2001-02-29')).toBeNull()
    expect(parseDate('2000-13-01')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
  it('闰年 2/29 合法', () => {
    expect(parseDate('2000-02-29')).toEqual(new Date(2000, 1, 29))
  })
})

describe('daysInMonth', () => {
  it('平年 2 月 28 天，闰年 29 天', () => {
    expect(daysInMonth(2023, 2)).toBe(28)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(1900, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
  })
})

describe('calcAge', () => {
  it('生日已过', () => {
    const r = calcAge(d('1990-05-10'), d('2026-09-21'))!
    expect({ years: r.years, months: r.months, days: r.days }).toEqual({ years: 36, months: 4, days: 11 })
  })
  it('生日未到借月', () => {
    const r = calcAge(d('2000-12-25'), d('2026-01-10'))!
    expect({ years: r.years, months: r.months, days: r.days }).toEqual({ years: 25, months: 0, days: 16 })
  })
  it('同一天为整岁', () => {
    const r = calcAge(d('2020-03-01'), d('2026-03-01'))!
    expect({ years: r.years, months: r.months, days: r.days, daysToNextBirthday: r.daysToNextBirthday })
      .toEqual({ years: 6, months: 0, days: 0, daysToNextBirthday: 0 })
  })
  it('总天数含闰日', () => {
    expect(calcAge(d('2024-02-28'), d('2024-03-01'))!.totalDays).toBe(2)
  })
  it('2/29 出生平年生日按 3/1', () => {
    const r = calcAge(d('2000-02-29'), d('2025-02-28'))!
    expect(r.years).toBe(24)
    expect(r.daysToNextBirthday).toBe(1) // 2025-03-01
    expect(r.nextBirthdayAge).toBe(25)
  })
  it('下次生日倒计时', () => {
    const r = calcAge(d('1990-05-10'), d('2026-09-21'))!
    expect(r.daysToNextBirthday).toBe(231) // 2027-05-10
    expect(r.nextBirthdayAge).toBe(37)
  })
  it('出生晚于参考日返回 null', () => {
    expect(calcAge(d('2026-01-01'), d('2025-12-31'))).toBeNull()
  })
  it('星期几', () => {
    expect(calcAge(d('2026-09-21'), d('2026-09-22'))!.birthWeekday).toBe(1) // 周一
  })
})
