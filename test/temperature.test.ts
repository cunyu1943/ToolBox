import { describe, expect, it } from 'vitest'
import { convertTempAll } from '~/utils/temperature'

describe('温度换算', () => {
  it('摄氏→华氏：0°C = 32°F', () => {
    expect(convertTempAll('C', 0).F).toBe(32)
  })

  it('摄氏→华氏：100°C = 212°F', () => {
    expect(convertTempAll('C', 100).F).toBe(212)
  })

  it('摄氏→开尔文：0°C = 273.15K', () => {
    expect(convertTempAll('C', 0).K).toBeCloseTo(273.15, 6)
  })

  it('华氏→摄氏：98.6°F ≈ 37°C', () => {
    expect(convertTempAll('F', 98.6).C).toBeCloseTo(37, 6)
  })

  it('开尔文→摄氏：0K = -273.15°C', () => {
    expect(convertTempAll('K', 0).C).toBeCloseTo(-273.15, 6)
  })

  it('非法输入返回全 0', () => {
    const r = convertTempAll('C', Number.NaN)
    expect(r).toEqual({ C: 0, F: 0, K: 0 })
  })
})
