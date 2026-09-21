/**
 * XML 格式化 / 压缩（纯字符串 tokenizer，不依赖 DOM）。
 * 支持：普通/自闭合标签、文本、注释、CDATA、处理指令（<??>）、DOCTYPE。
 * 校验标签配对，出错返回位置信息；不做命名空间/属性级深度校验。
 * 已知简化：文本与子元素混排时拆到不同行（纯文本元素保持一行）。
 */

export interface XmlResult {
  ok: boolean
  output: string
  error: string
}

type Token =
  | { kind: 'open'; name: string; raw: string; pos: number }
  | { kind: 'close'; name: string; pos: number }
  | { kind: 'self'; raw: string; pos: number }
  | { kind: 'decl'; raw: string; pos: number } // <?...?> 与 <!DOCTYPE...>
  | { kind: 'comment'; raw: string; pos: number }
  | { kind: 'cdata'; raw: string; pos: number }
  | { kind: 'text'; raw: string; pos: number }

function tokenize(src: string): Token[] | string {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    if (src[i] === '<') {
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i)
        if (end === -1) return `注释未闭合（位置 ${i}）`
        tokens.push({ kind: 'comment', raw: src.slice(i, end + 3), pos: i })
        i = end + 3
        continue
      }
      if (src.startsWith('<![CDATA[', i)) {
        const end = src.indexOf(']]>', i)
        if (end === -1) return `CDATA 未闭合（位置 ${i}）`
        tokens.push({ kind: 'cdata', raw: src.slice(i, end + 3), pos: i })
        i = end + 3
        continue
      }
      if (src.startsWith('<!', i)) {
        const end = src.indexOf('>', i)
        if (end === -1) return `声明未闭合（位置 ${i}）`
        tokens.push({ kind: 'decl', raw: src.slice(i, end + 1), pos: i })
        i = end + 1
        continue
      }
      if (src.startsWith('<?', i)) {
        const end = src.indexOf('?>', i)
        if (end === -1) return `处理指令未闭合（位置 ${i}）`
        tokens.push({ kind: 'decl', raw: src.slice(i, end + 2), pos: i })
        i = end + 2
        continue
      }
      const end = src.indexOf('>', i)
      if (end === -1) return `标签未闭合（位置 ${i}）`
      const inner = src.slice(i + 1, end)
      if (inner.startsWith('/')) {
        const name = inner.slice(1).trim().split(/\s+/)[0] ?? ''
        if (!name) return `闭合标签缺少名称（位置 ${i}）`
        tokens.push({ kind: 'close', name, pos: i })
      } else if (inner.endsWith('/')) {
        tokens.push({ kind: 'self', raw: `<${inner.trimEnd()}>`, pos: i })
      } else {
        const name = inner.trim().split(/\s+/)[0] ?? ''
        if (!name) return `开始标签缺少名称（位置 ${i}）`
        tokens.push({ kind: 'open', name, raw: `<${inner}>`, pos: i })
      }
      i = end + 1
      continue
    }
    let next = src.indexOf('<', i)
    if (next === -1) next = src.length
    tokens.push({ kind: 'text', raw: src.slice(i, next), pos: i })
    i = next
  }
  return tokens
}

function checkPairs(tokens: Token[]): string {
  const stack: { name: string; pos: number }[] = []
  for (const t of tokens) {
    if (t.kind === 'open') stack.push({ name: t.name, pos: t.pos })
    else if (t.kind === 'close') {
      const top = stack.pop()
      if (!top) return `</${t.name}> 没有匹配的开始标签（位置 ${t.pos}）`
      if (top.name !== t.name)
        return `</${t.name}> 与 <${top.name}>（位置 ${top.pos}）不匹配`
    }
  }
  const leftover = stack[stack.length - 1]
  if (leftover) return `<${leftover.name}> 未闭合（位置 ${leftover.pos}）`
  return ''
}

function fail(error: string): XmlResult {
  return { ok: false, output: '', error }
}

export function formatXml(src: string, indent = 2): XmlResult {
  if (!src.trim()) return fail('请输入 XML 内容')
  const tokens = tokenize(src)
  if (typeof tokens === 'string') return fail(tokens)
  const pairErr = checkPairs(tokens)
  if (pairErr) return fail(pairErr)

  const pad = ' '.repeat(indent)
  const lines: string[] = []
  let depth = 0
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k]!
    // <b>text</b> 合并为一行
    const next = tokens[k + 1]
    const next2 = tokens[k + 2]
    if (
      t.kind === 'open' &&
      next?.kind === 'text' &&
      next2?.kind === 'close' &&
      next2.name === t.name
    ) {
      const text = next.raw.replace(/\s+/g, ' ').trim()
      lines.push(pad.repeat(depth) + `${normTag(t.raw)}${text}</${t.name}>`)
      k += 2
      continue
    }
    switch (t.kind) {
      case 'open':
        lines.push(pad.repeat(depth) + normTag(t.raw))
        depth++
        break
      case 'close':
        depth = Math.max(0, depth - 1)
        lines.push(pad.repeat(depth) + `</${t.name}>`)
        break
      case 'self':
      case 'decl':
        lines.push(pad.repeat(depth) + t.raw)
        break
      case 'comment':
      case 'cdata':
        lines.push(
          ...t.raw
            .split('\n')
            .map(l => l.trim())
            .filter(l => l !== '')
            .map(l => pad.repeat(depth) + l)
        )
        break
      case 'text': {
        const text = t.raw.replace(/\s+/g, ' ').trim()
        if (text) lines.push(pad.repeat(depth) + text)
        break
      }
    }
  }
  return { ok: true, output: lines.join('\n'), error: '' }
}

export function minifyXml(src: string): XmlResult {
  if (!src.trim()) return fail('请输入 XML 内容')
  const tokens = tokenize(src)
  if (typeof tokens === 'string') return fail(tokens)
  const pairErr = checkPairs(tokens)
  if (pairErr) return fail(pairErr)
  let out = ''
  for (const t of tokens) {
    if (t.kind === 'text') {
      const text = t.raw.replace(/\s+/g, ' ').trim()
      // 仅在标签与文本可能粘连时补一个空格
      if (text && out && !/[<>]$/.test(out) && !/^[<>]/.test(text)) out += ' '
      out += text
    } else if (t.kind === 'close') {
      out += `</${t.name}>`
    } else if (t.kind === 'open' || t.kind === 'self') {
      out += normTag(t.raw)
    } else {
      out += t.raw
    }
  }
  return { ok: true, output: out, error: '' }
}

/** 去掉标签内换行、归一属性间空白 */
function normTag(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\s+\/>$/, '/>')
    .replace(/\s+>$/, '>')
    .trim()
}
