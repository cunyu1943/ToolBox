import { hexToRgb } from '~/utils/color'

/**
 * WCAG 2.1 颜色对比度检查：相对亮度、对比度与 AA/AAA 达标判定。
 * 阈值：普通文本 AA 4.5 / AAA 7；大文本 AA 3 / AAA 4.5。
 */

export interface ContrastResult {
  /** 保留两位小数的对比度 */
  ratio: number
  passAA: boolean
  passAAA: boolean
  passAALarge: boolean
  passAAALarge: boolean
}

/** sRGB 8bit 通道 → 线性光 */
function channelLinear(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** 相对亮度（WCAG 2.1），输入可为 #hex（含 3/4/6/8 位），非法返回 null */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return (
    0.2126 * channelLinear(rgb.r) +
    0.7152 * channelLinear(rgb.g) +
    0.0722 * channelLinear(rgb.b)
  )
}

/** 对比度，任一色值非法返回 null */
export function contrastRatio(fg: string, bg: string): number | null {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  if (l1 === null || l2 === null) return null
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

export function evaluateContrast(fg: string, bg: string): ContrastResult | null {
  const ratio = contrastRatio(fg, bg)
  if (ratio === null) return null
  return {
    ratio,
    passAA: ratio >= 4.5,
    passAAA: ratio >= 7,
    passAALarge: ratio >= 3,
    passAAALarge: ratio >= 4.5
  }
}
