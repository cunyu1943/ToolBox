import { describe, it, expect } from 'vitest'
import { countText, readingMinutes } from '~/utils/count-text'

describe('utils/count-text', () => {
  it('空文本全为 0', () => {
    const s = countText('')
    expect(s.chars).toBe(0)
    expect(s.words).toBe(0)
    expect(s.sentences).toBe(0)
    expect(s.paragraphs).toBe(0)
  })
  it('英文句：字符、词、句、段', () => {
    const s = countText('Hello world')
    expect(s.chars).toBe(11)
    expect(s.charsNoSpace).toBe(10)
    expect(s.englishWords).toBe(2)
    expect(s.words).toBe(2)
    expect(s.lines).toBe(1)
    expect(s.sentences).toBe(1)
    expect(s.paragraphs).toBe(1)
  })
  it('中文句：汉字数与按标点分句', () => {
    const s = countText('你好，世界。今天是测试。')
    expect(s.chars).toBe(12)
    expect(s.chinese).toBe(9)
    expect(s.englishWords).toBe(0)
    expect(s.words).toBe(9)
    expect(s.sentences).toBe(2)
  })
  it('emoji 代理对算 1 个字符', () => {
    const s = countText('👍👍 a')
    expect(s.chars).toBe(4)
    expect(s.charsNoSpace).toBe(3)
    expect(s.englishWords).toBe(1)
  })
  it('多行多段计数', () => {
    const s = countText('第一段\n继续\n\n第二段')
    expect(s.lines).toBe(3)
    expect(s.paragraphs).toBe(2)
  })
  it('readingMinutes 中文按 cpm、英文按 wpm', () => {
    expect(readingMinutes('')).toBe(0)
    expect(readingMinutes('你好世界', 4, 200)).toBe(1)
    expect(readingMinutes('a b c', 300, 3)).toBe(1)
  })
})
