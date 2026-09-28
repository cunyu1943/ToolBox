/**
 * HTML ⇄ Markdown 互转内核（纯函数，不碰 DOM）。
 *
 * 不用 `DOMParser` 是因为内核要能被 `node --experimental-strip-types` 直接 import 做断言验证，
 * 所以这里手写一个宽容的 HTML 词法器 + 递归渲染器。顺带修掉旧站同款工具的两个硬伤：
 * 嵌套列表会被拍平、Markdown 特殊字符不转义（`*` `_` `[` 会悄悄改变结果含义）。
 */

import { decodeHtml, escapeHtml } from '../html-entity/index.ts'

export interface ConvertResult {
  value: string
  notes: string[]
  warnings: string[]
}

/* ================================================================== *
 * 1. HTML 词法 + 宽容建树
 * ================================================================== */

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
])

/** 内容按字面文本吃掉，不按标签解析 */
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'noembed', 'noframes', 'plaintext'])

/** 遇到该标签时自动闭合的栈顶标签 */
const AUTO_CLOSE: Record<string, string[]> = {
  li: ['li'],
  dt: ['dt', 'dd'],
  dd: ['dt', 'dd'],
  thead: ['tbody', 'tfoot'],
  tbody: ['tbody', 'tfoot'],
  tfoot: ['tbody'],
  tr: ['td', 'th', 'tr'],
  th: ['td', 'th'],
  td: ['td', 'th'],
  option: ['option', 'optgroup'],
  optgroup: ['optgroup'],
  p: ['p']
}

/** 块级标签会顺手关掉未闭合的 `<p>` */
const CLOSES_P = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'
])

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'dd', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'li', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section',
  'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
])

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
const ATTR_RE = /([a-zA-Z_:][a-zA-Z0-9:._-]*)(\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g
const NOISE_RE = /<!--[\s\S]*?(?:-->|$)|<!\s*doctype[^>]*>|<\?[\s\S]*?\?>/gi

export interface HtmlElement {
  kind: 'el'
  tag: string
  attrs: Record<string, string>
  children: HtmlNode[]
}

export type HtmlNode = HtmlElement | string

function isElement(node: HtmlNode): node is HtmlElement {
  return typeof node === 'object' && node !== null
}

/** 属性值带着引号被整体捕获，这里剥掉首尾同种引号（裸值如 `checked` 保持空串） */
function unquote(value: string): string {
  const edge = value[0]
  if ((edge === '"' || edge === "'") && value.length >= 2 && value.endsWith(edge)) return value.slice(1, -1)
  return value
}

function attrsOf(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const match of raw.matchAll(ATTR_RE)) {
    const name = (match[1] ?? '').toLowerCase()
    if (name) attrs[name] = decodeHtml(unquote(match[3] ?? '')).text
  }
  return attrs
}

export interface HtmlDoc {
  root: HtmlElement
  /** 被丢弃的注释 / 声明条数 */
  comments: number
  /** 找不到配对开标签的闭合标签 */
  unmatched: string[]
  /** 解析结束时仍未闭合的标签 */
  unclosed: string[]
}

/** 宽容建树：允许标签不闭合、也允许多余的闭合标签，问题只记录不抛错 */
export function parseHtml(html: string): HtmlDoc {
  const noise = (html.match(NOISE_RE) ?? []).length
  const source = html.replace(NOISE_RE, '')
  const root: HtmlElement = { kind: 'el', tag: '#root', attrs: {}, children: [] }
  const stack: HtmlElement[] = [root]
  const unmatched: string[] = []

  const top = (): HtmlElement => stack[stack.length - 1] as HtmlElement
  const push = (node: HtmlNode) => top().children.push(node)

  let index = 0
  TAG_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = TAG_RE.exec(source))) {
    if (match.index < index) continue
    if (match.index > index) push(source.slice(index, match.index))

    const [raw, slash, nameRaw, attrRaw, selfClose] = match as unknown as string[]
    const name = (nameRaw ?? '').toLowerCase()
    index = match.index + raw.length
    TAG_RE.lastIndex = index

    if (slash === '/') {
      // 必须找最内层的同名标签：嵌套列表里 `</li>` 用 findIndex 会关掉外层的 `<li>`，把子项甩到父级
      const depth = stack.map((el) => el.tag).lastIndexOf(name)
      if (depth <= 0) {
        if (name) unmatched.push(name)
        continue
      }
      while (stack.length > depth) stack.pop()
      continue
    }

    const element: HtmlElement = { kind: 'el', tag: name, attrs: attrsOf(attrRaw ?? ''), children: [] }
    if (CLOSES_P.has(name)) {
      while (top().tag === 'p' && stack.length > 1) stack.pop()
    }
    for (const close of AUTO_CLOSE[name] ?? []) {
      if (top().tag === close && stack.length > 1) stack.pop()
    }
    push(element)

    if (RAW_TEXT_TAGS.has(name)) {
      const tail = source.slice(index)
      const end = new RegExp(`</${name}(?:\\s[^<>]*)?>`, 'i').exec(tail)
      const body = tail.slice(0, end ? end.index : tail.length)
      if (body) element.children.push(body)
      // 闭合标签一起吞掉：它没有进栈，留到下一轮会被误报成多余的 </script>
      index = end ? index + end.index + end[0].length : source.length
      TAG_RE.lastIndex = index
      continue
    }

    if (!VOID_TAGS.has(name) && selfClose !== '/') stack.push(element)
  }

  if (index < source.length) push(source.slice(index))
  return { root, comments: noise, unmatched, unclosed: stack.slice(1).map((el) => el.tag) }
}

/** 兜底序列化：无法用 Markdown 表达的结构原样写回 HTML */
export function serialize(nodes: HtmlNode[]): string {
  let out = ''
  for (const item of nodes) {
    if (!isElement(item)) {
      out += item
      continue
    }
    const attrs = Object.entries(item.attrs)
      .map(([key, value]) => ` ${key}="${escapeHtml(value, 'attribute')}"`)
      .join('')
    if (VOID_TAGS.has(item.tag)) {
      out += `<${item.tag}${attrs}>`
      continue
    }
    out += `<${item.tag}${attrs}>${serialize(item.children)}</${item.tag}>`
  }
  return out
}

/* ================================================================== *
 * 2. HTML → Markdown
 * ================================================================== */

export interface HtmlToMdOptions {
  /** 无序列表符号 */
  bullet: '-' | '*' | '+'
  /** 链接输出形式 */
  linkStyle: 'inline' | 'reference'
  /** `<br>` 是否保留为硬换行（行尾两个空格） */
  keepHardBreaks: boolean
  /** 复杂表格是否降级保留为 HTML 代码块 */
  keepTableHtml: boolean
}

export const HTML_TO_MD_DEFAULTS: HtmlToMdOptions = {
  bullet: '-',
  linkStyle: 'inline',
  keepHardBreaks: true,
  keepTableHtml: true
}

