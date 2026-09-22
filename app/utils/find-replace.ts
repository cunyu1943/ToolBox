/**
 * 文本查找替换纯函数：普通/正则两种模式，可选区分大小写与全字匹配。
 * 正则模式按全局匹配执行，替换串支持 $1 分组引用；普通模式替换串按字面处理。
 */

export interface ReplaceOptions {
  search: string
  replace: string
  caseSensitive?: boolean
  useRegex?: boolean
  wholeWord?: boolean
}

export interface ReplaceResult {
  output: string
  count: number
  error: string
}

/** 转义正则元字符，供普通模式与全字匹配安全使用 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildPattern(opts: Required<Pick<ReplaceOptions, 'search' | 'caseSensitive' | 'useRegex' | 'wholeWord'>>): string {
  const body = opts.useRegex ? opts.search : escapeRegExp(opts.search)
  return opts.wholeWord ? `\\b(?:${body})\\b` : body
}

/** 执行查找替换；search 为空时视为无操作 */
export function replaceAll(text: string, opts: ReplaceOptions): ReplaceResult {
  const { search, replace = '', caseSensitive = true, useRegex = false, wholeWord = false } = opts
  const passthrough: ReplaceResult = { output: text, count: 0, error: '' }
  if (!text || !search) return passthrough

  const flags = 'g' + (caseSensitive ? '' : 'i')
  let re: RegExp
  try {
    re = new RegExp(buildPattern({ search, caseSensitive, useRegex, wholeWord }), flags)
  } catch (e) {
    return { output: text, count: 0, error: '正则表达式无效：' + (e instanceof Error ? e.message : String(e)) }
  }

  const count = (text.match(re) || []).length
  if (count === 0) return passthrough

  let output: string
  try {
    // 普通模式替换串按字面处理（$& 等不展开），正则模式才启用分组引用
    output = useRegex ? text.replace(re, replace) : text.replace(re, () => replace)
  } catch (e) {
    // 如正则替换串出现 "$(" 等非法分组引用
    return { output: text, count: 0, error: '替换串无效：' + (e instanceof Error ? e.message : String(e)) }
  }
  return { output, count, error: '' }
}
