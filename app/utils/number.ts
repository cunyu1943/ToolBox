/**
 * 数值精度与格式化工具。
 * 纯函数、无副作用，供所有计算器复用。
 */

/** 归一浮点误差：如 0.1+0.2 -> 0.3。默认保留 12 位有效精度 */
export function roundFloat(value: number, precision = 12): number {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * 以浮点安全的乘法/除法计算 a*b（避免中间精度损失）。
 * 用于单位换算与货币换算，返回归一后的数值。
 */
export function safeMultiply(a: number, b: number): number {
  return roundFloat(a * b)
}

/** 千分位 + 固定小数位格式化（用于货币/大数展示） */
export function formatNumber(
  value: number,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  if (!Number.isFinite(value)) return String(value)
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 6
  }).format(value)
}

/** 货币格式化（Intl.NumberFormat，不引入额外库） */
export function formatCurrency(value: number, currency: string, locale = 'zh-CN'): string {
  if (!Number.isFinite(value)) return String(value)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 4
    }).format(value)
  } catch {
    // 未知币种代码时降级为普通数字 + 币种前缀
    return `${currency} ${formatNumber(value, { maximumFractionDigits: 4 })}`
  }
}

/** 百分比格式化 */
export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`
}
