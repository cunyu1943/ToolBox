import { roundFloat } from './number'

/**
 * 体脂率估算（Deurenberg 公式）：体脂% = 1.20×BMI + 0.23×年龄 − 10.8×性别(男1女0) − 5.4
 * 分级参考 American Council on Exercise (ACE) 男女区间。
 */
export interface BodyFatInput {
  gender: 'male' | 'female'
  weightKg: number
  heightCm: number
  age: number
}

export function calcBodyFat(input: BodyFatInput): number | null {
  const { gender, weightKg, heightCm, age } = input
  if (weightKg <= 0 || weightKg > 400 || heightCm <= 0 || heightCm > 272) return null
  if (age < 10 || age > 120) return null
  const m = heightCm / 100
  const bmi = weightKg / (m * m)
  const bf = 1.2 * bmi + 0.23 * age - 10.8 * (gender === 'male' ? 1 : 0) - 5.4
  if (bf <= 0) return null
  return roundFloat(bf, 1)
}

export interface BodyFatLevel {
  label: string
  min: number
  max: number
}

/** ACE 体脂率分级（%），男 / 女两套区间，最后一段上限为 ∞ */
export const bodyFatLevels: Record<'male' | 'female', BodyFatLevel[]> = {
  male: [
    { label: '必需脂肪', min: 0, max: 6 },
    { label: '运动员', min: 6, max: 14 },
    { label: '健康', min: 14, max: 18 },
    { label: '可接受', min: 18, max: 25 },
    { label: '偏高/肥胖', min: 25, max: Infinity }
  ],
  female: [
    { label: '必需脂肪', min: 0, max: 14 },
    { label: '运动员', min: 14, max: 21 },
    { label: '健康', min: 21, max: 25 },
    { label: '可接受', min: 25, max: 32 },
    { label: '偏高/肥胖', min: 32, max: Infinity }
  ]
}

export function bodyFatLevel(gender: 'male' | 'female', bf: number): BodyFatLevel {
  const levels = bodyFatLevels[gender]
  return levels.find((l) => bf >= l.min && bf < l.max) ?? levels[levels.length - 1]!
}
