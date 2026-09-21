import { roundFloat } from './number'

/**
 * 百分比计算三问：
 *   1. a% 的 b 是多少 → partOf
 *   2. x 是 y 的百分之几 → percentOf
 *   3. a 变化到 b 的百分比变化 → changePercent
 */

/** a% × b，如 15% 的 200 = 30 */
export function partOf(percent: number, value: number): number {
  if (!Number.isFinite(percent) || !Number.isFinite(value)) return NaN
  return roundFloat((percent / 100) * value, 10)
}

/** x 是 y 的百分之几；y 为 0 返回 NaN */
export function percentOf(x: number, y: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || y === 0) return NaN
  return roundFloat((x / y) * 100, 10)
}

export interface ChangeResult {
  percent: number   // 变化百分比（正为增加、负为减少）
  direction: 'increase' | 'decrease' | 'flat'
}

/** 从 a 变化到 b 的百分比变化；a 为 0 返回 null */
export function changePercent(a: number, b: number): ChangeResult | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null
  const p = roundFloat(((b - a) / a) * 100, 10)
  return {
    percent: p,
    direction: p > 0 ? 'increase' : p < 0 ? 'decrease' : 'flat'
  }
}
