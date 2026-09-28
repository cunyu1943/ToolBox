/**
 * 查找替换：字面量 / 正则两种模式，可选区分大小写与全字匹配。
 *
 * 两处与旧实现不同：
 * - **命中位置要能查**。返回逐条命中（含行号、列号与捕获组），而不只是一个替换计数。
 * - **全字匹配用前后瞻而不是 `\b`**。`\b` 在 `ID:` 这类以非单词字符开头的搜索词上会失效；
 *   前后瞻把「单词字符」限定为 `[A-Za-z0-9_]`，所以「用户ID是」里的 `ID` 算独立词
 *   （汉字不作为拉丁词的组成部分），而 `user_name` 里的 `name` 仍算词内。
 */

export interface FindOptions {
  search: string
  replace: string
  caseSensitive: boolean
  useRegex: boolean
  wholeWord: boolean
}

export interface MatchItem {
  /** 命中在输入中的起始下标 */
  index: number
  line: number
  column: number
  text: string
  groups: string[]
}

export interface ReplaceResult {
  ok: boolean
  value: string
  count: number
  /** 最多前 200 条命中 */
  matches: MatchItem[]
  more: number
  error?: string
  notes: string[]
}

/** 交给 `new RegExp` 前把字面量里的元字符全部转义（`-` 不在字符类里，不用管） */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const LOOKBEHIND = '(?<![A-Za-z0-9_])'
const LOOKAHEAD = '(?![A-Za-z0-9_])'

const MAX_MATCHES = 200

function lineColumns(text: string): number[] {
  const starts = [0]
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1)
  return starts
}

function locate(starts: number[], index: number): { line: number; column: number } {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] as number <= index) lo = mid
    else hi = mid - 1
  }
  return { line: lo + 1, column: index - (starts[lo] as number) + 1 }
}

/** 正则里没有捕获组却用了 `$1`–`$9`，替换结果会是空串 —— 必须报出来 */
function badGroupRefs(replace: string, groups: number): string[] {
  const bad: string[] = []
  const re = /(^|[^\\])\$(\d+)/g
  for (const match of replace.matchAll(re)) {
    const n = Number(match[2])
    if (n > groups) bad.push(`$${n}`)
  }
  return [...new Set(bad)]
}

/**
 * 数出源里的捕获组个数。`RegExp` 上不直接暴露这个数（`groups` 只在有命名组时存在），
 * 所以要自己扫：跳过字符类，并排除 `(?:` `(?=` `(?!` `(?<=` `(?<!` 这五种非捕获写法。
 */
export function countGroups(source: string): number {
  let total = 0
  let inClass = false
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i] as string
    if (ch === '\\') {
      i += 1
      continue
    }
    if (inClass) {
      if (ch === ']') inClass = false
      continue
    }
    if (ch === '[') {
      inClass = true
      continue
    }
    if (ch !== '(') continue
    if (source[i + 1] === '?') {
      const kind = source[i + 2]
      if (kind === ':' || kind === '=' || kind === '!') continue
      if (kind === '<' && /=|!/.test(source[i + 3] ?? '')) continue
    }
    total += 1
  }
  return total
}

export function buildPattern(options: FindOptions): { source: string; flags: string } {
  const body = options.useRegex ? options.search : escapeRegExp(options.search)
  const source = options.wholeWord ? `${LOOKBEHIND}(?:${body})${LOOKAHEAD}` : body
  // 一律带 u：正则模式下的 \p{…}、代理对与非法转义检查都依赖它
  return { source, flags: options.caseSensitive ? 'gu' : 'giu' }
}

