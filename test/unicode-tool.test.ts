import { describe, expect, it } from 'vitest'
import { fromUnicodeEscape, toUnicodeEscape } from '../app/utils/unicode-tool'

describe('toUnicodeEscape', () => {
  it('ASCII 保持不变', () => {
    expect(toUnicodeEscape('Hello 123!~')).toBe('Hello 123!~')
  })

  it('中文转义为 \\uXXXX', () => {
    expect(toUnicodeEscape('中')).toBe('\\u4e2d')
    expect(toUnicodeEscape('文A')).toBe('\\u6587A')
  })

  it('全角标点也转义', () => {
    expect(toUnicodeEscape('！')).toBe('\\uff01')
  })

  it('emoji 拆为代理对', () => {
    expect(toUnicodeEscape('😀')).toBe('\\ud83d\\ude00')
  })

  it('ASCII 控制字符（换行）保持原样', () => {
    expect(toUnicodeEscape('\n')).toBe('\n')
  })
})

describe('fromUnicodeEscape', () => {
  it('还原中文', () => {
    expect(fromUnicodeEscape('\\u4e2d\\u6587')).toBe('中文')
  })

  it('十六进制大小写均可', () => {
    expect(fromUnicodeEscape('\\u4E2D')).toBe('中')
  })

  it('代理对还原为 emoji', () => {
    expect(fromUnicodeEscape('\\ud83d\\ude00')).toBe('😀')
  })

  it('非法序列保持原样', () => {
    expect(fromUnicodeEscape('\\u12')).toBe('\\u12')
    expect(fromUnicodeEscape('\\uzzzz')).toBe('\\uzzzz')
  })

  it('往返一致', () => {
    const s = '混合 text：中文 + 😀!'
    expect(fromUnicodeEscape(toUnicodeEscape(s))).toBe(s)
  })
})