const ESCAPABLE = /[\\`*_<>[\]]/

/**
 * 只在会改变含义的位置加反斜杠：中文、常用标点保持原样。
 * `plain` 表示这段文字处在标题 / 表格单元格这类块级构造内部，行首符号不会被误读成另一种块。
 */
function escapeMd(text: string, plain = false): string {
  return text.split('\n').map((line) => escapeLine(line, plain)).join('\n')
}

/** 行首歧义（标题、列表、引用、分隔线）逃掉第一个字符即可；`~~` 整串逃，否则删除线仍然成立 */
function marksOf(line: string): Set<number> {
  const marks = new Set<number>()
  if (/^#{1,6}(?=[ \t])/.test(line) || /^[>|*+\-_](?=[ \t])/.test(line) || /^=(?=[ \t]*$)/.test(line) || /^-{2,}(?=[ \t]*$)/.test(line)) marks.add(0)
  const delimiter = /^\d{1,9}([.)])(?=[ \t])/.exec(line)
  if (delimiter) marks.add((delimiter.index ?? 0) + delimiter[0].length - 1)
  for (const run of line.matchAll(/~~+/g)) for (let k = 0; k < run[0].length; k += 1) marks.add((run.index ?? 0) + k)
  return marks
}

function escapeLine(input: string, plain: boolean): string {
  const marks = plain ? new Set<number>() : marksOf(input)
  let out = ''
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] as string
    out += ESCAPABLE.test(ch) || marks.has(i) ? `\\${ch}` : ch
  }
  return out
}

/** 行内 code span 用 1 个反引号起步，围栏代码块用 3 个起步；内容里有反引号串时加长 */
function fenceFor(text: string, min = 1): string {
  const longest = (text.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0)
  return '`'.repeat(Math.max(min, longest + 1))
}

function indentLines(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((line) => (line.trim() ? `${prefix}${line}` : line))
    .join('\n')
}

/** 无 Markdown 等价物：丢标签留文字 */
const INLINE_DISCARD = new Set([
  'span', 'font', 'u', 'big', 'small', 'label', 'abbr', 'acronym', 'time', 'data',
  'bdi', 'bdo', 'nobr', 'wbr', 'center', 'mark', 'output', 'slot', 'noindex'
])

/** 连同内容一起丢弃（Markdown 表达不了，且通常不是正文） */
const DROP_SUBTREE = new Set([
  'script', 'style', 'noscript', 'template', 'iframe', 'object', 'embed', 'form', 'button',
  'select', 'textarea', 'svg', 'canvas', 'video', 'audio', 'source', 'track', 'map', 'area', 'input', 'option'
])

const EMPHASIS: Record<string, [string, string]> = {
  strong: ['**', '**'],
  b: ['**', '**'],
  em: ['*', '*'],
  i: ['*', '*'],
  cite: ['*', '*'],
  var: ['*', '*'],
  dfn: ['*', '*'],
  del: ['~~', '~~'],
  s: ['~~', '~~'],
  strike: ['~~', '~~'],
  kbd: ['`', '`'],
  q: ['“', '”']
}

function textOf(nodes: HtmlNode[]): string {
  let out = ''
  for (const node of nodes) out += isElement(node) ? textOf(node.children) : node
  return out
}

