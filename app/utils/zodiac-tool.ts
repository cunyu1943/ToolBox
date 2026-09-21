/**
 * 生肖 / 星座查询纯函数。
 * 生肖按农历年近似为公历年（以春节为界的精确算法需要历表，页面已注明）。
 */

import { daysInMonth } from './age-tool'

const animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'] as const

/** 年份 → 生肖（1900 年为鼠年基准） */
export function chineseZodiac(year: number): string {
  if (!Number.isInteger(year)) return ''
  return animals[((year - 1900) % 12 + 12) % 12]
}

export interface WesternSign {
  name: string
  en: string
  element: string
}

/** 星座边界：每月起始日（1 月 20 日起为摩羯…），来自通用日期区间 */
const signTable: Array<{ to: number; sign: WesternSign }> = [
  { to: 19, sign: { name: '摩羯座', en: 'Capricorn', element: '土象' } },
  { to: 18, sign: { name: '水瓶座', en: 'Aquarius', element: '风象' } },
  { to: 20, sign: { name: '双鱼座', en: 'Pisces', element: '水象' } },
  { to: 19, sign: { name: '白羊座', en: 'Aries', element: '火象' } },
  { to: 20, sign: { name: '金牛座', en: 'Taurus', element: '土象' } },
  { to: 21, sign: { name: '双子座', en: 'Gemini', element: '风象' } },
  { to: 22, sign: { name: '巨蟹座', en: 'Cancer', element: '水象' } },
  { to: 22, sign: { name: '狮子座', en: 'Leo', element: '火象' } },
  { to: 22, sign: { name: '处女座', en: 'Virgo', element: '土象' } },
  { to: 23, sign: { name: '天秤座', en: 'Libra', element: '风象' } },
  { to: 22, sign: { name: '天蝎座', en: 'Scorpio', element: '水象' } },
  { to: 21, sign: { name: '射手座', en: 'Sagittarius', element: '火象' } }
]

/** 月(1-12)日 → 星座，非法返回 null */
export function westernZodiac(month: number, day: number): WesternSign | null {
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(2025, month)) return null
  const row = signTable[month - 1]
  return day <= row.to ? row.sign : signTable[month % 12].sign
}
