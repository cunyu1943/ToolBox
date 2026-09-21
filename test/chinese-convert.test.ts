import { describe, expect, it } from 'vitest'
import { convertChinese } from '~/utils/chinese-convert'

describe('convertChinese', () => {
  it('简 → 繁（台湾）用词转换', () => {
    expect(convertChinese('计算机与网络', 'cn', 'tw')).toBe('計算機與網絡')
  })

  it('繁 → 简往返稳定', () => {
    const tw = convertChinese('头发', 'cn', 'tw')
    expect(tw).toBe('頭髮')
    expect(convertChinese(tw, 'tw', 'cn')).toBe('头发')
  })

  it('港式繁体：著/裏 差异', () => {
    expect(convertChinese('里面', 'cn', 'hk')).toBe('裏面')
    expect(convertChinese('里面', 'cn', 'tw')).toBe('裡面')
  })

  it('同区域或非输入原样返回', () => {
    expect(convertChinese('abc', 'cn', 'cn')).toBe('abc')
    expect(convertChinese('', 'cn', 'tw')).toBe('')
  })
})