function languageOf(el: HtmlElement): string {
  const classes = (el.attrs.class ?? '').split(/\s+/)
  const fromClass = /(?:language|lang)-([\w+#-]+)/.exec(classes.join(' '))
  if (fromClass) return fromClass[1] as string
  const meta = el.children.find(isElement)
  if (meta?.tag === 'meta') {
    const hit = /^code-type:lang-(\w+)/.exec(meta.attrs['data-lang'] ?? '')
    if (hit) return hit[1] as string
  }
  return ''
}

interface RenderState {
  options: HtmlToMdOptions
  refs: Map<string, string>
  dropped: Set<string>
  lost: Set<string>
  complexTables: number
}

function inlineOf(nodes: HtmlNode[], state: RenderState, plain = false): string {
  let out = ''
  for (const node of nodes) {
    if (!isElement(node)) {
      const collapsed = node.replace(/[ \t\r\n]+/g, ' ')
      if (!collapsed.trim()) {
        if (collapsed && out && !/[ ]$/.test(out)) out += ' '
        continue
      }
      // 前一个输出以换行结尾（`<br>` 之后）时不能再补空格，否则列表续行会多缩进一格
      const lead = /^[ \t\r\n]/.test(collapsed) && out && !/[ \n]$/.test(out) ? ' ' : ''
      out += lead + escapeMd(decodeHtml(collapsed.trim()).text, plain) + (/[ \t\r\n]$/.test(collapsed) ? ' ' : '')
      continue
    }

    const { tag, attrs, children } = node

    if (tag === 'br') {
      out += state.options.keepHardBreaks ? '  \n' : ' '
      continue
    }
    if (tag === 'img') {
      const title = attrs.title ? ` "${attrs.title.replace(/"/g, "'")}"` : ''
      out += `![${attrs.alt ?? ''}](${attrs.src ?? ''}${title})`
      continue
    }
    if (tag === 'a') {
      const label = inlineOf(children, state).replace(/\s*\n\s*/g, ' ').trim()
      const href = attrs.href ?? ''
      if (!href) {
        state.lost.add('a（没有 href）')
        out += label
        continue
      }
      const title = attrs.title ? ` "${attrs.title.replace(/"/g, "'")}"` : ''
      if (state.options.linkStyle === 'reference') {
        const base = label.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').toLowerCase() || `link${state.refs.size + 1}`
        const key = state.refs.has(base) ? `${base}-${state.refs.size + 1}` : base
        state.refs.set(key, `${href}${title}`)
        out += `[${label || href}][${key}]`
      } else {
        out += `[${label || href}](${href}${title})`
      }
      continue
    }
    if (DROP_SUBTREE.has(tag)) {
      state.lost.add(tag)
      continue
    }
    if (tag === 'sub' || tag === 'sup') {
      state.lost.add(`${tag}（Markdown 无上下标）`)
      out += inlineOf(children, state)
      continue
    }
    if (tag === 'code') {
      const body = textOf(children).replace(/\s+/g, ' ').trim()
      if (!body) continue
      const fence = fenceFor(body)
      const padded = /^`|\s$|^ |`$/.test(body) ? ` ${body} ` : body
      out += `${fence}${padded}${fence}`
      continue
    }
    const wrap = EMPHASIS[tag]
    if (wrap) {
      const inner = inlineOf(children, state).trim()
      // 里面是块级内容（如未闭合的 <b> 罩住了整个 blockquote）时，Markdown 表达不了强调，
      // 只留内容：否则会吐出一对包着空行的 `****`
      if (!inner || inner.includes('\n\n')) continue
      const [open, close] = wrap
      out += open === '`' ? `${fenceFor(inner)}${inner}${fenceFor(inner)}` : `${open}${inner}${close}`
      continue
    }
    if (INLINE_DISCARD.has(tag)) {
      state.dropped.add(tag)
      out += inlineOf(children, state)
      continue
    }
    if (BLOCK_TAGS.has(tag)) {
      // 把元素本身交给 blocksOf（不是 children）：内联里夹到的表格 / 定义列表才不会被拆散
      out += `\n\n${blocksOf([node], state, '')}\n\n`
      continue
    }
    state.dropped.add(tag)
    out += inlineOf(children, state)
  }
  return out
}

function codeBlockFrom(el: HtmlElement): string {
  const code = el.children.find((child) => isElement(child) && child.tag === 'code')
  const raw = textOf(code ? [code] : el.children).replace(/^\r?\n/, '')
  const decoded = decodeHtml(raw).text
  const lines = decoded.split('\n')
  while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop()
  const fence = fenceFor(decoded, 3)
  return [`${fence}${code && isElement(code) ? languageOf(code) : ''}`, ...lines, fence].join('\n')
}

function renderList(el: HtmlElement, state: RenderState, indent: string): string {
  const ordered = el.tag === 'ol'
  const parsed = Number.parseInt(el.attrs.start ?? '1', 10)
  const start = Number.isFinite(parsed) ? parsed : 1
  const items = el.children.filter((child): child is HtmlElement => isElement(child) && child.tag === 'li')
  if (!items.length) return `${indent}${ordered ? `${start}.` : state.options.bullet} （空列表）`

  return items
    .map((item, position) => {
      const prefix = ordered ? `${start + position}. ` : `${state.options.bullet} `
      let children = item.children
      let task = ''
      const head = children[0]
      if (isElement(head) && head.tag === 'input' && (head.attrs.type ?? '').toLowerCase() === 'checkbox') {
        task = head.attrs.checked !== undefined ? '[x] ' : '[ ] '
        children = children.slice(1)
      }
      // 续行只补空格，绝不重复 `1. `：否则嵌套列表会被父级编号吃掉
      const cont = `${indent}${' '.repeat(prefix.length + task.length)}`
      let body = blocksOf(children, state, cont)
      if (!body.trim()) body = '（空项）'
      const lines = body.split('\n')
      const first = (lines.shift() ?? '').replace(/^\s+/, '')
      const rest = lines.map((line) => (!line.trim() || line.startsWith(cont) ? line : `${cont}${line}`)).join('\n')
      return `${indent}${prefix}${task}${first}${rest ? `\n${rest}` : ''}`
    })
    .join('\n')
}

function cellText(cell: HtmlElement, state: RenderState): string {
  const text = inlineOf(cell.children, state).replace(/\s*\n\s*/g, ' ').trim()
  return text.replace(/(?<!\\)\|/g, '\\|') || ' '
}

function alignOf(cell: HtmlElement): 'left' | 'center' | 'right' | undefined {
  const align = (cell.attrs.align ?? '').toLowerCase()
  if (align === 'center' || align === 'right' || align === 'left') return align
  return undefined
}

/** 只有「无合并单元格、单元格里不再嵌块级内容」的表才能干净地转成管道表 */
function tableToMd(el: HtmlElement, state: RenderState): string | undefined {
  const rows: HtmlElement[][] = []
  const walk = (node: HtmlNode) => {
    if (!isElement(node)) return
    if (node.tag === 'tr') {
      const cells = node.children.filter((child): child is HtmlElement => isElement(child) && (child.tag === 'td' || child.tag === 'th'))
      if (cells.length) rows.push(cells)
      return
    }
    node.children.forEach(walk)
  }
  walk(el)
  if (!rows.length) return undefined

  const width = Math.max(...rows.map((row) => row.length))
  const flat = rows.flat()
  const complex =
    rows.some((row) => row.length !== width) ||
    flat.some((cell) => cell.attrs.colspan || cell.attrs.rowspan) ||
    flat.some((cell) => cell.children.some((child) => isElement(child) && (BLOCK_TAGS.has(child.tag) || child.tag === 'img')))
  if (complex) {
    state.complexTables += 1
    return undefined
  }

  const head = (rows[0] as HtmlElement[]).map((cell) => cellText(cell, state))
  const marks = (rows[0] as HtmlElement[]).map((cell) => {
    switch (alignOf(cell)) {
      case 'center':
        return ':---:'
      case 'right':
        return '---:'
      case 'left':
        return ':---'
      default:
        return '---'
    }
  })

  const lines = [`| ${head.join(' | ')} |`, `| ${marks.join(' | ')} |`]
  for (const row of rows.slice(1)) lines.push(`| ${row.map((cell) => cellText(cell, state)).join(' | ')} |`)
  return lines.join('\n')
}

function dlToMd(el: HtmlElement, state: RenderState): string {
  const out: string[] = []
  let term: string | undefined
  for (const child of el.children) {
    if (!isElement(child)) continue
    const oneLine = (nodes: HtmlNode[]) => inlineOf(nodes, state).replace(/\s*\n\s*/g, ' ').trim()
    if (child.tag === 'dt') term = oneLine(child.children)
    else if (child.tag === 'dd') {
      out.push(`${term ?? '（无术语）'}\n: ${oneLine(child.children)}`)
      term = undefined
    }
  }
  return out.join('\n\n') || '（空定义列表）'
}

function blocksOf(nodes: HtmlNode[], state: RenderState, indent: string): string {
  const out: string[] = []
  let paragraph: HtmlNode[] = []

  const flush = () => {
    if (!paragraph.length) return
    const text = inlineOf(paragraph, state).trim()
    if (text) out.push(text)
    paragraph = []
  }

  for (const node of nodes) {
    if (!isElement(node)) {
      paragraph.push(node)
      continue
    }
    const { tag } = node
    if (DROP_SUBTREE.has(tag)) {
      state.lost.add(tag)
      continue
    }
    if (!BLOCK_TAGS.has(tag) || tag === 'dd' || tag === 'dt' || tag === 'td' || tag === 'th' || tag === 'tr' || tag === 'thead' || tag === 'tbody' || tag === 'tfoot') {
      paragraph.push(node)
      continue
    }
    if (tag === 'li') {
      flush()
      out.push(renderList({ kind: 'el', tag: 'ul', attrs: {}, children: [node] }, state, indent))
      continue
    }

    flush()
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const text = inlineOf(node.children, state, true).replace(/\s*\n\s*/g, ' ').trim()
        out.push(`${'#'.repeat(Number(tag[1]))} ${text || '（空标题）'}`)
        break
      }
      case 'hr':
        out.push('---')
        break
      case 'ul':
      case 'ol':
        out.push(renderList(node, state, indent))
        break
      case 'blockquote': {
        const inner = blocksOf(node.children, state, '')
        out.push(inner ? indentLines(inner, '> ') : '> （空引用）')
        break
      }
      case 'pre':
        out.push(codeBlockFrom(node))
        break
      case 'table': {
        const md = tableToMd(node, state)
        if (md) out.push(md)
        else if (state.options.keepTableHtml) {
          const html = serialize([node])
          const fence = fenceFor(html, 3)
          out.push(`${fence}html\n${html}\n${fence}`)
        } else state.lost.add('table（已选择不保留复杂表格）')
        break
      }
      case 'dl':
        out.push(dlToMd(node, state))
        break
      default:
        out.push(blocksOf(node.children, state, indent))
    }
  }
  flush()
  return out.filter((block) => block.trim()).join('\n\n')
}

