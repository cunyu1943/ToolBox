import { describe, expect, it } from 'vitest'
import { toHalfWidth, toFullWidth } from '~/utils/fullwidth'

describe('全角/半角转换', () => {
  it('全角转半角', () => expect(toHalfWidth('ＡＢＣ１２３')).toBe('ABC123'))
  it('全角空格转半角空格', () => expect(toHalfWidth('a　b')).toBe('a b'))
  it('半角转全角', () => expect(toFullWidth('ABC 123')).toBe('ＡＢＣ　１２３'))
  it('往返一致', () => expect(toHalfWidth(toFullWidth('Hello, World! 2024'))).toBe('Hello, World! 2024'))
  it('非 ASCII 区字符保持不变', () => expect(toFullWidth('中文')).toBe('中文'))
  it('半角转全角后逐字符为全角', () => expect(toFullWidth('a')).toBe('ａ'))
})
