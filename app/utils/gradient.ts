/**
 * CSS 渐变生成纯函数：由角度与色标拼出 linear-gradient(...)。
 */

export interface GradientStop {
  color: string
  /** 位置百分比 0-100 */
  pos: number
}

/** 生成 linear-gradient CSS 值；忽略空色标 */
export function buildLinearGradient(angleDeg: number, stops: GradientStop[]): string {
  const parts = stops
    .filter((s) => s.color)
    .map((s) => `${s.color} ${Math.round(Math.min(100, Math.max(0, s.pos)))}%`)
  const angle = Math.round(((angleDeg % 360) + 360) % 360)
  return `linear-gradient(${angle}deg, ${parts.join(', ')})`
}

/** 解析回显用的简易校验：至少两个有效色标才算可用渐变 */
export function isValidGradient(stops: GradientStop[]): boolean {
  return stops.filter((s) => s.color).length >= 2
}