/**
 * 收尾整理：行尾空白只允许「0 个」或「2 个（硬换行）」两种形态，并把 3 个以上连续换行压成
 * 空行分隔。代码块内部一个字都不动——缩进和行尾空格在那里是有意义的。
 */
function tidyMd(text: string): string {
  const out: string[] = []
  let fence = ''
  let blank = 0
  for (const line of text.split('\n')) {
    const mark = /^( {0,3})(`{3,}|~{3,})/.exec(line)
    if (mark && (!fence || mark[2]!.length >= fence.length)) {
      if (!fence) fence = mark[2] as string
      else if (line.trim().replace(/^`+|~+$/g, '') === '') fence = ''
      blank = 0
      out.push(line)
      continue
    }
    if (fence) {
      blank = 0
      out.push(line)
      continue
    }
    if (!line.trim()) {
      blank += 1
      if (blank > 1 && out.length && out[out.length - 1] === '') continue
      out.push('')
      continue
    }
    blank = 0
    out.push(line.replace(/\s+$/, (run) => (run.length >= 2 ? '  ' : '')))
  }
  return out.join('\n')
}

export function htmlToMarkdown(html: string, options: Partial<HtmlToMdOptions> = {}): ConvertResult {
  const opts: HtmlToMdOptions = { ...HTML_TO_MD_DEFAULTS, ...options }
  const notes: string[] = []
  const warnings: string[] = []
  if (!html.trim()) return { value: '', notes: ['输入为空'], warnings: [] }

  const doc = parseHtml(html)
  const state: RenderState = { options: opts, refs: new Map(), dropped: new Set(), lost: new Set(), complexTables: 0 }

  let value = tidyMd(blocksOf(doc.root.children, state, ''))
  if (state.refs.size) {
    const defs = [...state.refs.entries()].map(([key, href]) => `[${key}]: ${href}`)
    value = `${value.trimEnd()}\n\n${defs.join('\n')}\n`
  } else {
    value = `${value.trimEnd()}\n`
  }

  if (doc.comments) notes.push(`丢弃 ${doc.comments} 条 HTML 注释 / 文档声明（Markdown 没有对应语法）`)
  if (doc.unclosed.length) notes.push(`自动闭合未关闭的标签：${[...new Set(doc.unclosed)].join('、')}`)
  if (doc.unmatched.length) warnings.push(`多余的闭合标签：${[...new Set(doc.unmatched)].map((tag) => `</${tag}>`).join('、')}`)
  if (state.dropped.size) notes.push(`无 Markdown 等价物、只保留文字的标签：${[...state.dropped].join('、')}`)
  if (state.complexTables) notes.push(`${state.complexTables} 个表格含合并单元格或嵌套块级内容，已按 HTML 代码块保留`)
  if (opts.linkStyle === 'reference') notes.push(`链接已抽成 ${state.refs.size} 条引用定义，写在文末`)
  if (state.lost.size) warnings.push(`内容被丢弃：${[...state.lost].join('、')}`)
  if (!value.trim()) notes.push('结果为空：输入里没有可提取的正文')

  return { value, notes, warnings }
}

/* ================================================================== *
 * 3. Markdown → HTML
 * ================================================================== */

export interface MdToHtmlOptions {
  /** 段内软换行输出 `<br>` */
  breaks: boolean
  /** GFM 管道表格 */
  gfmTables: boolean
  /** `- [ ]` 输出 checkbox */
  taskLists: boolean
  /** `~~删除线~~` */
  strikethrough: boolean
  /** 顶层块之间插入空行，便于 diff */
  pretty: boolean
  /** 标题补 GitHub 风格 `id` */
  headingIds: boolean
}

export const MD_TO_HTML_DEFAULTS: MdToHtmlOptions = {
  breaks: false,
  gfmTables: true,
  taskLists: true,
  strikethrough: true,
  pretty: true,
  headingIds: false
}

