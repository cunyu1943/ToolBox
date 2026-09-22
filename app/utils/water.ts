/** 每日建议饮水量：基础 35ml/kg（参考区间 30–40ml/kg），运动每小时 +500ml */
export function dailyWaterMl(weightKg: number, exerciseHours = 0): number | null {
  if (weightKg <= 0 || weightKg > 400) return null
  return Math.round(weightKg * 35 + Math.max(0, exerciseHours) * 500)
}

/** 参考区间（下限 30ml/kg，上限 40ml/kg，同样叠加运动量） */
export function dailyWaterRangeMl(
  weightKg: number,
  exerciseHours = 0
): { min: number; max: number } | null {
  const base = dailyWaterMl(weightKg, exerciseHours)
  if (base === null) return null
  const extra = Math.max(0, exerciseHours) * 500
  return {
    min: Math.round(weightKg * 30 + extra),
    max: Math.round(weightKg * 40 + extra)
  }
}

/** 换算成「杯」（约 250ml/杯），向上取整 */
export function waterCups(ml: number, cupMl = 250): number {
  return Math.ceil(ml / cupMl)
}
