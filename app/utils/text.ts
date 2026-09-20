/**
 * 文本处理纯函数：大小写、行操作（去空行/去重/排序/反转）与统计。
 */

export function toUpperCase(text: string): string {
  return text.toUpperCase()
}

export function toLowerCase(text: string): string {
  return text.toLowerCase()
}

/** 逐字符反转大小写 */
export function invertCase(text: string): string {
  return [...text].map((c) => (c === c.toLowerCase() && c !== c.toUpperCase() ? c.toUpperCase() : c === c.toUpperCase() && c !== c.toLowerCase() ? c.toLowerCase() : c)).join('')
}

export interface TextStats {
  chars: number
  charsNoSpace: number
  words: number
  lines: number
  bytes: number
}

/** 统计：字符数、去空白字符数、词数（按空白分词）、行数、UTF-8 字节数 */
export function textStats(text: string): TextStats {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const lines = text ? text.split('\n').length : 0
  return {
    chars: [...text].length,
    charsNoSpace: [...text].filter((c) => !/\s/.test(c)).length,
    words,
    lines,
    bytes: new TextEncoder().encode(text).length
  }
}

export interface LineOptions {
  trim?: boolean
  removeEmpty?: boolean
  dedupe?: boolean
  sort?: 'none' | 'asc' | 'desc'
  reverse?: boolean
}

/** 按行处理文本 */
export function processLines(text: string, opts: LineOptions = {}): string {
  let lines = text.split('\n')
  if (opts.trim) lines = lines.map((l) => l.trim())
  if (opts.removeEmpty) lines = lines.filter((l) => l.length > 0)
  if (opts.dedupe) lines = [...new Set(lines)]
  if (opts.sort === 'asc') lines = [...lines].sort((a, b) => a.localeCompare(b, 'zh'))
  else if (opts.sort === 'desc') lines = [...lines].sort((a, b) => b.localeCompare(a, 'zh'))
  if (opts.reverse) lines = lines.reverse()
  return lines.join('\n')
}
