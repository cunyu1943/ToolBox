import { describe, expect, it } from 'vitest'
import { flipCoins, pickUnique, randInt, rollDice, uniqueInts } from '../app/utils/random-tool'

describe('randInt', () => {
  it('边界值可取到', () => {
    expect(randInt(1, 6, () => 0)).toBe(1)
    expect(randInt(1, 6, () => 0.999999)).toBe(6)
  })
  it('参数倒置自动交换', () => {
    expect(randInt(6, 1, () => 0)).toBe(1)
  })
  it('结果恒在区间内', () => {
    for (let i = 0; i < 200; i++) {
      const v = randInt(10, 20)
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(20)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('pickUnique', () => {
  const items = ['a', 'b', 'c', 'd', 'e']
  it('抽取数量正确且不重复', () => {
    const r = pickUnique(items, 3)
    expect(r.length).toBe(3)
    expect(new Set(r).size).toBe(3)
  })
  it('count 超容量时返回全部（打乱）', () => {
    expect(pickUnique(items, 99).sort()).toEqual(items)
  })
  it('确定性 rng', () => {
    expect(pickUnique(items, 2, () => 0)).toEqual(['a', 'b'])
  })
})

describe('rollDice', () => {
  it('数量与范围', () => {
    const r = rollDice(5)
    expect(r.length).toBe(5)
    r.forEach((v) => expect(v).toBeGreaterThanOrEqual(1))
    r.forEach((v) => expect(v).toBeLessThanOrEqual(6))
  })
  it('自定义面数', () => {
    expect(rollDice(3, 20, () => 0.999999).every((v) => v === 20)).toBe(true)
  })
  it('count=0 得空数组', () => {
    expect(rollDice(0)).toEqual([])
  })
})

describe('flipCoins', () => {
  it('只产出 正/反', () => {
    const r = flipCoins(50)
    expect(r.length).toBe(50)
    r.forEach((v) => expect(['正', '反']).toContain(v))
  })
  it('rng<0.5 为正', () => {
    expect(flipCoins(2, () => 0.1)).toEqual(['正', '正'])
    expect(flipCoins(1, () => 0.9)).toEqual(['反'])
  })
})

describe('uniqueInts', () => {
  it('不重复且在区间', () => {
    const r = uniqueInts(1, 45, 6)
    expect(r.length).toBe(6)
    expect(new Set(r).size).toBe(6)
    r.forEach((v) => expect(v).toBeGreaterThanOrEqual(1))
    r.forEach((v) => expect(v).toBeLessThanOrEqual(45))
  })
  it('超出容量抛错', () => {
    expect(() => uniqueInts(1, 3, 4)).toThrow()
  })
})