const BULLET_RE = /^( {0,7})([-*+])([ \t]+|$)(.*)$/
const ORDERED_RE = /^( {0,7})(\d{1,9})([.)])([ \t]+|$)(.*)$/
const FENCE_RE = /^( {0,3})(`{3,}|~{3,})[ \t]*([^\s`]*)/
const HR_RE = /^(?: {0,3}\*){3,}$|^(?: {0,3}-){3,}$|^(?: {0,3}_){3,}$/
const ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+([^\n]*?))?[ \t]*$/
const SETEXT_RE = /^ {0,3}(=+|-+)[ \t]*$/
const QUOTE_RE = /^ {0,3}> ?(.*)$/
const TABLE_SEP_RE = /^ {0,3}\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?[ \t]*$/
/** 标签名后必须紧跟空白 / `>` / `/`，否则 `<https://a.test>` 这类自动链接会被误当成原样 HTML */
const HTML_BLOCK_RE = /^ {0,3}<(?:\/?[a-zA-Z][a-zA-Z0-9-]*(?=[ \t/>])|[?!]|!--)/
const DEF_RE = /^ {0,3}\[([^\]]+)\]:[ \t]*(\S+)(?:[ \t]+["'(](.*)["')])?[ \t]*$/
const ENTITY_RE = /^&(?:#[xX][0-9a-fA-F]{1,8}|#[0-9]{1,8}|[a-zA-Z][a-zA-Z0-9]{1,31});/
const AUTOLINK_RE = /^<((?:https?|ftp|mailto):[^\s<>]+)>/i
const MAIL_RE = /^<([^\s<>@]+@[^\s<>@]+\.[a-zA-Z]{2,})>/
const UNSAFE_URL_RE = /^\s*(?:javascript|vbscript|data:text\/html)/i

type Align = 'left' | 'center' | 'right' | undefined

interface List_item {
  task: 'x' | ' ' | undefined
  blocks: Block[]
}

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string; lines: string[] }
  | { kind: 'html'; lines: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'list'; ordered: boolean; start: number; tight: boolean; items: List_item[] }
  | { kind: 'table'; head: string[]; aligns: Align[]; rows: string[][] }
  | { kind: 'hr' }

interface State {
  opts: MdToHtmlOptions
  refs: Map<string, string>
  usedRefs: Set<string>
  missingRefs: Set<string>
  notes: Set<string>
  warnings: Set<string>
  rawHtml: number
  entities: number
  hardBreaks: number
  slugs: Map<string, number>
}

export function slugify(text: string): string {
  let out = ''
  let pending = false
  for (const ch of text.toLowerCase()) {
    if (/\s/.test(ch)) {
      if (out) pending = true
      continue
    }
    if (/[\p{L}\p{N}_-]/u.test(ch)) {
      if (pending) {
        out += '-'
        pending = false
      }
      out += ch
    }
  }
  return out.replace(/-{2,}/g, '-').replace(/^-|-$/g, '') || 'section'
}

function uniqueSlug(state: State, base: string): string {
  const seen = state.slugs.get(base) ?? 0
  state.slugs.set(base, seen + 1)
  return seen ? `${base}-${seen}` : base
}

/** 剥掉 `[label]: url "title"` 引用定义行 */
function extractDefs(source: string): { text: string; refs: Map<string, string>; count: number } {
  const refs = new Map<string, string>()
  let count = 0
  const kept = source.split('\n').filter((line) => {
    const match = DEF_RE.exec(line)
    if (!match) return true
    refs.set((match[1] as string).toLowerCase().trim(), `${match[2]}${match[3] ? ` "${match[3]}"` : ''}`)
    count += 1
    return false
  })
  return { text: kept.join('\n'), refs, count }
}

function leadingSpaces(line: string): number {
  return /^ */.exec(line)?.[0].length ?? 0
}

function isBlockStart(line: string): boolean {
  return (
    !line.trim() ||
    FENCE_RE.test(line) ||
    ATX_RE.test(line) ||
    HR_RE.test(line) ||
    QUOTE_RE.test(line) ||
    BULLET_RE.test(line) ||
    ORDERED_RE.test(line) ||
    HTML_BLOCK_RE.test(line)
  )
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i] as string
    if (ch === '\\' && trimmed[i + 1] === '|') {
      current += '|'
      i += 1
      continue
    }
    if (ch === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

function padTo(cells: string[], width: number): string[] {
  const copy = [...cells]
  while (copy.length < width) copy.push('')
  return copy.slice(0, width)
}

function tableAt(lines: string[], from: number): { block: Block; next: number } | undefined {
  const header = lines[from] ?? ''
  const separator = lines[from + 1] ?? ''
  if (!header.includes('|') || !TABLE_SEP_RE.test(separator)) return undefined
  const head = splitRow(header)
  const aligns = splitRow(separator).map((cell): Align => {
    if (!cell) return undefined
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    if (left) return 'left'
    return undefined
  })
  if (head.length !== aligns.length) return undefined
  const rows: string[][] = []
  let index = from + 2
  while (index < lines.length && lines[index]?.trim() && lines[index]?.includes('|')) {
    if (TABLE_SEP_RE.test(lines[index] as string)) break
    rows.push(padTo(splitRow(lines[index] as string), head.length))
    index += 1
  }
  return { block: { kind: 'table', head, aligns, rows }, next: index }
}

function parseBlocks(lines: string[], state: State): Block[] {
  const blocks: Block[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] as string
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = FENCE_RE.exec(line)
    if (fence) {
      const marker = fence[2] as string
      const body: string[] = []
      let i = index + 1
      let closed = false
      const closeRe = new RegExp(`^ {0,3}\\${marker[0]}{${marker.length},}[ \\t]*$`)
      for (; i < lines.length; i += 1) {
        if (closeRe.test(lines[i] as string)) {
          closed = true
          i += 1
          break
        }
        body.push(lines[i] as string)
      }
      if (!closed) state.warnings.add(`\`${marker}\` 代码围栏没有闭合，已按「直到文末」处理`)
      if (body.some((item) => item.includes('\t'))) state.notes.add('代码块里的制表符原样保留，未被展开为空格')
      blocks.push({ kind: 'code', lang: fence[3] ?? '', lines: body })
      index = i
      continue
    }

    if (HR_RE.test(line)) {
      blocks.push({ kind: 'hr' })
      index += 1
      continue
    }

    const atx = ATX_RE.exec(line)
    if (atx) {
      let text = (atx[2] ?? '').trim()
      const closing = /\s+#{1,6}$/.exec(text)
      if (closing) text = text.slice(0, closing.index).trim()
      if (/^\{#[\w-]+\}$/.test(text)) {
        text = text.slice(2, -1)
        state.notes.add('标题里的 `{#id}` 自定义 ID 语法不受支持，已当普通文字')
      }
      blocks.push({ kind: 'heading', level: (atx[1] as string).length, text })
      index += 1
      continue
    }

    if (QUOTE_RE.test(line)) {
      const inner: string[] = []
      let i = index
      while (i < lines.length) {
        const current = lines[i] as string
        const quote = QUOTE_RE.exec(current)
        if (quote) {
          inner.push(quote[1] as string)
          i += 1
          continue
        }
        if (inner.length && current.trim() && !isBlockStart(current)) {
          inner.push(current.trim())
          i += 1
          continue
        }
        break
      }
      blocks.push({ kind: 'quote', lines: inner })
      index = i
      continue
    }

    if (BULLET_RE.test(line) || ORDERED_RE.test(line)) {
      index = parseList(lines, index, state, blocks)
      continue
    }

    if (state.opts.gfmTables) {
      const table = tableAt(lines, index)
      if (table) {
        blocks.push(table.block)
        index = table.next
        continue
      }
    }

    if (HTML_BLOCK_RE.test(line)) {
      const body: string[] = []
      let i = index
      while (i < lines.length && lines[i]?.trim()) {
        body.push(lines[i] as string)
        i += 1
      }
      state.rawHtml += 1
      blocks.push({ kind: 'html', lines: body })
      index = i
      continue
    }

    const para: string[] = []
    let i = index
    let setext = false
    while (i < lines.length) {
      const current = lines[i] as string
      if (!current.trim()) break
      const underline = SETEXT_RE.exec(current)
      if (underline && para.length) {
        blocks.push({ kind: 'heading', level: underline[1]?.startsWith('=') ? 1 : 2, text: para.join(' ').trim() })
        para.length = 0
        setext = true
        i += 1
        break
      }
      if (para.length && isBlockStart(current)) break
      para.push(current.replace(/^ {1,3}/, ''))
      i += 1
    }
    if (para.length) blocks.push({ kind: 'paragraph', lines: para })
    index = setext ? i : Math.max(i, index + 1)
  }

  return blocks
}

/** 解析一个列表（含嵌套），push 结果块并返回下一个未消费的行号 */
function parseList(lines: string[], from: number, state: State, out: Block[]): number {
  const firstLine = lines[from] as string
  const ordered = ORDERED_RE.test(firstLine)
  const markerRe = ordered ? ORDERED_RE : BULLET_RE
  const head = markerRe.exec(firstLine) as RegExpExecArray
  const baseIndent = (head[1] as string).length
  const start = ordered ? Number.parseInt(head[2] as string, 10) : 1

  const items: List_item[] = []
  let tight = true
  let index = from

  while (index < lines.length) {
    const match = markerRe.exec(lines[index] as string)
    if (!match || (match[1] as string).length !== baseIndent) break

    // 两个正则的最后一组都是正文；缩进 + 标记 + 标记后空白正好等于「整行长度 − 正文长度」
    const rest = ((match[match.length - 1] ?? '') as string).trimStart()
    const contentIndent = (match[1] as string).length + (match[0] as string).length - ((match[match.length - 1] ?? '') as string).length
    let task: 'x' | ' ' | undefined
    const collected: string[] = []
    const check = /^\[([ xX])\][ \t]+(.*)$/.exec(rest)
    if (check && state.opts.taskLists) {
      task = check[1] === ' ' ? ' ' : 'x'
      collected.push(check[2] as string)
    } else {
      collected.push(rest)
    }

    let i = index + 1
    while (i < lines.length) {
      const next = lines[i] as string
      if (!next.trim()) {
        let probe = i
        while (probe < lines.length && !lines[probe]?.trim()) probe += 1
        if (probe >= lines.length) {
          i = probe
          break
        }
        const following = lines[probe] as string
        const sibling = markerRe.exec(following)
        const isSibling = !!sibling && (sibling[1] as string).length === baseIndent
        if (isSibling) {
          tight = false
          i = probe
          break
        }
        if (leadingSpaces(following) >= contentIndent) {
          // 空行 + 更深缩进 = 同一个列表项里的第二个块，补一个空行让 parseBlocks 分块
          tight = false
          collected.push('')
          i = probe
          continue
        }
        i = probe
        break
      }
      if (leadingSpaces(next) >= contentIndent) {
        collected.push(next.slice(contentIndent))
        i += 1
        continue
      }
      const sibling = markerRe.exec(next)
      if (sibling && (sibling[1] as string).length <= baseIndent) break
      if (isBlockStart(next) || !collected[collected.length - 1]?.trim()) break
      collected.push(next.trim())
      i += 1
    }

    items.push({ task, blocks: parseBlocks(collected, state) })
    index = i

    let probe = index
    while (probe < lines.length && !lines[probe]?.trim()) probe += 1
    if (probe >= lines.length) break
    const sibling = markerRe.exec(lines[probe] as string)
    if (sibling && (sibling[1] as string).length === baseIndent) {
      if (probe > index) tight = false
      index = probe
      continue
    }
    break
  }

  out.push({ kind: 'list', ordered, start, tight, items })
  return Math.max(index, from + 1)
}

/* ------------------------------ 行内 ------------------------------ */

function runLength(text: string, from: number, ch: string): number {
  let n = 0
  while (text[from + n] === ch) n += 1
  return n
}

function findCodeSpanEnd(text: string, from: number): number | undefined {
  const fence = runLength(text, from, '`')
  if (!fence) return undefined
  for (let i = from + fence; i < text.length; i += 1) {
    if (text[i] === '`' && runLength(text, i, '`') === fence) return i + fence
  }
  return undefined
}

function renderCodeSpan(raw: string): string {
  const fence = runLength(raw, 0, '`')
  const end = (findCodeSpanEnd(raw, 0) ?? raw.length) - fence
  let body = raw.slice(fence, Math.max(fence, end)).replace(/\n/g, ' ')
  if (body.length > 2 && body.startsWith(' ') && body.endsWith(' ') && body.trim()) body = body.slice(1, -1)
  return `<code>${escapeHtml(body)}</code>`
}

function linkLabelEnd(text: string, from: number): number | undefined {
  let depth = 0
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i] as string
    if (ch === '\\') {
      i += 1
      continue
    }
    if (ch === '[') depth += 1
    else if (ch === ']') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return undefined
}

/** `(url "title")`：支持嵌套括号、尖括号包 URL；URL 里有裸空格时截断并告警 */
function readDest(text: string, from: number, state: State): { dest: string; title: string; next: number } | undefined {
  if (text[from] !== '(') return undefined
  let i = from + 1
  while (i < text.length && /[ \t]/.test(text[i] as string)) i += 1
  let dest = ''
  if (text[i] === '<') {
    const close = text.indexOf('>', i + 1)
    if (close < 0) return undefined
    dest = text.slice(i + 1, close)
    i = close + 1
  } else {
    let depth = 0
    while (i < text.length) {
      const ch = text[i] as string
      if (ch === '\\') {
        dest += text[i + 1] ?? ''
        i += 2
        continue
      }
      if (ch === '(') depth += 1
      else if (ch === ')') {
        if (depth === 0) break
        depth -= 1
      } else if (/\s/.test(ch) && depth === 0) break
      dest += ch
      i += 1
    }
  }
  while (i < text.length && /[ \t]/.test(text[i] as string)) i += 1
  let title = ''
  if (text[i] === '"' || text[i] === "'" || text[i] === '(') {
    const quote = text[i] === '(' ? ')' : (text[i] as string)
    const close = text.indexOf(quote, i + 1)
    if (close < 0) return undefined
    title = text.slice(i + 1, close)
    i = close + 1
    while (i < text.length && /[ \t]/.test(text[i] as string)) i += 1
  }
  if (text[i] !== ')') {
    state.warnings.add('有 `](…)` 链接语法括号没闭合，已按普通文字输出')
    return undefined
  }
  return { dest, title, next: i + 1 }
}

function hrefOf(dest: string, state: State): string {
  if (UNSAFE_URL_RE.test(dest)) {
    state.warnings.add('链接用了 javascript: / data:text/html 之类协议，已把 URL 清空（防点击执行脚本）')
    return ''
  }
  return escapeHtml(dest, 'attribute')
}

function tryEmphasis(text: string, i: number, state: State): { html: string; next: number } | undefined {
  const ch = text[i] as string
  const tilde = ch === '~'
  if (ch !== '*' && ch !== '_' && !tilde) return undefined
  if (tilde && !state.opts.strikethrough) return undefined
  const run = runLength(text, i, ch)
  if (tilde && run !== 2) return undefined
  const count = Math.min(run, tilde ? 2 : 3)
  if (ch === '_' && /[A-Za-z0-9_]/.test(text[i - 1] ?? '')) return undefined
  if (/[ \t]/.test(text[i + run] ?? '\n')) return undefined

  let j = i + run
  while (j < text.length) {
    if (text[j] === '\\') {
      j += 2
      continue
    }
    if (text[j] === '`') {
      const end = findCodeSpanEnd(text, j)
      j = end ?? j + 1
      continue
    }
    if (text[j] === '[') {
      const end = linkLabelEnd(text, j)
      j = end ? end + 1 : j + 1
      continue
    }
    if (text[j] === ch) {
      const n = runLength(text, j, ch)
      const inner = text.slice(i + count, j)
      if (n >= count && inner.trim()) {
        if (ch === '_' && /[A-Za-z0-9_]/.test(text[j + n] ?? '')) {
          j += n
          continue
        }
        const body = inlineMd(inner, state)
        const html = tilde
          ? `<del>${body}</del>`
          : count >= 3
            ? `<strong><em>${body}</em></strong>`
            : count === 2
              ? `<strong>${body}</strong>`
              : `<em>${body}</em>`
        return { html, next: j + count }
      }
      j += n
      continue
    }
    j += 1
  }
  return undefined
}

function inlineMd(text: string, state: State): string {
  const { opts } = state
  let out = ''
  let i = 0

  while (i < text.length) {
    const ch = text[i] as string

    if (ch === '\\' && i + 1 < text.length && /[\\`*_{}[\]()#+\-.!>~|:"'<]/.test(text[i + 1] as string)) {
      out += escapeHtml(text[i + 1] as string)
      i += 2
      continue
    }
    if (ch === '\n') {
      const hard = / {2,}$/.test(out) || (/[^\\]\\$/.test(out) && !/\\\\$/.test(out))
      if (hard) {
        out = out.replace(/( +|\\)$/, '')
        state.hardBreaks += 1
      }
      out += hard || opts.breaks ? '<br>\n' : '\n'
      i += 1
      continue
    }
    if (ch === '`') {
      const end = findCodeSpanEnd(text, i)
      if (end) {
        out += renderCodeSpan(text.slice(i, end))
        i = end
        continue
      }
      out += escapeHtml('`')
      i += runLength(text, i, '`')
      continue
    }
    if (ch === '&') {
      const entity = ENTITY_RE.exec(text.slice(i))
      if (entity) {
        state.entities += 1
        out += entity[0]
        i += entity[0].length
        continue
      }
      out += '&amp;'
      i += 1
      continue
    }
    if (ch === '<') {
      const link = AUTOLINK_RE.exec(text.slice(i))
      if (link) {
        out += `<a href="${hrefOf(link[1] as string, state)}">${escapeHtml((link[1] as string).replace(/^mailto:/, ''))}</a>`
        i += link[0].length
        continue
      }
      const mail = MAIL_RE.exec(text.slice(i))
      if (mail) {
        out += `<a href="${hrefOf(`mailto:${mail[1]}`, state)}">${escapeHtml(mail[1] as string)}</a>`
        i += mail[0].length
        continue
      }
      const tag = /^<\/?[a-zA-Z][a-zA-Z0-9:-]*(?:"[^"]*"|'[^']*'|[^>])*>/.exec(text.slice(i))
      if (tag) {
        state.rawHtml += 1
        out += tag[0]
        i += tag[0].length
        continue
      }
      out += '&lt;'
      i += 1
      continue
    }
    if (ch === '!' && text[i + 1] === '[') {
      const labelEnd = linkLabelEnd(text, i + 1)
      const dest = labelEnd ? readDest(text, labelEnd + 1, state) : undefined
      if (labelEnd && dest) {
        const alt = text.slice(i + 2, labelEnd)
        out += `<img src="${hrefOf(dest.dest, state)}" alt="${escapeHtml(alt, 'attribute')}"${dest.title ? ` title="${escapeHtml(dest.title, 'attribute')}"` : ''}>`
        i = dest.next
        continue
      }
      out += escapeHtml('!')
      i += 1
      continue
    }
    if (ch === '[') {
      const footnote = /^\[\^[^\]]*\]/.exec(text.slice(i))
      if (footnote) {
        state.notes.add('脚注 `[^标记]` 按字面输出（本工具不做脚注）')
        out += escapeHtml(footnote[0])
        i += footnote[0].length
        continue
      }
      const labelEnd = linkLabelEnd(text, i)
      if (!labelEnd) {
        state.warnings.add('有没闭合的 `[`，已按普通文字输出')
        out += escapeHtml('[')
        i += 1
        continue
      }
      const label = text.slice(i + 1, labelEnd)
      const inline = readDest(text, labelEnd + 1, state)
      if (inline) {
        out += `<a href="${hrefOf(inline.dest, state)}"${inline.title ? ` title="${escapeHtml(inline.title, 'attribute')}"` : ''}>${inlineMd(label, state)}</a>`
        i = inline.next
        continue
      }
      const ref = /^\[([^\]]*)\]/.exec(text.slice(labelEnd + 1))
      if (ref) {
        const key = ((ref[1] || label).toLowerCase()).trim()
        const target = state.refs.get(key)
        if (target) {
          const split = target.indexOf(' "')
          const href = split > 0 ? target.slice(0, split) : target
          const title = split > 0 ? target.slice(split + 2, -1) : ''
          state.usedRefs.add(key)
          out += `<a href="${hrefOf(href, state)}"${title ? ` title="${escapeHtml(title, 'attribute')}"` : ''}>${inlineMd(label, state)}</a>`
          i = labelEnd + 1 + ref[0].length
          continue
        }
        state.missingRefs.add(key || label)
        out += escapeHtml('[') + inlineMd(label, state) + escapeHtml(']')
        i = labelEnd + 1 + ref[0].length
        continue
      }
      out += escapeHtml('[') + inlineMd(label, state) + escapeHtml(']')
      i = labelEnd + 1
      continue
    }

    const emphasis = tryEmphasis(text, i, state)
    if (emphasis) {
      out += emphasis.html
      i = emphasis.next
      continue
    }

    out += escapeHtml(ch)
    i += 1
  }

  return out
}

/* ------------------------------ 块级渲染 ------------------------------ */

function stripInline(text: string): string {
  return text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~=]/g, '')
}

