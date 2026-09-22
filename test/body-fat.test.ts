import { describe, expect, it } from 'vitest'
import { bodyFatLevel, calcBodyFat } from '~/utils/body-fat'

describe('utils/body-fat', () => {
  // 200cm/92kg → BMI 23；1.2×23 + 0.23×30 − 10.8 − 5.4 = 18.3
  it('男 Deurenberg 公式值正确', () => {
    expect(calcBodyFat({ gender: 'male', weightKg: 92, heightCm: 200, age: 30 })).toBe(18.3)
  })
  it('女同参数 = 29.1（无 −10.8 项）', () => {
    expect(calcBodyFat({ gender: 'female', weightKg: 92, heightCm: 200, age: 30 })).toBe(29.1)
  })
  it('非法输入或结果为负返回 null', () => {
    expect(calcBodyFat({ gender: 'male', weightKg: 0, heightCm: 200, age: 30 })).toBeNull()
    expect(calcBodyFat({ gender: 'male', weightKg: 92, heightCm: 200, age: 3 })).toBeNull()
    // BMI 极低时公式可为负
    expect(calcBodyFat({ gender: 'male', weightKg: 20, heightCm: 200, age: 30 })).toBeNull()
  })
  it('ACE 分级：男 18.3→可接受，女 29.1→可接受，边界取下一档', () => {
    expect(bodyFatLevel('male', 18.3).label).toBe('可接受')
    expect(bodyFatLevel('female', 29.1).label).toBe('可接受')
    expect(bodyFatLevel('male', 14).label).toBe('健康')
    expect(bodyFatLevel('male', 40).label).toBe('偏高/肥胖')
  })
})
