/**
 * JSON → TypeScript 接口内核。
 *
 * 设计上的三个决定：
 * - **可选和 null 是两回事**：对象合并时逐键记 `seen`，整体记 `count`，`seen < count` 才是可选；
   出现 `null` 则并进联合类型。把 null 当可选，调用方就会漏掉运行时判空。
 * - **对象一律提升成具名接口**：接口体里只可能出现名字、原始类型、数组和 `Record<...>`，
 *   于是缩进永远只有一层，不会出现嵌套大括号的错位。
 * - **同形状的接口只生成一个**：按结构指纹缓存，`{items:[..],list:[..]}` 元素同构时共用一个名字。
 */

export interface TsOptions {
  rootName: string
  /** 成员行尾加分号 */
  semicolon: boolean
  /** 成员加 readonly */
  readonly: boolean
  /** 顶层加 export 前缀 */
  exportAll: boolean
  /** 键在部分样本里缺失时标成可选 */
  markOptional: boolean
  /** 少量短字符串值合成字面量联合 */
  stringLiterals: boolean
  /** 定长且元素类型不同的数组输出元组 */
  tuples: boolean
  /** 成员按键名排序 */
  sortKeys: boolean
  /** 缩进空格数 */
  indent: number
}

export const TS_DEFAULTS: TsOptions = {
  rootName: 'Root',
  semicolon: true,
  readonly: false,
  exportAll: true,
  markOptional: true,
  stringLiterals: true,
  tuples: false,
  sortKeys: false,
  indent: 2
}

export interface TsResult {
  ok: boolean
  value: string
  /** 生成的接口 / 类型别名名，按出现顺序 */
  names: string[]
  notes: string[]
  error?: string
}

interface Prop {
  type: JsonType
  /** 在多少个对象实例里出现过 */
  seen: number
}

type JsonType =
  | { kind: 'null' }
  | { kind: 'bool' }
  | { kind: 'num' }
  | { kind: 'unknown' }
  | { kind: 'str'; values: Map<string, number> }
  | { kind: 'arr'; lengths: Map<number, number>; slots: (JsonType | undefined)[]; item: JsonType | null }
  | { kind: 'obj'; props: Map<string, Prop>; count: number }
  | { kind: 'union'; types: JsonType[] }

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const TS_RESERVED = new Set([
  'any', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
  'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'return', 'static',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'keyof'
])

/** 字面量联合的门槛：种类太多、串太长就不再当枚举 */
const LITERAL_MAX_KINDS = 6
const LITERAL_MAX_LENGTH = 32

export function pascal(text: string): string {
  const words = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
  const joined = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('')
  return joined ? (/^\d/.test(joined) ? `N${joined}` : joined) : 'Value'
}

/** 极简英文单数化：只为接口名好看，不追求语言学正确（`status` 这类以 us 结尾的词原样留着） */
export function singular(text: string): string {
  if (/ies$/i.test(text)) return `${text.slice(0, -3)}y`
  if (/(?:x|z|ch|sh|ss)es$/i.test(text)) return text.slice(0, -2)
  if (/(ss|x|z|ch|sh)$/i.test(text)) return text
  if (/s$/i.test(text) && !/(?:ss|us)$/i.test(text)) return text.slice(0, -1)
  return text
}

function emptyArray(): Extract<JsonType, { kind: 'arr' }> {
  return { kind: 'arr', lengths: new Map(), slots: [], item: null }
}

function clone(type: JsonType): JsonType {
  switch (type.kind) {
    case 'null':
    case 'bool':
    case 'num':
    case 'unknown':
      return type
    case 'str':
      return { kind: 'str', values: new Map(type.values) }
    case 'arr':
      return {
        kind: 'arr',
        lengths: new Map(type.lengths),
        slots: type.slots.map((slot) => (slot ? clone(slot) : undefined)),
        item: type.item ? clone(type.item) : null
      }
    case 'obj': {
      const props = new Map<string, Prop>()
      for (const [key, prop] of type.props) props.set(key, { type: clone(prop.type), seen: prop.seen })
      return { kind: 'obj', props, count: type.count }
    }
    case 'union':
      return { kind: 'union', types: type.types.map(clone) }
  }
}

function typeOf(value: unknown): JsonType {
  if (value === null || value === undefined) return { kind: 'null' }
  if (typeof value === 'boolean') return { kind: 'bool' }
  if (typeof value === 'number') return Number.isFinite(value) ? { kind: 'num' } : { kind: 'unknown' }
  if (typeof value === 'string') return { kind: 'str', values: new Map([[value, 1]]) }
  if (Array.isArray(value)) {
    const acc = emptyArray()
    acc.lengths.set(value.length, 1)
    for (const [index, element] of value.entries()) {
      const type = typeOf(element)
      acc.slots[index] = type
      acc.item = acc.item ? combine(acc.item, type) : type
    }
    return acc
  }
  if (typeof value === 'object') {
    const props = new Map<string, Prop>()
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      props.set(key, { type: typeOf(inner), seen: 1 })
    }
    return { kind: 'obj', props, count: 1 }
  }
  return { kind: 'unknown' }
}

