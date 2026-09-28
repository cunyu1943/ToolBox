/**
 * XML 格式化内核：校验 + 美化 + 压缩 + 转 JSON。
 *
 * 取悦人的地方和坑都在「容错」上：
 * - 解析器**不抛异常**，标签错配、未闭合、裸 `&` 都记成带行列号的错误列表，同时尽量恢复出树，
 *   这样格式化坏 XML 仍然是有用的（人往往就是想靠缩进看清哪里没闭合）。
 * - 纯空白文本节点在有子元素的元素里必须丢掉，否则美化一遍会把 `<a>\n  <b/></a>` 变成三层空白；
 *   但「只有文本」的元素要压成一行，否则 `<td>张三</td>` 会被拆成三行，可读性反而更差。
 * - 实体只认 5 个内置的加数字引用；`&nbsp;` 这类需要 DTD 才有效，离线一律按未转义报错。
 */

export interface XmlError {
  line: number
  column: number
  message: string
}

export type XmlNode =
  | { kind: 'text'; value: string }
  | { kind: 'cdata'; value: string }
  | { kind: 'comment'; value: string }
  | { kind: 'pi'; target: string; value: string }
  | { kind: 'doctype'; value: string }
  | { kind: 'element'; name: string; attrs: [string, string][]; children: XmlNode[] }

export interface XmlDoc {
  children: XmlNode[]
}

export interface XmlStats {
  elements: number
  attributes: number
  textNodes: number
  comments: number
  cdata: number
  maxDepth: number
  prefixes: string[]
  names: string[]
}

export interface XmlResult {
  ok: boolean
  value: string
  errors: XmlError[]
  notes: string[]
  stats?: XmlStats
}

const NAME_START = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u1F00-\u1FFF]/
const NAME_CHAR = /[:_A-Za-z0-9\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u1F00-\u1FFF-\u200C]/

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'"
}

