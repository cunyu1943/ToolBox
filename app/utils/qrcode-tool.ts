import QRCode from 'qrcode'

/**
 * 二维码生成（基于 qrcode 包）：输出 SVG 字符串供预览与下载，
 * PNG 通过 canvas data URL 生成（仅浏览器环境可用）。
 */

export type EcLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrOptions {
  level?: EcLevel
  margin?: number
  /** 前景色 #rrggbb */
  dark?: string
  /** 背景色 #rrggbb */
  light?: string
}

export async function generateQrSvg(text: string, opts: QrOptions = {}): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: opts.level ?? 'M',
    margin: opts.margin ?? 2,
    color: { dark: opts.dark ?? '#0f172a', light: opts.light ?? '#ffffff' }
  })
}

/** 仅浏览器：需要 document。超出 QR 容量时抛错 */
export async function generateQrPngDataUrl(text: string, opts: QrOptions & { size?: number } = {}): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: opts.level ?? 'M',
    margin: opts.margin ?? 2,
    width: opts.size ?? 512,
    color: { dark: opts.dark ?? '#0f172a', light: opts.light ?? '#ffffff' }
  })
}