/** a 原地吸收 b；结构不兼容时返回 null，由 combine 退化成联合 */
function mergeInto(a: JsonType, b: JsonType): JsonType | null {
  if (a.kind === 'unknown' || b.kind === 'unknown') return { kind: 'unknown' }
  if (a.kind !== b.kind) return null
  switch (a.kind) {
    case 'null':
    case 'bool':
    case 'num':
      return a
    case 'str': {
      if (b.kind !== 'str') return null
      for (const [value, hits] of b.values) a.values.set(value, (a.values.get(value) ?? 0) + hits)
      return a
    }
    case 'arr': {
      if (b.kind !== 'arr') return null
      for (const [length, hits] of b.lengths) a.lengths.set(length, (a.lengths.get(length) ?? 0) + hits)
      for (let index = 0; index < b.slots.length; index += 1) {
        const slot = b.slots[index]
        if (!slot) continue
        const own = a.slots[index]
        a.slots[index] = own ? combine(own, slot) : clone(slot)
      }
      if (b.item) a.item = a.item ? combine(a.item, b.item) : clone(b.item)
      return a
    }
    case 'obj': {
      if (b.kind !== 'obj') return null
      a.count += b.count
      for (const [key, prop] of b.props) {
        const own = a.props.get(key)
        if (!own) a.props.set(key, { type: clone(prop.type), seen: prop.seen })
        else {
          own.seen += prop.seen
          own.type = combine(own.type, prop.type)
        }
      }
      return a
    }
    case 'union': {
      if (b.kind !== 'union') return null
      return foldAll(a.types, b.types)
    }
    default:
      return null
  }
}

/** 把 member 并进 types（原地），塌成非联合时由 normalizeUnion 决定 */
function foldUnion(types: JsonType[], member: JsonType): JsonType {
  // 嵌套联合先摊平，否则 `number|string` 并 `number|string|null` 会整体塞进去、去重形同虚设
  if (member.kind === 'union') return foldAll(types, member.types)
  for (let index = 0; index < types.length; index += 1) {
    const merged = mergeInto(types[index] as JsonType, member)
    if (merged) {
      types[index] = merged
      return normalizeUnion(types)
    }
  }
  types.push(member)
  return normalizeUnion(types)
}

/** 逐个并入：中途塌成 unknown / 单类型也继续，剩下的成员照样能并进去 */
function foldAll(types: JsonType[], members: JsonType[]): JsonType {
  let acc: JsonType = { kind: 'union', types }
  for (const member of members) acc = foldUnion(acc.kind === 'union' ? acc.types : [acc], member)
  return acc
}

/** 去重 + null 靠后 + unknown 吞掉一切 */
function normalizeUnion(types: JsonType[]): JsonType {
  if (types.some((member) => member.kind === 'unknown')) return { kind: 'unknown' }
  const kept: JsonType[] = []
  for (const member of types) {
    const twin = kept.find((candidate) => fingerprint(candidate) === fingerprint(member))
    if (twin) mergeInto(twin, member)
    else kept.push(member)
  }
  if (kept.length === 1) return kept[0] as JsonType
  const nulls = kept.filter((member) => member.kind === 'null')
  const rest = kept.filter((member) => member.kind !== 'null')
  return { kind: 'union', types: [...rest, ...nulls] }
}

function combine(a: JsonType, b: JsonType): JsonType {
  if (a.kind === 'union') return foldUnion(a.types, b.kind === 'union' ? { ...b, types: b.types.map(clone) } : b)
  if (b.kind === 'union') return foldAll([a], b.types.map(clone))
  const merged = mergeInto(a, b)
  if (merged) return merged
  return normalizeUnion([a, b])
}

function fingerprint(type: JsonType): string {
  switch (type.kind) {
    case 'null':
    case 'bool':
    case 'num':
    case 'unknown':
      return type.kind
    case 'str':
      return `str(${[...type.values.keys()].sort().join('/')})`
    case 'arr':
      return `[${type.slots.map((slot) => (slot ? fingerprint(slot) : '_')).join(',')}]`
    case 'obj':
      return `{${[...type.props.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, prop]) => `${key}${prop.seen}/${fingerprint(prop.type)}`)
        .join(',')}}`
    case 'union':
      return type.types.map(fingerprint).sort().join('|')
  }
}

