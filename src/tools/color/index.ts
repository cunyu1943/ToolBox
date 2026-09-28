/** 颜色工具的纯计算部分：解析、色彩空间互转、WCAG 对比度、色阶生成。 */

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Color extends Rgb {
  /** 0–1 */
  alpha: number
}

export interface Hsl {
  /** 0–360 */
  h: number
  /** 0–100 */
  s: number
  /** 0–100 */
  l: number
}

export type ColorSpace = 'hex' | 'rgb' | 'hsl'

export type ParseResult =
  | { ok: true; color: Color; space: ColorSpace }
  | { ok: false; error: string }

const clamp = (value: number, min = 0, max = 1): number => Math.min(Math.max(value, min), max)

const toHexPair = (value: number): string =>
  Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')

/** 支持 #rgb / #rgba / #rrggbb / #rrggbbaa，大小写与是否带 # 均不限 */
export function hexToRgb(input: string): (Rgb & { alpha: number }) | null {
  const body = input.trim().replace(/^#/, '')
  if (!/^[0-9a-f]+$/i.test(body)) return null

  const expand = (chars: string[]): number[] => chars.map((char) => Number.parseInt(char + char, 16))
  let pairs: number[]
  if (body.length === 3 || body.length === 4) pairs = expand([...body])
  else if (body.length === 6 || body.length === 8)
    pairs = body.match(/../g)!.map((pair) => Number.parseInt(pair, 16))
  else return null

  const [r, g, b, a] = pairs
  if (r === undefined || g === undefined || b === undefined) return null
  return { r, g, b, alpha: a === undefined ? 1 : a / 255 }
}

export function rgbToHex(color: Color, options: { alpha?: boolean; upper?: boolean } = {}): string {
  const body = toHexPair(color.r) + toHexPair(color.g) + toHexPair(color.b)
  const withAlpha =
    options.alpha || color.alpha < 1 ? body + toHexPair(color.alpha * 255) : body
  return (options.upper ? withAlpha.toUpperCase() : withAlpha)
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
  }
  const hue = Math.round((h < 0 ? h + 6 : h) * 60)
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return { h: hue, s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 }
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const segment: [number, number, number] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x]
  const m = ln - c / 2

  return {
    r: Math.round((segment[0] + m) * 255),
    g: Math.round((segment[1] + m) * 255),
    b: Math.round((segment[2] + m) * 255)
  }
}

const num = (value: string): number => Number.parseFloat(value)

/** 接受 hex、rgb()/rgba()、hsl()/hsla()，通道既支持数字也支持百分比 */
export function parseColor(input: string): ParseResult {
  const text = input.trim().replace(/\s+/g, ' ')
  if (!text) return { ok: false, error: '请输入颜色值' }

  if (text.startsWith('#') || /^[0-9a-f]{3,8}$/i.test(text)) {
    const parsed = hexToRgb(text)
    if (!parsed) return { ok: false, error: 'HEX 只支持 3/4/6/8 位十六进制字符' }
    return { ok: true, space: 'hex', color: { r: parsed.r, g: parsed.g, b: parsed.b, alpha: parsed.alpha } }
  }

  const functional = /^(rgb|rgba|hsl|hsla)\(([^)]*)\)$/i.exec(text)
  if (!functional) return { ok: false, error: '无法识别，试试 #42b883、rgb(66,184,131)、hsl(153,53%,49%)' }

  const kind = functional[1]!.toLowerCase()
  const parts = functional[2]!
    .split(/[,/\s]+/)
    .filter((part) => part !== '')

  if (parts.length < 3) return { ok: false, error: `${kind}() 需要 3 个通道值` }

  const readChannel = (value: string, scale: number): number | null => {
    const raw = value.endsWith('%') ? (num(value) / 100) * scale : num(value.replace(/deg$/i, ''))
    if (Number.isNaN(raw)) return null
    return scale === 360 ? raw : clamp(raw, 0, scale)
  }

  const alphaRaw = parts[3]
  let alpha = 1
  if (alphaRaw !== undefined) {
    const parsed = alphaRaw.endsWith('%') ? num(alphaRaw) / 100 : num(alphaRaw)
    if (Number.isNaN(parsed)) return { ok: false, error: `alpha 值「${alphaRaw}」不是数字` }
    alpha = clamp(parsed)
  }

  if (kind === 'hsl' || kind === 'hsla') {
    const h = readChannel(parts[0]!, 360)
    const s = readChannel(parts[1]!, 100)
    const l = readChannel(parts[2]!, 100)
    if (h === null || s === null || l === null) return { ok: false, error: 'HSL 通道解析失败' }
    const rgb = hslToRgb({ h, s, l })
    return { ok: true, space: 'hsl', color: { ...rgb, alpha } }
  }

  const channels = parts.slice(0, 3).map((part) => readChannel(part, 255))
  if (channels.some((channel) => channel === null))
    return { ok: false, error: 'RGB 通道需要 0–255 的数字或百分比' }
  const [r, g, b] = channels as [number, number, number]
  return { ok: true, space: 'rgb', color: { r, g, b, alpha } }
}

