import { describe, expect, it } from 'vitest'
import { chineseZodiac, westernZodiac } from '../app/utils/zodiac-tool'

describe('chineseZodiac', () => {
  it('已知年份', () => {
    expect(chineseZodiac(2024)).toBe('龙')
    expect(chineseZodiac(2025)).toBe('蛇')
    expect(chineseZodiac(2026)).toBe('马')
    expect(chineseZodiac(2008)).toBe('鼠')
    expect(chineseZodiac(1990)).toBe('马')
  })
  it('12 年一循环', () => {
    expect(chineseZodiac(1900)).toBe(chineseZodiac(2020))
  })
  it('非法输入返回空串', () => {
    expect(chineseZodiac(NaN)).toBe('')
    expect(chineseZodiac(20.5)).toBe('')
  })
})

describe('westernZodiac', () => {
  it('边界日归属', () => {
    expect(westernZodiac(1, 19)!.name).toBe('摩羯座')
    expect(westernZodiac(1, 20)!.name).toBe('水瓶座')
    expect(westernZodiac(3, 20)!.name).toBe('双鱼座')
    expect(westernZodiac(3, 21)!.name).toBe('白羊座')
    expect(westernZodiac(12, 21)!.name).toBe('射手座')
    expect(westernZodiac(12, 22)!.name).toBe('摩羯座')
  })
  it('普通日期', () => {
    expect(westernZodiac(9, 21)!.name).toBe('处女座')
    expect(westernZodiac(8, 15)!.name).toBe('狮子座')
  })
  it('12 月月末回环到摩羯', () => {
    expect(westernZodiac(12, 31)!.name).toBe('摩羯座')
  })
  it('元素', () => {
    expect(westernZodiac(4, 1)!.element).toBe('火象')
    expect(westernZodiac(1, 25)!.element).toBe('风象')
  })
  it('非法输入返回 null', () => {
    expect(westernZodiac(0, 10)).toBeNull()
    expect(westernZodiac(13, 10)).toBeNull()
    expect(westernZodiac(1, 0)).toBeNull()
    expect(westernZodiac(2, 30)).toBeNull()
  })
})
