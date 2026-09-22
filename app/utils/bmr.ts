/** Mifflin-St Jeor 基础代谢率与活动系数 */
export interface BmrInput {
  gender: 'male' | 'female'
  weightKg: number
  heightCm: number
  age: number
}

/** BMR(kcal/天) = 10×体重 + 6.25×身高 − 5×年龄 + 5(男) / −161(女) */
export function calcBmr(input: BmrInput): number | null {
  const { gender, weightKg, heightCm, age } = input
  if (weightKg <= 0 || weightKg > 400 || heightCm <= 0 || heightCm > 272) return null
  if (age < 10 || age > 120) return null
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161)
  return Math.round(base)
}

export interface ActivityLevel {
  label: string
  mult: number
}

/** 日常活动系数（Harris-Benedict 修正系数，常用五档） */
export const activityLevels: ActivityLevel[] = [
  { label: '久坐（几乎不运动）', mult: 1.2 },
  { label: '轻度（每周 1–3 次）', mult: 1.375 },
  { label: '中度（每周 3–5 次）', mult: 1.55 },
  { label: '高度（每周 6–7 次）', mult: 1.725 },
  { label: '极高（每天两次训练）', mult: 1.9 }
]

/** 每日总消耗 TDEE = BMR × 活动系数 */
export function calcTdee(bmr: number, mult: number): number {
  return Math.round(bmr * mult)
}
