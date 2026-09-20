/**
 * 编码转换纯函数集合：Base64 / URL / HTML 实体 / Unicode 转义。
 * 全部无副作用，可在 Node 单元测试中直接调用（依赖全局 TextEncoder/btoa，Node 18+ 与浏览器均可用）。
 */

/** UTF-8 安全的 Base64 编码（支持中文等非 ASCII） */
export function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/** 解码 Base64 为 UTF-8 字符串；非法输入抛错 */
export function base64Decode(b64: string): string {
  const clean = b64.trim()
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0)
    throw new Error('非法的 Base64 字符串')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** URL 组件编码 */
export function urlEncode(str: string): string {
  return encodeURIComponent(str)
}

/** URL 组件解码；非法转义抛错 */
export function urlDecode(str: string): string {
  return decodeURIComponent(str)
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** RFC 4648 Base32 编码（UTF-8 安全，含 = 填充） */
export function base32Encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  while (out.length % 8 !== 0) out += '='
  return out
}

/** 解码 Base32（忽略大小写/空白/填充）；非法字符抛错 */
export function base32Decode(str: string): string {
  const clean = str.replace(/=+$/, '').replace(/\s/g, '').toUpperCase()
  if (clean && !/^[A-Z2-7]+$/.test(clean)) throw new Error('非法的 Base32 字符串')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const ch of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

/** 转义 HTML 特殊字符，用于安全嵌入 HTML 文本 */
export function htmlEscape(str: string): string {
  return str.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)
}

/** 反转常见 HTML 实体（命名 + 十进制数字实体） */
export function htmlUnescape(str: string): string {
  return str
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, entity: string) => {
      if (entity[0] === '#') {
        const code =
          entity[1] === 'x' || entity[1] === 'X'
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : m
      }
      const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
      return named[entity] ?? m
    })
}

/** 将非 ASCII 字符转成 \uXXXX 转义序列 */
export function unicodeEscape(str: string): string {
  return str.replace(/[^\u0000-\u007F]/g, (c) =>
    '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')
  )
}

/** 解析 \uXXXX（含代理对）转义回原字符 */
export function unicodeUnescape(str: string): string {
  const units = str.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  )
  return units.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, (pair) =>
    String.fromCodePoint(
      (pair.charCodeAt(0) - 0xd800) * 0x400 + (pair.charCodeAt(1) - 0xdc00) + 0x10000
    )
  )
}
