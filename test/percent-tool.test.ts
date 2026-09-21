import { describe, it, expect } from 'vitest'
import { partOf, percentOf, changePercent } from '~/utils/percent-tool'

describe('utils/percent-tool 百分比计算', () => {
  it('15% 的 200 = 30', () => {
    expect(partOf(15, 200)).toBe(30)
  })
  it('partOf 浮点归一：0.1% × 1000 ≈ 1', () => {
    expect(partOf(0.1, 1000)).toBeCloseTo(1, 10)
  })
  it('partOf 非法输入返回 NaN', () => {
    expect(partOf(NaN, 5)).toBeNaN()
  })
  it('30 是 150 的 20%', () => {
    expect(percentOf(30, 150)).toBe(20)
  })
  it('percentOf 除零返回 NaN', () => {
    expect(percentOf(5, 0)).toBeNaN()
  })
  it('从 50 涨到 75：+50% increase', () => {
    const r = changePercent(50, 75)!
    expect(r.percent).toBe(50)
    expect(r.direction).toBe('increase')
  })
  it('从 80 降到 60：-25% decrease', () => {
    const r = changePercent(80, 60)!
    expect(r.percent).toBe(-25)
    expect(r.direction).toBe('decrease')
  })
  it('不变为 flat，基准为 0 返回 null', () => {
    expect(changePercent(10, 10)!.direction).toBe('flat')
    expect(changePercent(0, 5)).toBeNull()
  })
})
