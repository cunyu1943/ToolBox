export interface RegexFlag {
  flag: string
  label: string
  note: string
}

export const regexFlags: RegexFlag[] = [
  { flag: 'g', label: 'global', note: '查找全部匹配，而不是只找第一个' },
  { flag: 'i', label: 'ignoreCase', note: '忽略大小写' },
  { flag: 'm', label: 'multiline', note: '让 ^ $ 匹配每一行的行首尾' },
  { flag: 's', label: 'dotAll', note: '让 . 也能匹配换行' },
  { flag: 'u', label: 'unicode', note: '按码点处理，启用更严格的转义校验' },
  { flag: 'y', label: 'sticky', note: '从 lastIndex 处强制连续匹配' }
]

export interface RegexSegment {
  type: 'text' | 'match'
  value: string
  matchIndex?: number
}

export interface RegexMatch {
  index: number
  length: number
  full: string
  groups: (string | undefined)[]
  named: Record<string, string>
}

export const MATCH_LIMIT = 2000

export type RegexOutcome =
  | { ok: true; matches: RegexMatch[]; segments: RegexSegment[]; truncated: boolean }
  | { ok: false; error: string }

const buildSegments = (subject: string, matches: RegexMatch[]): RegexSegment[] => {
  const segments: RegexSegment[] = []
  let cursor = 0
  matches.forEach((match, index) => {
    if (match.index > cursor) segments.push({ type: 'text', value: subject.slice(cursor, match.index) })
    if (match.length === 0) {
      // 零宽匹配：标记一个插入点，避免吞掉后续文本
      segments.push({ type: 'match', value: '', matchIndex: index })
      return
    }
    segments.push({ type: 'match', value: subject.slice(match.index, match.index + match.length), matchIndex: index })
    cursor = match.index + match.length
  })
  if (cursor < subject.length) segments.push({ type: 'text', value: subject.slice(cursor) })
  return segments
}

export function runRegex(pattern: string, flags: string, subject: string): RegexOutcome {
  if (!pattern) return { ok: true, matches: [], segments: [{ type: 'text', value: subject }], truncated: false }

  let regexp: RegExp
  try {
    regexp = new RegExp(pattern, flags.includes('g') || flags.includes('y') ? flags : `${flags}g`)
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) }
  }

  const matches: RegexMatch[] = []
  let truncated = false

  while (matches.length <= MATCH_LIMIT) {
    const match = regexp.exec(subject)
    if (!match) break
    matches.push({
      index: match.index,
      length: match[0].length,
      full: match[0],
      groups: match.slice(1),
      named: { ...(match.groups as Record<string, string> | undefined) }
    })
    if (match[0].length === 0) regexp.lastIndex += 1
  }
  if (matches.length > MATCH_LIMIT) {
    matches.length = MATCH_LIMIT
    truncated = true
  }

  return { ok: true, matches, segments: buildSegments(subject, matches), truncated }
}

export function replacePreview(pattern: string, flags: string, subject: string, replacement: string): string {
  if (!pattern) return subject
  try {
    return subject.replace(new RegExp(pattern, flags), replacement)
  } catch {
    return ''
  }
}

/** 常用片段的中文速查，帮助读懂自己的表达式。 */
export const cheatsheet: { token: string; meaning: string }[] = [
  { token: '\\d \\D', meaning: '数字 / 非数字' },
  { token: '\\w \\W', meaning: '字母数字下划线 / 其反' },
  { token: '\\s \\S', meaning: '空白 / 非空白' },
  { token: '. ^ $', meaning: '任意字符（除换行）/ 行首 / 行尾' },
  { token: '* + ? {2,4}', meaning: '重复次数：0+ / 1+ / 0-1 / 区间' },
  { token: '[] | ()', meaning: '字符类 / 或 / 分组捕获' },
  { token: '(?: )', meaning: '只分组不捕获' },
  { token: '(?<name> )', meaning: '命名捕获组' },
  { token: '(?= ) (?! )', meaning: '前瞻肯定 / 否定' },
  { token: '\\b', meaning: '单词边界' }
]
