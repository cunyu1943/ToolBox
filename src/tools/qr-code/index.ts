/** 二维码：包装 npm `qrcode`，只用它的浏览器构建（canvas PNG + svg tag）。 */

import QRCode from 'qrcode'

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrSettings {
  errorLevel: QrErrorLevel
  /** 静区模块数 */
  margin: number
  /** PNG 边长（像素） */
  width: number
  dark: string
  light: string
}

export interface QrOutput {
  png: string
  svg: string
  version: number
  /** 每边模块数 */
  modules: number
  errorLevel: QrErrorLevel
}

export type RenderResult = { ok: true; output: QrOutput } | { ok: false; error: string }

/** `qrcode` 只接受 #RGBAA/#RRGGBBAA 形式的颜色 */
export function normalizeHexColor(input: string): string | null {
  const body = input.trim().replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(body)) return `#${body.toLowerCase()}`
  if (/^[0-9a-f]{8}$/i.test(body)) return `#${body.toLowerCase()}`
  if (/^[0-9a-f]{3}$/i.test(body))
    return `#${body.toLowerCase().split('').map((char) => char + char).join('')}ff`
  return null
}

const toRendererOptions = (settings: QrSettings) => {
  const dark = normalizeHexColor(settings.dark)
  const light = normalizeHexColor(settings.light)
  if (!dark || !light) return null
  return {
    errorCorrectionLevel: settings.errorLevel,
    margin: settings.margin,
    width: settings.width,
    color: { dark, light }
  }
}

const describeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  if (/too far out of range|too much data|amount of data is too big|number out of range/i.test(message))
    return '内容超出二维码容量，请缩短文本或降低容错等级'
  if (/utf8|non\?ascii|numeric/i.test(message)) return '内容编码不受支持，请改用普通文本'
  return message
}

export async function renderQr(text: string, settings: QrSettings): Promise<RenderResult> {
  const options = toRendererOptions(settings)
  if (!options) return { ok: false, error: '前景/背景色需要 6 位或 8 位十六进制' }
  if (!text) return { ok: false, error: '请输入要编码的内容' }

  try {
    const symbol = QRCode.create(text, { errorCorrectionLevel: settings.errorLevel })
    const [png, svg] = await Promise.all([
      QRCode.toDataURL(text, { ...options, type: 'image/png' }),
      QRCode.toString(text, { ...options, type: 'svg' })
    ])
    return {
      ok: true,
      output: {
        png,
        svg: svg.trim(),
        version: symbol.version,
        modules: symbol.modules.size,
        errorLevel: settings.errorLevel
      }
    }
  } catch (error) {
    return { ok: false, error: describeError(error) }
  }
}

/** 各容错等级在版本 40 下可承载的字节数，用于提示剩余空间 */
export const CAPACITY_BY_LEVEL: Record<QrErrorLevel, number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}