function renderBlock(block: Block, state: State, inlineFirst: boolean): string {
  switch (block.kind) {
    case 'paragraph': {
      // 段末尾的行尾空格后面没有第二行，不构成硬换行
      const html = inlineMd(block.lines.join('\n').replace(/[ \t]+$/, ''), state)
      return inlineFirst ? html : `<p>${html}</p>`
    }
    case 'heading': {
      const id = state.opts.headingIds ? ` id="${uniqueSlug(state, slugify(stripInline(block.text)))}"` : ''
      return `<h${block.level}${id}>${inlineMd(block.text, state)}</h${block.level}>`
    }
    case 'code': {
      const body = escapeHtml(block.lines.join('\n'))
      const open = block.lang ? `<pre><code class="language-${escapeHtml(block.lang, 'attribute')}">` : '<pre><code>'
      return `${open}${body.endsWith('\n') ? body : `${body}\n`}</code></pre>`
    }
    case 'html':
      return block.lines.join('\n')
    case 'quote':
      return `<blockquote>\n${renderBlocks(parseBlocks(block.lines, state), state)}\n</blockquote>`
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul'
      const attrs = block.ordered && block.start !== 1 ? ` start="${block.start}"` : ''
      const items = block.items.map((item) => {
        const parts = item.blocks.map((inner, position) => renderBlock(inner, state, block.tight && inner.kind === 'paragraph' && position === 0))
        let content = parts.join(block.tight ? '\n' : '\n\n')
        if (item.task) {
          content = `<input${item.task === 'x' ? ' checked' : ''} disabled type="checkbox"> ${content}`
        }
        return `  <li>${content}</li>`
      })
      return `<${tag}${attrs}>\n${items.join('\n')}\n</${tag}>`
    }
    case 'table': {
      const cell = (text: string, tag: string, index: number) =>
        `      <${tag}${block.aligns[index] ? ` style="text-align: ${block.aligns[index]}"` : ''}>${inlineMd(text, state)}</${tag}>`
      const head = `  <thead>\n    <tr>\n${block.head.map((text, index) => cell(text, 'th', index)).join('\n')}\n    </tr>\n  </thead>`
      const body = block.rows.length
        ? `  <tbody>\n${block.rows.map((row) => `    <tr>\n${row.map((text, index) => cell(text, 'td', index)).join('\n')}\n    </tr>`).join('\n')}\n  </tbody>`
        : ''
      return ['<table>', head, body, '</table>'].filter(Boolean).join('\n')
    }
    case 'hr':
      return '<hr>'
  }
}

