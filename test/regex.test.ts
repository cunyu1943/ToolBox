import { describe, expect, it } from 'vitest'
import { testRegex } from '~/utils/regex'

describe('testRegex', () => {
  it('多匹配计数', () => {
    const r = testRegex('\\d+', 'g', 'a1 b22 c333')
    expect(r.count).toBe(3)
    expect(r.matches.map((m) => m.value)).toEqual(['1', '22', '333'])
  })
  it('捕获组', () => {
    const r = testRegex('(\\w)-(\\w)', 'g', 'a-b c-d')
    expect(r.matches[0]!.groups).toEqual(['a', 'b'])
    expect(r.matches[1]!.groups).toEqual(['c', 'd'])
  })
  it('无 g 标志自动补全', () => {
    expect(testRegex('x', '', 'xxx').count).toBe(3)
  })
  it('非法模式报错', () => {
    const r = testRegex('(', 'g', 'abc')
    expect(r.ok).toBe(false)
    expect(r.error).toBeTruthy()
  })
  it('空模式无匹配', () => expect(testRegex('', 'g', 'abc').count).toBe(0))
  it('零宽匹配不死循环', () => expect(testRegex('a*', 'g', 'bab').count).toBeGreaterThan(0))
})
