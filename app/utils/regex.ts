/**
 * 正则表达式测试纯函数：查找匹配、捕获组与命中次数，非法模式返回错误。
 */

export interface RegexMatch {
  index: number
  value: string
  groups: (string | undefined)[]
}

export interface RegexResult {
  ok: boolean
  error?: string
  count: number
  matches: RegexMatch[]
}

/** 用 pattern + flags（应含 g）在 text 中查找全部匹配 */
export function testRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern) return { ok: true, count: 0, matches: [] }
  let re: RegExp
  try {
    re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '无效的正则表达式', count: 0, matches: [] }
  }
  const matches: RegexMatch[] = []
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    if (m[0] === '') {
      re.lastIndex++ // 跳过零宽匹配避免死循环
      if (++guard > 100000) break
      continue
    }
    matches.push({ index: m.index, value: m[0], groups: m.slice(1) })
    if (!re.global) break
    if (++guard > 100000) break
  }
  return { ok: true, count: matches.length, matches }
}
