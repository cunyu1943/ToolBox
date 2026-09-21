/**
 * data URL / Base64 图片解析纯函数（不依赖 DOM，可在测试中运行）。
 */

export interface ParsedDataUrl {
  mime: string
  isBase64: boolean
  /** 去掉前缀后的数据部分 */
  data: string
  /** 解码后的字节数；非法 Base64 为 0 */
  bytes: number
}

/** 解析 data: 前缀 URL，非法返回 null */
export function parseDataUrl(url: string): ParsedDataUrl | null {
  const m = /^data:([^;,]*)?([^,]*)?;base64,([\s\S]*)$/i.exec(url.trim())
  if (!m) return null
  const mime = m[1] || 'text/plain'
  const data = m[3]
  return { mime, isBase64: true, data, bytes: base64ByteLength(data) }
}

/** Base64 字符串解码后的字节数（忽略换行等空白，非法字符返回 0） */
export function base64ByteLength(b64: string): number {
  const clean = b64.replace(/\s/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return 0
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  return Math.floor(clean.length * 3 / 4) - pad
}

/** 字节数转可读大小，如 12.3 KB */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