/** 结构指纹（忽略出现次数），用于接口复用 */
function shapeKey(type: JsonType): string {
  if (type.kind !== 'obj') return fingerprint(type)
  return `{${[...type.props.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, prop]) => `${key}:${fingerprint(prop.type)}`)
    .join(',')}}`
}

function quoteKey(key: string): string {
  if (IDENTIFIER.test(key) && !TS_RESERVED.has(key)) return key
  return JSON.stringify(key)
}

interface Ctx {
  options: TsOptions
  cache: Map<string, string>
  used: Set<string>
  /** 已登记的接口，子接口先于父接口 */
  blocks: string[]
  aliases: { name: string; body: string }[]
  notes: Set<string>
  /** 被合成字面量联合的字段名 */
  literals: Set<string>
}

function claim(base: string, ctx: Ctx): string {
  const clean = pascal(base)
  let name = clean
  let n = 2
  while (ctx.used.has(name)) {
    name = `${clean}${n}`
    n += 1
  }
  ctx.used.add(name)
  return name
}

/** 渲染一个类型表达式；对象会登记成接口并返回接口名 */
function render(type: JsonType, name: string, ctx: Ctx, elementName?: string): string {
  switch (type.kind) {
    case 'null':
      return 'null'
    case 'bool':
      return 'boolean'
    case 'num':
      return 'number'
    case 'unknown':
      return 'unknown'
    case 'str':
      return renderString(type, name, ctx)
    case 'union': {
      const parts = type.types.map((member) => render(member, name, ctx, elementName))
      return [...new Set(parts)].join(' | ')
    }
    case 'arr':
      return renderArray(type, name, ctx, elementName)
    case 'obj':
      return renderObject(type, name, ctx)
  }
}

function renderString(type: JsonType & { kind: 'str' }, name: string, ctx: Ctx): string {
  const values = [...type.values.keys()]
  if (!ctx.options.stringLiterals) return 'string'
  if (values.length < 2 || values.length > LITERAL_MAX_KINDS) return 'string'
  if (values.some((value) => !value || value.length > LITERAL_MAX_LENGTH)) return 'string'
  ctx.literals.add(name)
  return values.map((value) => JSON.stringify(value)).join(' | ')
}

function needsParens(text: string): boolean {
  return text.includes('|')
}

function renderArray(
  type: JsonType & { kind: 'arr' },
  name: string,
  ctx: Ctx,
  elementName?: string
): string {
  if (!type.item) {
    ctx.notes.add(`「${name || '值'}」是空数组，元素类型只能给 unknown，等一条真实数据再重生成`)
    return 'unknown[]'
  }
  const distinct = new Set(
    type.slots.filter((slot): slot is JsonType => Boolean(slot)).map((slot) => fingerprint(slot))
  )
  const fixed = type.lengths.size === 1 && [...type.lengths.keys()][0] === type.slots.length
  if (ctx.options.tuples && fixed && type.slots.length > 1 && distinct.size > 1) {
    const members = type.slots.map(
      (slot, index) => render(slot ?? { kind: 'null' }, `${name}${index + 1}`, ctx)
    )
    return `[${members.join(', ')}]`
  }
  const child = elementName ?? (singular(name) === name ? `${name}Item` : singular(name))
  const element = render(type.item, child, ctx)
  return needsParens(element) ? `(${element})[]` : `${element}[]`
}

function renderObject(type: JsonType & { kind: 'obj' }, name: string, ctx: Ctx, forcedName?: string): string {
  if (!type.props.size) {
    ctx.notes.add(`「${name || '值'}」是空对象，只能给 Record<string, unknown>`)
    return 'Record<string, unknown>'
  }
  const key = shapeKey(type)
  const cached = ctx.cache.get(key)
  if (cached) return cached

  const iface = forcedName ?? claim(name, ctx)
  ctx.cache.set(key, iface)
  ctx.used.add(iface)

  const entries = [...type.props.entries()]
  if (ctx.options.sortKeys) entries.sort(([a], [b]) => a.localeCompare(b))
  const pad = ' '.repeat(Math.max(1, ctx.options.indent))
  const lines = entries.map(([prop, info]) => {
    const optional = ctx.options.markOptional && info.seen < type.count
    const text = render(info.type, prop, ctx)
    return `${pad}${ctx.options.readonly ? 'readonly ' : ''}${quoteKey(prop)}${optional ? '?' : ''}: ${text}${
      ctx.options.semicolon ? ';' : ''
    }`
  })
  ctx.blocks.push(`interface ${iface} {\n${lines.join('\n')}\n}`)
  return iface
}

function errorAt(source: string, message: string): string {
  const match = /position (\d+)/.exec(message)
  if (!match) return message
  const index = Number(match[1])
  const before = source.slice(0, index)
  const line = before.split('\n').length
  const column = index - (before.lastIndexOf('\n') + 1) + 1
  const snippet = source.slice(Math.max(0, index - 20), index + 20).replace(/\s+/g, ' ')
  return `第 ${line} 行第 ${column} 列：${message.replace(/ in JSON at position \d+.*$/, '')}（附近「${snippet}」）`
}

