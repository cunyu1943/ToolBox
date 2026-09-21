import { describe, expect, it } from 'vitest'
import { filterByClass, filterStatuses, httpStatuses } from '../app/utils/http-status'

describe('httpStatuses', () => {
  it('码号唯一且升序', () => {
    const codes = httpStatuses.map((e) => e.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect([...codes].sort((a, b) => a - b)).toEqual(codes)
  })
  it('字段完整', () => {
    for (const e of httpStatuses) {
      expect(e.code).toBeGreaterThanOrEqual(100)
      expect(e.code).toBeLessThan(600)
      expect(e.name.length).toBeGreaterThan(0)
      expect(e.zh.length).toBeGreaterThan(0)
      expect(e.desc.length).toBeGreaterThan(0)
    }
  })
})

describe('filterStatuses', () => {
  it('空查询返回全部', () => {
    expect(filterStatuses('  ')).toBe(httpStatuses)
  })
  it('按码号过滤', () => {
    expect(filterStatuses('404').map((e) => e.code)).toEqual([404])
  })
  it('按英文名不区分大小写', () => {
    expect(filterStatuses('not found').map((e) => e.code)).toEqual([404])
  })
  it('按中文名过滤', () => {
    expect(filterStatuses('超时').map((e) => e.code)).toEqual([408, 504])
  })
})

describe('filterByClass', () => {
  it('0 返回全部', () => {
    expect(filterByClass(httpStatuses, 0)).toBe(httpStatuses)
  })
  it('4 只留 4xx', () => {
    const r = filterByClass(httpStatuses, 4)
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((e) => e.code >= 400 && e.code < 500)).toBe(true)
  })
})
