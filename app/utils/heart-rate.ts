/** 靶心率区间：最大心率 = 220 − 年龄（Fox 公式），Karvonen 法按储备心率分级 */
export function maxHeartRate(age: number): number | null {
  if (age < 10 || age > 120) return null
  return Math.round(220 - age)
}

export interface HeartRateZone {
  key: string
  label: string
  desc: string
  /** 强度下限（含）与上限（含），按最大心率百分比 */
  low: number
  high: number
}

export const heartRateZones: HeartRateZone[] = [
  { key: 'warmup', label: '热身区', desc: '轻松活动，促进恢复', low: 0.5, high: 0.6 },
  { key: 'fatburn', label: '燃脂区', desc: '脂肪供能比例最高', low: 0.6, high: 0.7 },
  { key: 'aerobic', label: '有氧区', desc: '提升心肺耐力', low: 0.7, high: 0.8 },
  { key: 'anaerobic', label: '无氧区', desc: '提升速度与力量', low: 0.8, high: 0.9 },
  { key: 'maximum', label: '极限区', desc: '短时间高强度间歇', low: 0.9, high: 1 }
]

export interface ZoneRange {
  zone: HeartRateZone
  /** 目标心率下限（bpm） */
  min: number
  /** 目标心率上限（bpm） */
  max: number
}

/** Karvonen：目标心率 = 静息心率 + (最大心率 − 静息心率) × 强度% */
export function heartRateZonesFor(
  age: number,
  restingHr: number
): { max: number; zones: ZoneRange[] } | null {
  const max = maxHeartRate(age)
  if (max === null || restingHr <= 0 || restingHr > max) return null
  const reserve = max - restingHr
  return {
    max,
    zones: heartRateZones.map((zone) => ({
      zone,
      min: Math.round(restingHr + reserve * zone.low),
      max: Math.round(restingHr + reserve * zone.high)
    }))
  }
}
