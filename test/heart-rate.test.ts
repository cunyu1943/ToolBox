import { describe, expect, it } from 'vitest'
import { heartRateZonesFor, maxHeartRate } from '~/utils/heart-rate'

describe('utils/heart-rate', () => {
  it('最大心率 = 220 − 年龄', () => {
    expect(maxHeartRate(30)).toBe(190)
    expect(maxHeartRate(9)).toBeNull()
    expect(maxHeartRate(130)).toBeNull()
  })
  it('Karvonen 30岁/静息60：热身区 125–138，极限区 177–190', () => {
    const r = heartRateZonesFor(30, 60)!
    expect(r.max).toBe(190)
    expect(r.zones[0]!.zone.key).toBe('warmup')
    expect({ min: r.zones[0]!.min, max: r.zones[0]!.max }).toEqual({ min: 125, max: 138 })
    expect({ min: r.zones[4]!.min, max: r.zones[4]!.max }).toEqual({ min: 177, max: 190 })
  })
  it('五档区间连续覆盖 50%–100%', () => {
    const r = heartRateZonesFor(40, 70)!
    for (let i = 1; i < r.zones.length; i++) {
      expect(r.zones[i]!.zone.low).toBe(r.zones[i - 1]!.zone.high)
    }
    expect(r.zones[0]!.zone.low).toBe(0.5)
    expect(r.zones[4]!.zone.high).toBe(1)
  })
  it('静息心率非法（≤0 或超过最大心率）返回 null', () => {
    expect(heartRateZonesFor(30, 0)).toBeNull()
    expect(heartRateZonesFor(30, 200)).toBeNull()
    expect(heartRateZonesFor(5, 60)).toBeNull()
  })
})