export interface ColorFormats {
  hex: string
  hexUpper: string
  rgb: string
  rgba: string
  hsl: string
  hsla: string
}

export function formatColor(color: Color): ColorFormats {
  const hsl = rgbToHsl(color)
  const a = Math.round(color.alpha * 1000) / 1000
  return {
    hex: `#${rgbToHex(color)}`,
    hexUpper: `#${rgbToHex(color, { upper: true })}`,
    rgb: `rgb(${color.r}, ${color.g}, ${color.b})`,
    rgba: `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`,
    hsl: `hsl(${hsl.h}, ${round(hsl.s)}%, ${round(hsl.l)}%)`,
    hsla: `hsla(${hsl.h}, ${round(hsl.s)}%, ${round(hsl.l)}%, ${a})`
  }
}

const round = (value: number): number => Math.round(value * 10) / 10

/** WCAG 2.x 相对亮度 */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number): number => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** 1–21，与颜色顺序无关 */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

export interface WcagChecks {
  aaNormal: boolean
  aaLarge: boolean
  aaaNormal: boolean
  aaaLarge: boolean
}

export function wcagChecks(ratio: number): WcagChecks {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5
  }
}

/** amount = 0 返回自身，1 返回 target */
export function mix(source: Rgb, target: Rgb, amount: number): Rgb {
  const t = clamp(amount)
  return {
    r: Math.round(source.r + (target.r - source.r) * t),
    g: Math.round(source.g + (target.g - source.g) * t),
    b: Math.round(source.b + (target.b - source.b) * t)
  }
}

export interface ScaleStep {
  label: string
  hex: string
  ratioToWhite: number
  ratioToBlack: number
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 }
const BLACK: Rgb = { r: 0, g: 0, b: 0 }

/** 50–900 色阶：小于 500 档向白色提亮，大于等于 500 档向黑色压暗 */
export function colorScale(color: Color): ScaleStep[] {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
  return steps.map((step) => {
    const amount = step < 500 ? ((500 - step) / 500) * 0.9 : ((step - 500) / 500) * 0.85
    const rgb = step < 500 ? mix(color, WHITE, amount) : mix(color, BLACK, amount)
    return {
      label: String(step),
      hex: `#${rgbToHex({ ...rgb, alpha: 1 })}`,
      ratioToWhite: contrastRatio(rgb, WHITE),
      ratioToBlack: contrastRatio(rgb, BLACK)
    }
  })
}

/** 前景色在该背景上更适中的选择 */
export function readableOn(color: Rgb): '#ffffff' | '#000000' {
  return contrastRatio(color, WHITE) >= contrastRatio(color, BLACK) ? '#ffffff' : '#000000'
}
