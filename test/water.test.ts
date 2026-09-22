import { describe, expect, it } from 'vitest'
import { dailyWaterMl, dailyWaterRangeMl, waterCups } from '~/utils/water'

describe('utils/water', () => {
  it('60kg 不运动 = 2100ml，区间 1800–2400', () => {
    expect(dailyWaterMl(60)).toBe(2100)
    expect(dailyWaterRangeMl(60)).toEqual({ min: 1800, max: 2400 })
  })
  it('每小时运动 +500ml', () => {
    expect(dailyWaterMl(60, 1)).toBe(2600)
    expect(dailyWaterRangeMl(60, 1)).toEqual({ min: 2300, max: 2900 })
  })
  it('非法体重返回 null', () => {
    expect(dailyWaterMl(0)).toBeNull()
    expect(dailyWaterMl(500)).toBeNull()
    expect(dailyWaterRangeMl(-1)).toBeNull()
  })
  it('杯数向上取整（250ml/杯）', () => {
    expect(waterCups(2100)).toBe(9)
    expect(waterCups(2000)).toBe(8)
  })
})
