import { roundFloat } from './number'

/** BMI = 体重(kg) / 身高(m)²。采用中国成人标准分级。 */
export interface BmiLevel {
  key: 'underweight' | 'normal' | 'overweight' | 'obese'
  label: string
  color: string
  /** 下限（含），用于分级判断 */
  min: number
  /** 上限（不含） */
  max: number
}

/** 中国成人 BMI 分级（<18.5 偏瘦 / 18.5–23.9 正常 / 24–27.9 超重 / ≥28 肥胖） */
export const bmiLevels: BmiLevel[] = [
  { key: 'underweight', label: '偏瘦', color: 'sky', min: 0, max: 18.5 },
  { key: 'normal', label: '正常', color: 'green', min: 18.5, max: 24 },
  { key: 'overweight', label: '超重', color: 'amber', min: 24, max: 28 },
  { key: 'obese', label: '肥胖', color: 'red', min: 28, max: Infinity }
]

/** ft/lb → cm/kg 换算常量 */
const CM_PER_INCH = 2.54
const KG_PER_LB = 0.45359237

export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

/** 计算 BMI 值（输入：厘米、千克） */
export function calcBmi(heightCm: number, weightKg: number): number | null {
  if (heightCm <= 0 || weightKg <= 0) return null
  const m = heightCm / 100
  return roundFloat(weightKg / (m * m), 1)
}

export function bmiLevel(bmi: number): BmiLevel {
  return bmiLevels.find((l) => bmi >= l.min && bmi < l.max) ?? bmiLevels[bmiLevels.length - 1]!
}

/** 正常区间(18.5–23.9)对应的健康体重范围（kg） */
export function healthyWeightRange(heightCm: number): { min: number; max: number } | null {
  if (heightCm <= 0) return null
  const m = heightCm / 100
  return {
    min: roundFloat(18.5 * m * m, 1),
    max: roundFloat(23.9 * m * m, 1)
  }
}

/** BMI 在数轴(0–40)上的百分比位置，用于可视化指针 */
export function bmiPosition(bmi: number, scaleMax = 40): number {
  return Math.min(100, Math.max(0, (bmi / scaleMax) * 100))
}
