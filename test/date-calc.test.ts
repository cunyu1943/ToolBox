import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, diffComponents, parseDate, weekday } from '~/utils/date-calc'

describe('日期解析', () => {
  it('合法日期', () => expect(parseDate('2024-02-29')).toEqual({ y: 2024, m: 2, d: 29 }))
  it('非法（闰年外的2/29）', () => expect(parseDate('2023-02-29')).toBeNull())
  it('非法格式', () => expect(parseDate('2024/2/29')).toBeNull())
})

describe('日期差与加减', () => {
  it('同一天为 0', () => expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0))
  it('跨年 366 天（2024 闰年）', () =>
    expect(daysBetween('2024-01-01', '2024-12-31')).toBe(365))
  it('反向为负', () => expect(daysBetween('2024-01-10', '2024-01-01')).toBe(-9))
  it('月末加减不漂移', () => expect(addDays('2024-01-31', 1)).toBe('2024-02-01'))
  it('跨年加减', () => expect(addDays('2024-12-31', 1)).toBe('2025-01-01'))
  it('负向加减', () => expect(addDays('2024-03-01', -1)).toBe('2024-02-29'))
})

describe('年月日差与星期', () => {
  it('相差一年', () =>
    expect(diffComponents('2023-05-10', '2024-05-10')).toEqual({ years: 1, months: 0, days: 0 }))
  it('借位（日不足）', () =>
    expect(diffComponents('2024-01-31', '2024-03-01')).toEqual({ years: 0, months: 1, days: 1 }))
  it('反向为负', () =>
    expect(diffComponents('2024-05-10', '2023-05-10')).toEqual({ years: -1, months: 0, days: 0 }))
  it('星期：2024-01-01 是周一', () => expect(weekday('2024-01-01')).toBe('周一'))
})