function renderBlocks(blocks: Block[], state: State): string {
  const sep = state.opts.pretty ? '\n\n' : '\n'
  return blocks.map((block) => renderBlock(block, state, false)).join(sep)
}

export function mdToHtml(markdown: string, options: Partial<MdToHtmlOptions> = {}): ConvertResult {
  const opts: MdToHtmlOptions = { ...MD_TO_HTML_DEFAULTS, ...options }
  const state: State = {
    opts,
    refs: new Map(),
    usedRefs: new Set(),
    missingRefs: new Set(),
    notes: new Set(),
    warnings: new Set(),
    rawHtml: 0,
    entities: 0,
    hardBreaks: 0,
    slugs: new Map()
  }
  if (!markdown.trim()) return { value: '', notes: ['输入为空'], warnings: [] }

  const normalized = markdown.replace(/\r\n?/g, '\n')
  const defs = extractDefs(normalized)
  state.refs = defs.refs
  if (defs.count) state.notes.add(`剥掉 ${defs.count} 行链接引用定义（\`[标记]: 网址\`），用到时才展开`)

  const value = `${renderBlocks(parseBlocks(defs.text.split('\n'), state), state)}\n`

  if (state.rawHtml) state.notes.add(`原样保留 ${state.rawHtml} 处原生 HTML（Markdown 允许内联标签，这些内容不会被转义）`)
  if (state.entities) state.notes.add(`${state.entities} 个 HTML 实体按字面透传`)
  if (state.hardBreaks) state.notes.add(`${state.hardBreaks} 处行尾两空格 / 反斜杠 → <br>`)
  if (state.missingRefs.size) state.warnings.add(`引用式链接找不到定义：${[...state.missingRefs].join('、')}`)
  if (!opts.gfmTables && /\|[ \t]*:?-{2,}/.test(markdown)) state.warnings.add('检测到管道表格，但「GFM 表格」开关已关闭，会按普通文本输出')
  if (!opts.strikethrough && /~~/.test(markdown)) state.notes.add('「删除线」开关已关闭，`~~` 按字面输出')
  if (state.notes.size === 0 && opts.breaks) state.notes.add('软换行已按 `<br>` 输出')

  return { value, notes: [...state.notes], warnings: [...state.warnings] }
}

