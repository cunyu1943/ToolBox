import { describe, expect, it } from 'vitest'
import { toUpperCase, toLowerCase, invertCase, textStats, processLines } from '~/utils/text'

describe('大小写', () => {
  it('全大写', () => expect(toUpperCase('aB1')).toBe('AB1'))
  it('全小写', () => expect(toLowerCase('aB1')).toBe('ab1'))
  it('反转大小写', () => expect(invertCase('aB cD')).toBe('Ab Cd'))
})

describe('textStats', () => {
  it('英文词与字符', () => {
    const s = textStats('hello world\n')
    expect(s.words).toBe(2)
    expect(s.chars).toBe(12)
    expect(s.lines).toBe(2)
  })
  it('中文字符按码点计、UTF-8 字节翻三倍', () => {
    const s = textStats('中')
    expect(s.chars).toBe(1)
    expect(s.bytes).toBe(3)
  })
  it('空文本', () => expect(textStats('')).toEqual({ chars: 0, charsNoSpace: 0, words: 0, lines: 0, bytes: 0 }))
})

describe('processLines', () => {
  it('去空行 + trim', () => expect(processLines(' a \n\n b\n', { trim: true, removeEmpty: true })).toBe('a\nb'))
  it('去重', () => expect(processLines('x\ny\nx', { dedupe: true })).toBe('x\ny'))
  it('升序排序', () => expect(processLines('b\nc\na', { sort: 'asc' })).toBe('a\nb\nc'))
  it('降序', () => expect(processLines('b\nc\na', { sort: 'desc' })).toBe('c\nb\na'))
  it('反转', () => expect(processLines('1\n2\n3', { reverse: true })).toBe('3\n2\n1'))
})