export const XML_SAMPLES: { label: string; value: string }[] = [
  {
    label: '带声明与属性',
    value: `<?xml version="1.0" encoding="UTF-8"?>\n<books count="2"><book id="b1"><title lang="zh">三体</title><price>40</price></book><book id="b2"><title>球状闪电</title></book></books>`
  },
  {
    label: 'CDATA + 注释 + 命名空间',
    value: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><!-- 头 --><soap:Body><echo><![CDATA[<hello> & <world>]]></echo></soap:Body></soap:Envelope>`
  },
  {
    label: '表格（文本元素压一行）',
    value: `<table><tr><td>姓名</td><td>分数</td></tr><tr><td>张三</td><td>98</td></tr></table>`
  },
  {
    label: '标签错配',
    value: `<a><b>text</a></b>`
  },
  {
    label: '未闭合 + 裸 &',
    value: `<root><item>x</item>\n<item>a & b</root>`
  }
]

function isNameStart(ch: string | undefined): boolean {
  return Boolean(ch) && NAME_START.test(ch as string)
}

function isNameChar(ch: string | undefined): boolean {
  return Boolean(ch) && NAME_CHAR.test(ch as string)
}

export function decodeEntities(text: string, errors: XmlError[], at: (index: number) => XmlError): string {
  let out = ''
  let index = 0
  while (index < text.length) {
    const ch = text[index]
    if (ch !== '&') {
      out += ch
      index += 1
      continue
    }
    const semi = text.indexOf(';', index)
    const body = semi > index && semi - index <= 12 ? text.slice(index + 1, semi) : ''
    if (body && /^#[0-9]{1,7}$/.test(body)) {
      out += String.fromCodePoint(Number(body.slice(1)))
    } else if (body && /^#[xX][0-9a-fA-F]{1,6}$/.test(body)) {
      out += String.fromCodePoint(Number.parseInt(body.slice(2), 16))
    } else if (body && Object.hasOwn(ENTITIES, body)) {
      out += ENTITIES[body] as string
    } else {
      if (body && /^[a-zA-Z][a-zA-Z0-9]*$/.test(body)) {
        errors.push({ ...at(index), message: `未知实体 &${body}; （离线没有 DTD，只有 5 个内置实体和数字引用可用）` })
      } else {
        errors.push({ ...at(index), message: '未转义的 &（正文里的 & 要写成 &amp;）' })
      }
      out += '&'
    }
    index = semi > index ? semi + 1 : index + 1
  }
  return out
}

export function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(text: string): string {
  return escapeText(text).replace(/"/g, '&quot;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;')
}

/**
 * 解析一段 XML。永不抛异常：结构问题进 errors，能恢复就恢复。
 */
export function parseXml(source: string): { doc: XmlDoc; errors: XmlError[]; warnings: XmlError[] } {
  const errors: XmlError[] = []
  const warnings: XmlError[] = []
  const doc: XmlDoc = { children: [] }
  const stack: XmlElement[] = []
  const lineStarts: number[] = [0]
  for (let index = 0; index < source.length; index += 1) if (source[index] === '\n') lineStarts.push(index + 1)
  const at = (index: number): XmlError => {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (lineStarts[mid] as number <= index) low = mid
      else high = mid - 1
    }
    return { line: low + 1, column: index - (lineStarts[low] as number) + 1, message: '' }
  }
  const fail = (index: number, message: string, list: XmlError[] = errors): void => {
    list.push({ ...at(index), message })
  }

  let cursor = 0
  const root = (): XmlElement | null => (stack.length ? (stack[stack.length - 1] as XmlElement) : null)
  const push = (node: XmlNode): void => {
    const parent = root()
    if (parent) parent.children.push(node)
    else doc.children.push(node)
  }

  while (cursor < source.length) {
    const open = source.indexOf('<', cursor)
    if (open < 0) {
      const text = source.slice(cursor)
      if (text.trim()) {
        if (stack.length || doc.children.length) fail(cursor, '根元素之外出现了裸文本')
        else fail(cursor, '开头不是标签（可能是少了 <、或前面有说明文字）')
      }
      if (text) push({ kind: 'text', value: decodeEntities(text, errors, (inner) => at(cursor + inner)) })
      break
    }
    if (open > cursor) {
      const text = source.slice(cursor, open)
      if (text.includes('<')) fail(cursor, '文本里有裸 <，应写成 &lt;')
      if (text.trim() && !root()) fail(cursor, '根元素之外出现了裸文本（顶层只允许一个根元素，外加注释与声明）')
      push({ kind: 'text', value: decodeEntities(text, errors, (inner) => at(cursor + inner)) })
    }

    if (source.startsWith('<!--', open)) {
      const end = source.indexOf('-->', open + 4)
      if (end < 0) {
        fail(open, '注释没有 <!--> 对应闭合')
        cursor = source.length
        continue
      }
      const body = source.slice(open + 4, end)
      if (/-{2,}/.test(body)) warnings.push({ ...at(open), message: '注释内容里有连续的 -，XML 规定注释里不能出现 --' })
      push({ kind: 'comment', value: body })
      cursor = end + 3
      continue
    }
    if (source.startsWith('<![CDATA[', open)) {
      const end = source.indexOf(']]>', open + 9)
      if (end < 0) {
        fail(open, 'CDATA 段缺少 ]]>')
        cursor = source.length
        continue
      }
      push({ kind: 'cdata', value: source.slice(open + 9, end) })
      cursor = end + 3
      continue
    }
    if (source.startsWith('<!', open)) {
      const end = skipDeclaration(source, open + 2)
      if (end < 0) {
        fail(open, 'DOCTYPE / 文档声明没有以 > 结束')
        cursor = source.length
        continue
      }
      push({ kind: 'doctype', value: source.slice(open + 2, end) })
      cursor = end + 1
      continue
    }
    if (source.startsWith('<?', open)) {
      const end = source.indexOf('?>', open + 2)
      if (end < 0) {
        fail(open, '处理指令缺少 ?>')
        cursor = source.length
        continue
      }
      const body = source.slice(open + 2, end)
      const target = /^\s*([^\s?]+)/.exec(body)
      push({ kind: 'pi', target: target?.[1] ?? '', value: body.replace(/^\s*[^\s?]+/, '').trim() })
      cursor = end + 2
      continue
    }
    if (source.startsWith('</', open)) {
      const end = source.indexOf('>', open)
      if (end < 0) {
        fail(open, '闭合标签缺少 >')
        cursor = source.length
        continue
      }
      const name = source.slice(open + 2, end).trim()
      if (!name) fail(open, '空的闭合标签 </>')
      const own = stack.map((el) => el.name).lastIndexOf(name)
      if (own < 0) {
        fail(open, `多余的闭合标签 </${name}>（没有对应的开标签）`)
      } else {
        if (own !== stack.length - 1) {
          const missing = stack.slice(own + 1).map((el) => el.name)
          fail(open, `标签错配：期望 </${(stack[stack.length - 1] as XmlElement).name}>，实际 </${name}>；被跳过的未闭合元素：${missing.join('、')}`)
        }
        stack.length = own
      }
      cursor = end + 1
      continue
    }

    const parsed = parseTag(source, open)
    if (!parsed) {
      fail(open, '这里不像标签（< 后必须是名字、/、! 或 ?）')
      push({ kind: 'text', value: decodeEntities('<', errors, at) })
      cursor = open + 1
      continue
    }
    const { name, attrs, selfClosing, end, errors: tagErrors } = parsed
    for (const tagError of tagErrors) fail(open + tagError.offset, tagError.message)
    if (!name) fail(open, '开标签没有名字')
    if (name && !root() && doc.children.some((node) => node.kind === 'element')) {
      fail(open, `出现第二个根元素 <${name}>（XML 只能有一个根）`)
    }
    const element: XmlElement = { kind: 'element', name, attrs, children: [] }
    push(element)
    cursor = end
    if (!selfClosing) stack.push(element)
  }

  for (const unclosed of stack) fail(0, `元素 <${unclosed.name}> 直到文件结束都没有闭合`, warnings)
  if (!doc.children.some((node) => node.kind === 'element')) fail(0, '没有解析出任何元素')
  return { doc, errors, warnings }
}

interface XmlElement extends Extract<XmlNode, { kind: 'element' }> {}

function parseTag(
  source: string,
  start: number
): {
  name: string
  attrs: [string, string][]
  selfClosing: boolean
  end: number
  errors: { offset: number; message: string }[]
} | null {
  const first = source[start + 1]
  if (!isNameStart(first)) return null
  let index = start + 1
  while (isNameChar(source[index])) index += 1
  const name = source.slice(start + 1, index)
  const attrs: [string, string][] = []
  const errors: { offset: number; message: string }[] = []
  let selfClosing = false
  for (;;) {
    while (/\s/.test(source[index] as string)) index += 1
    if (source[index] === '/') {
      if (source[index + 1] !== '>') {
        errors.push({ offset: index - start, message: '标签里多了 /，自闭合要写成 />' })
        index += 1
        continue
      }
      selfClosing = true
      index += 2
      break
    }
    if (source[index] === '>') {
      index += 1
      break
    }
    if (index >= source.length) {
      errors.push({ offset: source.length - 1 - start, message: '开标签没有 >' })
      break
    }
    const before = index
    while (isNameChar(source[index])) index += 1
    const key = source.slice(before, index)
    if (!key) {
      index += 1
      errors.push({
        offset: before - start,
        message: `属性写法不对（${JSON.stringify(source.slice(before, Math.min(source.length, before + 8)))} 处不是合法名字，可能是引号没配对）`
      })
      continue
    }
    while (/\s/.test(source[index] as string)) index += 1
    let value = ''
    if (source[index] === '=') {
      index += 1
      while (/\s/.test(source[index] as string)) index += 1
      const quote = source[index]
      if (quote === '"' || quote === "'") {
        const close = source.indexOf(quote, index + 1)
        if (close < 0) {
          errors.push({ offset: index - start, message: `属性 ${key} 的引号没有闭合` })
          value = source.slice(index + 1)
          index = source.length
        } else {
          value = source.slice(index + 1, close)
          index = close + 1
        }
      } else {
        const match = /[^\s>]*/.exec(source.slice(index))
        value = match?.[0] ?? ''
        index += value.length
        errors.push({ offset: index - start, message: `属性 ${key} 的值没有加引号` })
      }
    } else {
      errors.push({
        offset: before - start,
        message: `属性 ${key} 缺少值：XML 不允许裸属性名（那是 HTML 的写法），请写成 ${key}="…"`
      })
    }
    const decodeErrors: XmlError[] = []
    const decoded = decodeEntities(value, decodeErrors, (i) => ({ line: 0, column: i, message: '' }))
    if (attrs.some(([existing]) => existing === key)) {
      errors.push({ offset: before - start, message: `属性 ${key} 重复出现，只保留第一个` })
      continue
    }
    attrs.push([key, decoded])
  }
  return { name, attrs, selfClosing, end: index, errors }
}

/** 跳过 `<!` 开头的声明，处理嵌套的 [ ] */
function skipDeclaration(source: string, from: number): number {
  let depth = 0
  for (let index = from; index < source.length; index += 1) {
    const ch = source[index]
    if (ch === '[') depth += 1
    else if (ch === ']') depth = Math.max(0, depth - 1)
    else if (ch === '>' && depth === 0) return index
  }
  return -1
}

export interface FormatOptions {
  /** 每层缩进空格数，0 表示用制表符 */
  indent: number
  /** 保留注释 */
  keepComments: boolean
  /** 只有文本的元素压成一行 */
  collapseText: boolean
  /** 重排属性顺序（按键名） */
  sortAttributes: boolean
}

export const XML_DEFAULTS: FormatOptions = {
  indent: 2,
  keepComments: true,
  collapseText: true,
  sortAttributes: false
}

function padOf(depth: number, options: FormatOptions): string {
  if (depth <= 0) return ''
  return options.indent > 0 ? ' '.repeat(options.indent * depth) : '\t'.repeat(depth)
}

/** 提示去重：同一条说明只出现一次，否则十个文本节点刷十行 */
function pushNote(notes: string[], text: string): void {
  if (!notes.includes(text)) notes.push(text)
}

function attrText(attrs: [string, string][], options: FormatOptions): string {
  const list = options.sortAttributes ? [...attrs].sort(([a], [b]) => a.localeCompare(b)) : attrs
  return list.map(([key, value]) => ` ${key}="${escapeAttr(value)}"`).join('')
}

function isTextOnly(element: XmlElement): boolean {
  return element.children.length > 0 && element.children.every((node) => node.kind === 'text' || node.kind === 'cdata')
}

/** 只在「整段是换行缩进」时裁剪两端：`<a>\n  x\n</a>` 的边距是排版，`<a> b </a>` 的空格是内容 */
function trimIndent(text: string): string {
  return text.replace(/^[ \t]*(?:\r?\n[ \t]*)+/, '').replace(/[ \t]*(?:\r?\n[ \t]*)+$/, '')
}

function inlineText(element: XmlElement, notes: string[]): string {
  return element.children
    .map((node) => {
      if (node.kind === 'cdata') return `<![CDATA[${node.value}]]>`
      if (node.kind !== 'text') return ''
      const inner = trimIndent(node.value)
      if (/[\r\n]/.test(inner)) {
        pushNote(notes, '换行被压成了空格：只有文本的元素按「文本压一行」输出，需要保留换行就关掉该选项')
      }
      return escapeText(collapseSpaces(inner))
    })
    .join('')
}

function serialize(node: XmlNode, depth: number, options: FormatOptions, out: string[], notes: string[]): void {
  const pad = padOf(depth, options)
  switch (node.kind) {
    case 'text': {
      const text = collapseSpaces(node.value).trim()
      if (text) out.push(`${pad}${escapeText(text)}`)
      return
    }
    case 'cdata':
      out.push(`${pad}<![CDATA[${node.value}]]>`)
      return
    case 'comment': {
      if (!options.keepComments) return
      // 注释内容原样保留（一字不改），多行注释的后续行跟着缩进
      const body = node.value
        .split('\n')
        .map((line, position) => (position === 0 ? line : pad + line.replace(/^[ \t]+/, '')))
        .join('\n')
      out.push(`${pad}<!--${body}-->`)
      return
    }
    case 'doctype':
      out.push(`${pad}<!${node.value}>`)
      return
    case 'pi':
      out.push(`${pad}<?${node.target}${node.value ? ` ${node.value}` : ''}?>`)
      return
    case 'element': {
      const attrs = attrText(node.attrs, options)
      const kids = node.children.filter(
        (child) => !(child.kind === 'text' && !child.value.trim()) && !(child.kind === 'comment' && !options.keepComments)
      )
      if (!kids.length) {
        out.push(node.attrs.length ? `${pad}<${node.name}${attrs} />` : `${pad}<${node.name} />`)
        return
      }
      if (isTextOnly(node) && options.collapseText) {
        out.push(`${pad}<${node.name}${attrs}>${inlineText(node, notes)}</${node.name}>`)
        return
      }
      const mixed =
        kids.some((child) => child.kind === 'element') && kids.some((child) => child.kind === 'text' && child.value.trim())
      if (mixed) {
        // 混合内容（文本夹着元素）没法既保留空白语义又缩进，只能原样压一行
        if (kids.some((child) => child.kind === 'text' && /[\r\n]/.test(child.value)))
          pushNote(notes, '混合内容（文本夹着标签）整体压成一行，标签之间的换行被压成了空格')
        // 这里不能复用 kids：标签之间的纯空白在混合内容里是词间空格，去掉就改了文本
        const inline = node.children.filter((child) => !(child.kind === 'comment' && !options.keepComments))
        out.push(
          `${pad}<${node.name}${attrs}>${inline
            .map((child) =>
              child.kind === 'element'
                ? serializeInline(child, options, true)
                : child.kind === 'text'
                  ? escapeText(collapseSpaces(child.value))
                  : inlineLeaf(child)
            )
            .join('')}</${node.name}>`
        )
        return
      }
      out.push(`${pad}<${node.name}${attrs}>`)
      for (const child of kids) serialize(child, depth + 1, options, out, notes)
      out.push(`${pad}</${node.name}>`)
      return
    }
  }
}

/** 连续空白压成一个空格：再压一次结果不变，所以格式化是幂等的 */
function collapseSpaces(text: string): string {
  return text.replace(/[\t\n\r ]+/g, ' ')
}

/**
 * 压成一行输出。`keepBlank` 决定「标签之间的纯空白」留不留：
 * 混合内容要留（`hello <b>x</b>` 里那个空格有意义），压缩模式要去掉（那才是体积的来源）。
 */
function serializeInline(element: XmlElement, options: FormatOptions, keepBlank: boolean): string {
  const attrs = attrText(element.attrs, options)
  if (!element.children.length) return `<${element.name}${attrs}/>`
  return `<${element.name}${attrs}>${element.children
    .filter((child) => keepBlank || child.kind !== 'text' || child.value.trim())
    .map((child) => (child.kind === 'element' ? serializeInline(child, options, keepBlank) : inlineLeaf(child)))
    .join('')}</${element.name}>`
}

/** 一行输出里除元素之外的节点：文本原样转义，空白要不要留由调用方的 filter 决定 */
function inlineLeaf(node: Exclude<XmlNode, { kind: 'element' }>): string {
  switch (node.kind) {
    case 'text':
      return escapeText(node.value)
    case 'cdata':
      return `<![CDATA[${node.value}]]>`
    case 'comment':
      return `<!--${node.value}-->`
    case 'pi':
      return `<?${node.target}${node.value ? ` ${node.value}` : ''}?>`
    case 'doctype':
      return `<!${node.value}>`
  }
}

export function statsOf(doc: XmlDoc): XmlStats {
  let elements = 0
  let attributes = 0
  let textNodes = 0
  let comments = 0
  let cdata = 0
  let maxDepth = 0
  const prefixes = new Set<string>()
  const names = new Set<string>()
  const walk = (node: XmlNode, depth: number): void => {
    if (node.kind === 'comment') comments += 1
    if (node.kind === 'cdata') cdata += 1
    if (node.kind === 'text' && node.value.trim()) textNodes += 1
    if (node.kind !== 'element') return
    elements += 1
    maxDepth = Math.max(maxDepth, depth)
    attributes += node.attrs.length
    names.add(node.name)
    if (node.name.includes(':')) prefixes.add(node.name.split(':')[0] as string)
    for (const [key] of node.attrs) {
      // xmlns 与 xmlns:p 是命名空间声明，不是前缀
      if (key === 'xmlns' || key.startsWith('xmlns:')) continue
      if (key.includes(':')) prefixes.add(key.split(':')[0] as string)
    }
    for (const child of node.children) walk(child, depth + 1)
  }
  for (const child of doc.children) walk(child, 1)
  return {
    elements,
    attributes,
    textNodes,
    comments,
    cdata,
    maxDepth,
    prefixes: [...prefixes].sort(),
    names: [...names].sort()
  }
}

export function formatXml(source: string, options: Partial<FormatOptions> = {}): XmlResult {
  const opts: FormatOptions = { ...XML_DEFAULTS, ...options }
  if (!source.trim()) return { ok: false, value: '', errors: [{ line: 1, column: 1, message: '输入为空' }], notes: [] }
  const { doc, errors, warnings } = parseXml(source)
  const notes: string[] = []
  const out: string[] = []
  for (const node of doc.children) {
    if (node.kind === 'text' && !node.value.trim()) continue
    serialize(node, 0, opts, out, notes)
  }
  const value = `${out.join('\n')}\n`
  if (!opts.keepComments) {
    const dropped = statsOf(doc).comments
    if (dropped) notes.push(`已删除 ${dropped} 条注释`)
  }
  if (errors.length) notes.push('结构有误：下面按恢复出来的树格式化，先照错误列表里的行列号修标签')
  if (warnings.length) notes.push(...warnings.slice(0, 4).map((w) => `第 ${w.line} 行：${w.message}`))
  return { ok: !errors.length, value, errors, notes, stats: statsOf(doc) }
}

export function minifyXml(source: string, options: Partial<FormatOptions> = {}): XmlResult {
  const opts: FormatOptions = { ...XML_DEFAULTS, ...options, indent: 0, collapseText: true }
  if (!source.trim()) return { ok: false, value: '', errors: [{ line: 1, column: 1, message: '输入为空' }], notes: [] }
  const { doc, errors, warnings } = parseXml(source)
  const notes: string[] = []
  const out: string[] = []
  const head: string[] = []
  const before = source.replace(/\s+/g, '').length
  for (const node of doc.children) {
    if (node.kind === 'text' && !node.value.trim()) continue
    if (node.kind === 'comment' && !opts.keepComments) continue
    if (node.kind === 'pi' || node.kind === 'doctype') {
      // 声明和 DOCTYPE 必须在根元素之前，单独占一行（它们之间的空白不属于文档内容）
      const line: string[] = []
      serialize(node, 0, opts, line, notes)
      head.push(line[0] ?? '')
      continue
    }
    if (node.kind === 'element') out.push(serializeInline(node, opts, false))
    else serialize(node, 0, opts, out, notes)
  }
  const value = `${head.length ? `${head.join('\n')}\n` : ''}${out.join('')}`
  const after = value.replace(/\s+/g, '').length
  if (before !== after) notes.push(`压缩过程中有文本被规整（非空白字符数 ${before} → ${after}），请对比确认`)
  notes.push('已去掉标签之间的换行与缩进；根元素之外的声明 / DOCTYPE / 注释仍各占一行')
  if (!opts.keepComments && doc.children.some((node) => node.kind === 'comment')) notes.push('已删除注释')
  if (errors.length) notes.push('结构有误：按恢复出来的树压缩')
  if (warnings.length) notes.push(...warnings.slice(0, 4).map((w) => `第 ${w.line} 行：${w.message}`))
  return { ok: !errors.length, value, errors, notes, stats: statsOf(doc) }
}

export interface XmlJsonOptions {
  /** 属性放在哪个键下 */
  attrsKey: string
  /** 文本放在哪个键下 */
  textKey: string
  /** 同名兄弟合并成数组（关掉就是每个都留一条） */
  collapse: boolean
  /** 纯数字文本转成 number */
  numbers: boolean
}

export const XML_JSON_DEFAULTS: XmlJsonOptions = {
  attrsKey: '_attributes',
  textKey: '_text',
  collapse: true,
  numbers: false
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

function toNumber(text: string): number | null {
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

function elementToJson(element: XmlElement, options: XmlJsonOptions): JsonValue {
  const body: Record<string, JsonValue> = {}
  if (element.attrs.length) {
    const attrs: Record<string, JsonValue> = {}
    for (const [key, value] of element.attrs) attrs[key] = value
    body[options.attrsKey] = attrs
  }
  const texts: string[] = []
  const cdata: string[] = []
  const kids = new Map<string, JsonValue[]>()
  for (const child of element.children) {
    if (child.kind === 'text') {
      const text = child.value.trim()
      if (text) texts.push(text)
    } else if (child.kind === 'cdata') {
      cdata.push(child.value)
    } else if (child.kind === 'element') {
      const list = kids.get(child.name) ?? []
      list.push(elementToJson(child, options))
      kids.set(child.name, list)
    }
  }
  const raw = texts.join('')
  const hasKids = kids.size > 0
  if (!hasKids && !cdata.length && !element.attrs.length) {
    if (options.numbers && raw && toNumber(raw) !== null) return toNumber(raw) as number
    return raw
  }
  if (raw) body[options.textKey] = options.numbers && toNumber(raw) !== null ? (toNumber(raw) as number) : raw
  if (cdata.length) body.$cdata = cdata.join('')
  for (const [name, list] of kids) {
    const repeated = list.length > 1
    if (options.collapse && !repeated) body[name] = list[0] as JsonValue
    else body[name] = list
  }
  return body
}

/** XML → JSON 对象（数组里的同名兄弟合并） */
export function xmlToObject(source: string, options: Partial<XmlJsonOptions> = {}): { ok: boolean; data: JsonValue; errors: XmlError[] } {
  const opts: XmlJsonOptions = { ...XML_JSON_DEFAULTS, ...options }
  const { doc, errors } = parseXml(source)
  const root = doc.children.find((node): node is XmlElement => node.kind === 'element')
  if (!root) return { ok: false, data: null, errors: errors.length ? errors : [{ line: 1, column: 1, message: '没有根元素' }] }
  return { ok: !errors.length, data: { [root.name]: elementToJson(root, opts) }, errors }
}

export function xmlToJson(source: string, options: Partial<XmlJsonOptions> = {}, indent: number | string = 2): XmlResult {
  const { ok, data, errors } = xmlToObject(source, options)
  const notes: string[] = []
  if (ok) {
    notes.push(`属性收在 ${options.attrsKey ?? XML_JSON_DEFAULTS.attrsKey} 下、文本收在 ${options.textKey ?? XML_JSON_DEFAULTS.textKey} 下；同名兄弟归为数组。数值一律先当字符串，需要时再单独转`)
    if (!/^\s*<\?xml/i.test(source)) notes.push('输入没有 XML 声明：无法确认编码，已按 UTF-8 处理')
  }
  return {
    ok,
    value: ok
      ? `${JSON.stringify(data, null, typeof indent === 'string' ? indent : indent > 0 ? indent : 0)}\n`
      : '',
    errors,
    notes
  }
}