/* ================================================================== *
 * 4. 示例
 * ================================================================== */

export const HTML_SAMPLES: { label: string; value: string }[] = [
  {
    label: '嵌套列表 + 代码 + 表格',
    value: `<h2>发布清单</h2>
<p>先跑 <code>pnpm build</code>，再看 <em>产物体积</em>：</p>
<ol>
  <li>构建
    <ul><li><input type="checkbox" checked> 类型检查</li><li><input type="checkbox"> 冒烟测试</li></ul>
  </li>
  <li>部署<br>把 <code>dist/</code> 整个上传</li>
</ol>
<pre><code class="language-bash">rsync -av dist/ server:/var/www/</code></pre>
<table>
  <tr><th style="text-align:left">文件</th><th>大小</th></tr>
  <tr><td>index.js</td><td>216 kB</td></tr>
  <tr><td>index.css</td><td>215 kB</td></tr>
</table>`
  },
  {
    label: '标签不闭合 + 合并单元格',
    value: `<p>这个 <strong>段落<b>少了一个闭合标签
<p>下面是复杂表格，Markdown 表达不了：</p>
<table>
  <tr><td colspan="2">合并两列</td></tr>
  <tr><td>a</td><td>b</td></tr>
</table>
<!-- 这条注释会被丢掉 -->
<blockquote><p>引用里的 <a href="https://example.com" title="示例">链接</a></p></blockquote>`
  },
  {
    label: '定义列表 + 特殊字符',
    value: `<dl>
  <dt>2 * 3</dt><dd>等于 6，注意 * 号会被当成列表</dd>
  <dt># 号</dt><dd>行首会变成标题</dd>
</dl>
<p>数学表达式：<code>a_b</code>、*星号*、[方括号]、&amp; 和 &lt; 符号。</p>
<hr>`
  }
]

export const MD_SAMPLES: { label: string; value: string }[] = [
  {
    label: '标题 / 列表 / 表格 / 代码',
    value: `# 部署说明

段落里可以写 **粗体**、*斜体*、~~删除~~、\`code\`、[链接][ref]。

## 步骤

1. 先构建
   - \`pnpm typecheck\`
   - \`pnpm build\`
2. 再部署
   - [x] 已核对产物
   - [ ] 已清缓存

| 文件 | 大小 | 备注 |
|:-----|-----:|-----:|
| index.js | 216 kB | 首屏 |
| index.css | 215 kB | 含 Tailwind |

\`\`\`bash
rsync -av dist/ server:/var/www/
\`\`\`

> 引用里可以嵌列表：
> - 第一项
> - 第二项

[ref]: https://example.com "示例站点"
---

Setext 一级标题
================
`
  },
  {
    label: '会踩坑的写法',
    value: `没闭合的围栏：

\`\`\`js
const broken = true

- 列表
\t
未闭合的 [方括号 和 特殊字符 & < >

危险链接：[点我](javascript:alert(1))

邮箱 <mailto:hi@example.com> 与 <https://example.com/a_(b)>

硬换行结尾两个空格  
下一行
`
  }
]
