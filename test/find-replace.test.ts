import { describe, it, expect } from 'vitest'
import { escapeRegExp, replaceAll } from '~/utils/find-replace'

describe('utils/find-replace', () => {
  it('escapeRegExp 转义正则元字符', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c')
    expect(escapeRegExp('($)')).toBe('\\(\\$\\)')
  })
  it('普通模式全量替换并计数', () => {
    const r = replaceAll('apple banana apple', { search: 'apple', replace: 'pear' })
    expect(r.output).toBe('pear banana pear')
    expect(r.count).toBe(2)
    expect(r.error).toBe('')
  })
  it('忽略大小写替换全部', () => {
    const r = replaceAll('Cat cat CAT', { search: 'cat', replace: 'dog', caseSensitive: false })
    expect(r.output).toBe('dog dog dog')
    expect(r.count).toBe(3)
  })
  it('全字匹配不误伤子串', () => {
    const r = replaceAll('cat cats category', { search: 'cat', replace: 'dog', wholeWord: true })
    expect(r.output).toBe('dog cats category')
    expect(r.count).toBe(1)
  })
  it('正则分组引用', () => {
    const r = replaceAll('2026-09-22', {
      search: '(\\d{4})-(\\d{2})-(\\d{2})', replace: '$3/$2/$1', useRegex: true
    })
    expect(r.output).toBe('22/09/2026')
    expect(r.count).toBe(1)
  })
  it('非法正则返回错误且不改动', () => {
    const r = replaceAll('abc', { search: '(', replace: 'x', useRegex: true })
    expect(r.error).toContain('正则表达式无效')
    expect(r.output).toBe('abc')
    expect(r.count).toBe(0)
  })
  it('空搜索词为空操作', () => {
    const r = replaceAll('abc', { search: '', replace: 'x' })
    expect(r).toEqual({ output: 'abc', count: 0, error: '' })
  })
  it('普通模式把正则元字符按字面处理', () => {
    const r = replaceAll('a.b', { search: '.', replace: 'X', useRegex: false })
    expect(r.output).toBe('aXb')
    expect(r.count).toBe(1)
  })
  it('普通模式替换串中的 $& 按字面保留', () => {
    const r = replaceAll('abc', { search: 'b', replace: '[$&]' })
    expect(r.output).toBe('a[$&]c')
  })
})