/** 单个 JSON 文档解析不了时，逐行按 NDJSON 再试一次 */
function parseValues(source: string): { values: unknown[]; ndjson: boolean } | { error: string } {
  try {
    return { values: [JSON.parse(source)], ndjson: false }
  } catch (error) {
    const first = errorAt(source, (error as Error).message)
    const lines = source.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length < 2) return { error: first }
    const values: unknown[] = []
    for (const [index, line] of lines.entries()) {
      try {
        values.push(JSON.parse(line))
      } catch (error2) {
        return { error: `整体不是合法 JSON（${first}）；按 NDJSON 逐行解析时第 ${index + 1} 行也失败了（${(error2 as Error).message}）` }
      }
    }
    return { values, ndjson: true }
  }
}

export function generateTypes(source: string, options: Partial<TsOptions> = {}): TsResult {
  const opts: TsOptions = { ...TS_DEFAULTS, ...options }
  const notes = new Set<string>()
  if (!source.trim()) return { ok: false, value: '', names: [], notes: [], error: '输入为空' }
  const parsed = parseValues(source)
  if ('error' in parsed) return { ok: false, value: '', names: [], notes: [], error: parsed.error }

  let root: JsonType | null = null
  for (const value of parsed.values) root = root ? combine(root, typeOf(value)) : typeOf(value)
  if (!root) return { ok: false, value: '', names: [], notes: [], error: '没有可解析的 JSON 值' }

  const ctx: Ctx = {
    options: opts,
    cache: new Map(),
    used: new Set(),
    blocks: [],
    aliases: [],
    notes,
    literals: new Set()
  }
  if (parsed.ndjson) notes.add(`已把 ${parsed.values.length} 行 NDJSON 合并成一个类型（缺键会变可选、取值会变联合）`)

  const rootName = pascal(opts.rootName) || 'Root'
  ctx.used.add(rootName)
  if (root.kind === 'obj') {
    renderObject(root, rootName, ctx, rootName)
  } else if (root.kind === 'arr' && root.item && root.item.kind === 'obj') {
    const child = singular(opts.rootName) === opts.rootName ? `${opts.rootName}Item` : singular(opts.rootName)
    ctx.aliases.unshift({ name: rootName, body: render(root, opts.rootName, ctx, pascal(child)) })
  } else {
    ctx.aliases.unshift({ name: rootName, body: render(root, opts.rootName, ctx) })
  }

  if (root.kind === 'arr') notes.add('顶层是数组：已生成元素接口 + 一个表示数组本身的类型别名')
  if (!opts.markOptional) notes.add('未标可选：所有成员都是必填，实际可能缺键')
  if (ctx.literals.size) {
    notes.add(
      `${ctx.literals.size} 个字段的取值很少（${[...ctx.literals].slice(0, 5).join('、')}${ctx.literals.size > 5 ? ' 等' : ''}），已合成字面量联合；真实数据更多时请关掉该选项或重生成`
    )
  }

  const blocks: string[] = []
  for (const body of ctx.blocks) blocks.push(`${opts.exportAll ? 'export ' : ''}${body}`)
  for (const alias of ctx.aliases) blocks.push(`${opts.exportAll ? 'export ' : ''}type ${alias.name} = ${alias.body}`)
  const names = [
    ...ctx.blocks.flatMap((body) => {
      const matched = /^interface (\w+)/.exec(body)?.[1]
      return matched ? [matched] : []
    }),
    ...ctx.aliases.map((alias) => alias.name)
  ]
  return { ok: true, value: `${blocks.join('\n\n')}\n`, names: [...new Set(names)], notes: [...notes] }
}

export const TS_SAMPLES: { label: string; value: string }[] = [
  {
    label: '缺键 + null',
    value: `{"users":[{"id":1,"name":"张三","tags":["a","b"]},{"id":2,"name":"李四"}],"total":2,"next":null}`
  },
  {
    label: '字面量联合',
    value: `{"orders":[{"status":"paid","currency":"CNY"},{"status":"refunded","currency":"CNY"},{"status":"paid","currency":"USD"}]}`
  },
  {
    label: '顶层数组',
    value: `[{"k":"a","v":1},{"k":"b","v":2}]`
  },
  {
    label: '混合类型数组',
    value: `{"pair":[1,"two",true,null],"matrix":[[1,2],[3,4]]}`
  },
  {
    label: 'NDJSON 三行',
    value: `{"id":1,"name":"张三"}\n{"id":2,"name":"李四","vip":true}\n{"id":3,"name":null}`
  }
]