export function findAll(text: string, options: FindOptions): ReplaceResult {
  const notes: string[] = []
  if (!options.search) {
    return {
      ok: true,
      value: text,
      count: 0,
      matches: [],
      more: 0,
      notes: ['搜索内容为空，未做任何替换']
    }
  }
  const { source, flags } = buildPattern(options)
  let re: RegExp
  try {
    re = new RegExp(source, flags)
  } catch (error) {
    return {
      ok: false,
      value: text,
      count: 0,
      matches: [],
      more: 0,
      error: `正则表达式无效：${error instanceof Error ? error.message.replace(/^Invalid regular expression:\s*/, '') : String(error)}`,
      notes: options.useRegex ? [] : ['当前是字面量模式，元字符不需要转义；要写正则请打开「正则模式」']
    }
  }

  const starts = lineColumns(text)
  const matches: MatchItem[] = []
  let count = 0
  let zeroWidth = false
  for (const match of text.matchAll(re)) {
    count += 1
    if (matches.length < MAX_MATCHES) {
      const index = match.index as number
      matches.push({
        index,
        ...locate(starts, index),
        text: match[0] as string,
        groups: match.slice(1).map((group) => group ?? '')
      })
    }
    // `a*`、`\b` 这类能匹配空串的模式在 while 循环里会原地不动地死循环，只统计到第一处
    if (match[0] === '') {
      zeroWidth = true
      break
    }
  }
  if (zeroWidth) notes.push('这个模式能匹配空串，命中只统计到第一处；请把模式改成至少要求一个字符')

  if (options.useRegex) {
    const groups = countGroups(re.source)
    const bad = badGroupRefs(options.replace, groups)
    if (bad.length) {
      return {
        ok: false,
        value: text,
        count,
        matches,
        more: Math.max(0, count - matches.length),
        error: `替换串里的 ${bad.join('、')} 没有对应的捕获组（该表达式有 ${groups} 组），这些位置会被替换成空`,
        notes
      }
    }
  }

  if (!count) notes.push('没有任何命中，输出与输入相同')
  if (count > matches.length) notes.push(`命中过多，只列出前 ${MAX_MATCHES} 条`)
  if (options.wholeWord && !options.caseSensitive) notes.push('「不区分大小写 + 全字匹配」下 `id` 与 `ID` 都会命中')
  if (!options.useRegex && /[$\\]/.test(options.replace)) notes.push('字面量模式下替换串里的 `$` 与 `\\` 按普通字符处理')

  // 字面量模式用函数形式回传替换串，避免 `$&` 被当成「整段命中」展开
  const value = !count ? text : options.useRegex ? text.replace(re, options.replace) : text.replace(re, () => options.replace)

  return {
    ok: true,
    value,
    count,
    matches,
    more: Math.max(0, count - matches.length),
    notes
  }
}

/** 全部替换。`findAll` 已经把 `value` 算好了，这里只补一条人话结论 */
export function replaceAll(text: string, options: FindOptions): ReplaceResult {
  const found = findAll(text, options)
  if (!found.ok || !found.count) return found
  return { ...found, notes: [...found.notes, `共替换 ${found.count} 处`] }
}

/** 逐条替换用：只替换第 n 个命中（1 起） */
export function replaceNth(text: string, options: FindOptions, nth: number): ReplaceResult {
  const found = findAll(text, options)
  if (!found.ok || !found.count) return found
  const { source, flags } = buildPattern(options)
  const re = new RegExp(source, flags)
  let index = 0
  const value = text.replace(re, (...args) => {
    index += 1
    if (index !== nth) return args[0] as string
    if (!options.useRegex) return options.replace
    const groups = args.slice(1, -2) as (string | undefined)[]
    return options.replace.replace(/\$(\d+)/g, (_, digit: string) => (groups[Number(digit) - 1] as string) ?? '')
  })
  return { ...found, value, notes: [`只替换第 ${nth} 处（共 ${found.count} 处命中）`] }
}

export const FIND_SAMPLES: { label: string; search: string; replace: string; useRegex: boolean; text: string }[] = [
  { label: '中文全字匹配', search: 'ID', replace: '编号', useRegex: false, text: '用户ID是 12，身份ID\t和 userId 不同' },
  { label: '正则：日期重排', search: '(\\d{4})-(\\d{2})-(\\d{2})', replace: '$3/$2/$1', useRegex: true, text: '开始 2026-09-23，结束 2026-12-31' },
  { label: '正则：去掉重复空白', search: '[ \\t]{2,}', replace: ' ', useRegex: true, text: 'a   b\t\tc' },
  { label: '陷阱：$1 没有捕获组', search: 'foo', replace: '[$1]', useRegex: true, text: 'foo foo' }
]
