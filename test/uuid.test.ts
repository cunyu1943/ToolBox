import { describe, expect, it } from 'vitest'
import { uuidV4, newUuid } from '~/utils/uuid'

const RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('uuidV4', () => {
  it('符合 v4 格式', () => expect(uuidV4()).toMatch(RE))
  it('固定 rng 结果确定', () => {
    expect(uuidV4(() => 0.5)).toBe(uuidV4(() => 0.5))
  })
  it('全 0 rng 也保持版本/变体位', () => {
    const id = uuidV4(() => 0)
    expect(id).toMatch(RE)
    expect(id[14]).toBe('4')
    expect(id[19]).toBe('8')
  })
  it('批量唯一', () => {
    const set = new Set(Array.from({ length: 100 }, () => uuidV4()))
    expect(set.size).toBe(100)
  })
})

describe('newUuid', () => {
  it('生成合法 uuid', () => expect(newUuid()).toMatch(RE))
})
