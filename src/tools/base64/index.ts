export interface EncodeOptions {
  urlSafe?: boolean
}

export interface DecodeResult {
  ok: boolean
  text?: string
  /** 字节流不是合法 UTF-8 时按 latin1 解码，结果可能含替换字符 */
  lossy?: boolean
  error?: string
}

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

export function encodeBase64(text: string, options: EncodeOptions = {}): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const standard = btoa(binary)
  if (!options.urlSafe) return standard
  return standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function normalizeBase64(input: string): string {
  return input
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/=+$/, '')
}

function pad(base64: string): string {
  const remainder = base64.length % 4
  if (!remainder) return base64
  if (remainder === 1) return base64
  return base64 + '='.repeat(4 - remainder)
}

export function decodeBase64(input: string): DecodeResult {
  const cleaned = normalizeBase64(input)
  if (!cleaned) return { ok: false, error: '输入为空' }
  if (cleaned.length % 4 === 1) return { ok: false, error: '有效字符数模 4 余 1，不是合法的 Base64 长度' }
  if (!BASE64_RE.test(pad(cleaned))) {
    const bad = /[^\sA-Za-z0-9+/=_-]/.exec(input)
    return {
      ok: false,
      error: bad
        ? `包含非法字符「${bad[0]}」(位置 ${bad.index})，Base64 只允许 A-Z a-z 0-9 + / - _ = 与空白`
        : '包含非法字符，Base64 只允许 A-Z a-z 0-9 + / - _ = 与空白'
    }
  }

  let binary: string
  try {
    binary = atob(pad(cleaned))
  } catch {
    return { ok: false, error: 'atob 解析失败，请检查填充（=）是否完整' }
  }

  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)

  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return { ok: true, lossy: true, text: new TextDecoder('latin1').decode(bytes) }
  }
}

export interface ByteStats {
  bytes: number
  chars: number
  base64Chars: number
}

export function statsFor(text: string): ByteStats {
  const bytes = new TextEncoder().encode(text).length
  return { bytes, chars: text.length, base64Chars: encodeBase64(text).length }
}
