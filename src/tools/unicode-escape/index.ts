/**
 * Unicode 转义 ⇄ 原文（`\uXXXX` / `\u{XXXXX}` / `\xNN`）。
 *
 * 转义方向有两种口径：
 * - `utf16`：逐个 UTF-16 码元转义，emoji 会拆成两个 `\uXXXX`（代理对）。JS 源码里安全，
 *   但 JSON/Java 的老式解析器读到孤立代理也能拼回原字符。
 * - `codepoint`：ES2015 的 `\u{1F600}`，一个码点对一条转义，可读性好，但不是所有语言都支持。
 * 解码方向同时认三种写法，并把无法识别的序列连位置一起上报，绝不静默吞掉。
 */

export type EscapeForm = 'utf16' | 'codepoint'

export interface EscapeOptions {
  form: EscapeForm
  /** false 时连 ASCII 一起转义，用于纯 ASCII 传输场景 */
  nonAsciiOnly: boolean
  uppercaseHex: boolean
}

export interface EscapeResult {
  ok: boolean
  value: string
  /** 被转义的码点数 */
  escaped: number
  total: number
  notes: string[]
}

export interface UnescapeResult {
  ok: boolean
  value: string
  /** 成功还原的转义条数 */
  decoded: number
  /** 形如 `\\u12`（第 4 个字符处）的非法片段 */
  invalid: string[]
  notes: string[]
}

const hexOf = (code: number, uppercase: boolean): string => {
  const text = code.toString(16)
  return uppercase ? text.toUpperCase() : text
}

export function escapeUnicode(text: string, options: EscapeOptions): EscapeResult {
  const notes: string[] = []
  let escaped = 0
  let value = ''

  const escapeUnit = (code: number): string => `\\u${hexOf(code, options.uppercaseHex).padStart(4, '0')}`

  for (const ch of text) {
    const code = ch.codePointAt(0) as number
    // 反斜杠是转义符本身，「只转非 ASCII」时必须一并转义，
    // 否则 `\` 紧跟一条 \uXXXX 会让解码方读成「字面量反斜杠 + 文本」。
    if (options.nonAsciiOnly && code <= 0x7f && ch !== '\\') {
      value += ch
      continue
    }
    escaped += 1
    if (ch === '\\') {
      value += '\\\\'
    } else if (options.form === 'codepoint') {
      value += `\\u{${hexOf(code, options.uppercaseHex)}}`
    } else if (code <= 0xffff) {
      value += escapeUnit(code)
    } else {
      value += escapeUnit(ch.charCodeAt(0)) + escapeUnit(ch.charCodeAt(1))
    }
  }

  const total = [...text].length
  if (!text) notes.push('输入为空')
  if (value.includes('\\\\')) notes.push('反斜杠一律转义成 `\\\\`，否则它和后面的转义符连不成正确的序列')
  if (escaped && options.form === 'utf16' && [...text].some((ch) => (ch.codePointAt(0) as number) > 0xffff)) {
    notes.push('增补平面字符（emoji、生僻字）在 utf16 口径下拆成两条代理项')
  }
  if (escaped && options.form === 'codepoint') {
    notes.push('`\\u{…}` 是 ES2015 语法，JSON 规范与多数老解析器不认，跨语言传输前先确认')
  }
  if (escaped && options.nonAsciiOnly) {
    notes.push(`转义后长度从 ${text.length} 涨到 ${value.length}，别拿去拼 URL`)
  }
  return { ok: true, value, escaped, total, notes }
}

const ESCAPE_RE = /\\\\|\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2}))/g
const ESCAPE_WHOLE_RE = /^\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2})$/

/**
 * 非法的 `\u`/`\x` 片段单独扫一遍再上报，避免和合法匹配混在一起。
 */
function findInvalid(text: string): string[] {
  const invalid: string[] = []
  const bad = /\\(?:u\{[^}]*\}?|u[0-9a-fA-F]{0,4}|x[0-9a-fA-F]{0,2})/g
  for (const match of text.matchAll(bad)) {
    if (ESCAPE_WHOLE_RE.test(match[0])) continue
    const label = `${match[0]}（第 ${match.index! + 1} 个字符处）`
    if (!invalid.includes(label)) invalid.push(label)
  }
  return invalid
}

export function unescapeUnicode(text: string): UnescapeResult {
  const notes: string[] = []
  let decoded = 0
  let loneSurrogates = 0

  const value = text.replace(ESCAPE_RE, (whole, _inner, brace, unit, byte) => {
    if (whole === '\\\\') return '\\' // 转义符本身：`\\u4e2d` 是字面量反斜杠 + 文本
    const code = Number.parseInt(brace ?? unit ?? byte ?? '', 16)
    if (code > 0x10ffff) {
      notes.push(`${whole} 超出 Unicode 最大码点 U+10FFFF，已原样保留`)
      return whole
    }
    decoded += 1
    const ch = String.fromCodePoint(code)
    if (code >= 0xd800 && code <= 0xdfff) loneSurrogates += 1
    return ch
  })

  const invalid = findInvalid(text)
  if (!text) notes.push('输入为空')
  if (!decoded && text) notes.push('没有找到合法的 \\uXXXX、\\u{…} 或 \\xNN 序列')
  if (loneSurrogates) {
    notes.push(`还原出 ${loneSurrogates} 个孤立代理项：单独的 \\uD83D 不是合法字符，需要配对的第二个转义`)
  }
  if (/\\\\u/.test(text)) {
    notes.push('出现了 `\\\\u`（双反斜杠）：按转义符本身处理，只还原成一个字面量反斜杠')
  }
  if (invalid.length) notes.push(`无法识别的片段：${invalid.slice(0, 6).join('、')}`)

  return { ok: decoded > 0, value, decoded, invalid, notes }
}

export const UNICODE_SAMPLES: { label: string; text: string; escaped: string }[] = [
  { label: '中文', text: '工具箱 ToolBox', escaped: '\\u5de5\\u5177\\u7bb1 ToolBox' },
  { label: 'emoji', text: '签名 ✅ 完成', escaped: '签名 \\u2705 完成' },
  { label: '生僻字（增补平面）', text: '𠮷野家', escaped: '\\ud842\\udfb7\\u91ce\\u5bb6' },
  { label: '码点写法', text: '𠮷', escaped: '\\u{20bb7}' }
]
