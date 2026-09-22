import { describe, expect, it } from 'vitest'
import { activityLevels, calcBmr, calcTdee } from '~/utils/bmr'

describe('utils/bmr', () => {
  it('男 70kg/175cm/30岁 Mifflin-St Jeor = 1649', () => {
    expect(calcBmr({ gender: 'male', weightKg: 70, heightCm: 175, age: 30 })).toBe(1649)
  })
  it('女同参数 = 1483（常数项 −161）', () => {
    expect(calcBmr({ gender: 'female', weightKg: 70, heightCm: 175, age: 30 })).toBe(1483)
  })
  it('非法输入返回 null（年龄/体重/身高越界）', () => {
    expect(calcBmr({ gender: 'male', weightKg: 70, heightCm: 175, age: 5 })).toBeNull()
    expect(calcBmr({ gender: 'male', weightKg: 0, heightCm: 175, age: 30 })).toBeNull()
    expect(calcBmr({ gender: 'male', weightKg: 70, heightCm: 300, age: 30 })).toBeNull()
  })
  it('TDEE = BMR × 活动系数并取整', () => {
    expect(calcTdee(1649, 1.2)).toBe(1979)
    expect(calcTdee(1649, activityLevels[4]!.mult)).toBe(3133)
  })
})
