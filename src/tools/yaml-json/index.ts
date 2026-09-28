/**
 * YAML ⇄ JSON 内核（唯一带第三方依赖的工具：`js-yaml`）。
 *
 * 只做三件有价值的事：
 * - **报错带行列**：`js-yaml` 的异常消息末尾自带 `(行:列)`，直接抽出来显示，不用人去数。
 * - **不可表示的东西如实说明**：JSON 没有 `Infinity`/`NaN`、没有超长整数（已丢精度）、
 *   没有循环引用（锚点别名展开后可能出现）、键必须是字符串（`{"1":2}` 回读会变成数字键 1）。
 * - **往返自检**：JSON → YAML 之后立刻 YAML → JSON 比一遍，结构变了就警告。
 *   靠规则枚举 YAML 的坑是列不全的，实测一轮往返才是可靠的判据。
 */

import { dump, loadAll } from 'js-yaml'

export interface JsonFromYamlOptions {
  /** JSON 缩进空格数，0 表示压成一行 */
  indent: number
  /** 多文档时合并成数组，否则只取第一个 */
  allDocuments: boolean
}

export interface YamlFromJsonOptions {
  /** 每层缩进空格数（YAML 约定 2） */
  indent: number
  /** 键按字母排序 */
  sortKeys: boolean
  /** 所有标量都加引号（最保险，回读不会有类型惊喜） */
  forceQuotes: boolean
  /** 0 = 全部块式；给个正数则该深度以后用流式 `{a: 1}` */
  flowLevel: number
  /** true 时按 80 列折行（会把长字符串拆行，慎用） */
  wrap: boolean
}

export const YAML_DEFAULTS: YamlFromJsonOptions = {
  indent: 2,
  sortKeys: false,
  forceQuotes: false,
  flowLevel: -1,
  wrap: false
}

export const JSON_DEFAULTS: JsonFromYamlOptions = { indent: 2, allDocuments: true }

export interface ConvertResult {
  ok: boolean
  value: string
  notes: string[]
  error?: string
}

export const YAML_SAMPLES: { label: string; value: string }[] = [
  {
    label: '块式 + 注释 + 锚点',
    value: `# 服务清单\nversion: 3\nservices:\n  web:\n    image: nginx:1.27\n    ports:\n      - 80:80\n      - 443:443\n    env: &env\n      LANG: C.UTF-8\n      DEBUG: false\n  api:\n    image: node:24\n    env:\n      <<: *env\n      PORT: 8080\n`
  },
  {
    label: '类型陷阱',
    value: `a: 2026-01-02\nb: 0x1f\nc: 1e3\nd: .inf\ne: 123456789012345678901\nf: "yes"\ng: yes\nh: null\ni: []\nj: {k: v}\n`
  },
  {
    label: '多文档',
    value: `---\nname: 张三\nage: 30\n---\nname: 李四\nage: null\n`
  },
  {
    label: '坏的 YAML',
    value: `root:\n  a: 1\n   b: 2\n`
  }
]

function yamlErrorPosition(message: string): string {
  const match = /\((\d+):(\d+)\)/.exec(message.split('\n')[0] as string)
  if (!match) return ''
  return `第 ${match[1]} 行第 ${match[2]} 列：`
}

function firstLine(message: string): string {
  return (message.split('\n')[0] as string).replace(/\s*\((\d+):(\d+)\)\s*$/, '').trim()
}

/** JSON.stringify 会把 Infinity/NaN 静默变成 null，这里先换成可读字符串 */
function normalize(value: unknown, seen: WeakSet<object>, issues: Set<string>): unknown {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      issues.add('YAML 里的 NaN 在 JSON 里没有对应写法，已写成字符串 "NaN"')
      return 'NaN'
    }
    if (!Number.isFinite(value)) {
      issues.add(`YAML 里的 ${value > 0 ? '.inf' : '-.inf'} 在 JSON 里没有对应写法，已写成字符串 "${value > 0 ? 'Infinity' : '-Infinity'}"`)
      return value > 0 ? 'Infinity' : '-Infinity'
    }
    if (Math.abs(value) >= 2 ** 53 && Number.isInteger(value)) {
      issues.add(`出现超出双精度安全范围的整数（${value}），已经丢精度；需要原值请用引号包成字符串`)
    }
    return value
  }
  if (typeof value !== 'object' || value === null) return value
  if (seen.has(value)) {
    issues.add('出现循环引用（锚点别名自指），该层已用 "[循环]" 占位')
    return '[循环]'
  }
  seen.add(value)
  if (Array.isArray(value)) {
    const list = value.map((item) => normalize(item, seen, issues))
    seen.delete(value)
    return list
  }
  const out: Record<string, unknown> = {}
  for (const [key, inner] of Object.entries(value)) out[key] = normalize(inner, seen, issues)
  seen.delete(value)
  return out
}

function countNodes(value: unknown): { nodes: number; scalars: number } {
  let nodes = 0
  let scalars = 0
  const walk = (inner: unknown): void => {
    if (Array.isArray(inner)) {
      nodes += 1
      for (const item of inner) walk(item)
      return
    }
    if (inner && typeof inner === 'object') {
      nodes += 1
      for (const value of Object.values(inner as Record<string, unknown>)) walk(value)
      return
    }
    scalars += 1
  }
  walk(value)
  return { nodes, scalars }
}

export function yamlToJson(
  source: string,
  options: Partial<JsonFromYamlOptions> = {}
): ConvertResult {
  const opts: JsonFromYamlOptions = { ...JSON_DEFAULTS, ...options }
  const notes: string[] = []
  if (!source.trim()) return { ok: false, value: '', notes: [], error: '输入为空' }
  let docs: unknown[]
  try {
    docs = loadAll(source) as unknown[]
  } catch (error) {
    const message = (error as Error).message
    const head = firstLine(message)
    return {
      ok: false,
      value: '',
      notes: [],
      error: `${yamlErrorPosition(message)}${/unacceptable kind/i.test(head) ? '出现了 YAML 不接受的字符（常见于把二进制当文本粘进来）' : head}`
    }
  }
  if (!docs.length) {
    // 只有注释 / 空行的文档是合法的，内容是 null；js-yaml 会把它整个跳过
    docs = [null]
    notes.push('文档里没有内容（只有注释或空白），按 YAML 约定等价于 null')
  }

  let data: unknown = docs.length > 1 && opts.allDocuments ? docs : docs[0]
  if (data === undefined) data = null
  if (docs.length > 1) {
    notes.push(
      opts.allDocuments
        ? `检测到 ${docs.length} 个文档（以 --- 分隔），已合成一个 JSON 数组`
        : `检测到 ${docs.length} 个文档，已只取第一个（要全部转换请打开「多文档合成数组」）`
    )
  }
  const issues = new Set<string>()
  data = normalize(data, new WeakSet(), issues)
  notes.push(...issues)
  if (/^\s*<<\s*:/m.test(source)) {
    notes.push('检测到合并键 << ：它是 YAML 1.1 的扩展，这里不展开，JSON 里原样保留成一个名叫 "<<" 的键')
  }
  const { nodes, scalars } = countNodes(data)
  notes.push(`共 ${nodes} 个集合节点、${scalars} 个标量`)
  if (nodes > 400) notes.push('数据量偏大，压成一行会更快')

  const value = JSON.stringify(data, null, opts.indent > 0 ? opts.indent : undefined)
  return { ok: true, value: `${value}\n`, notes }
}

/** 稳定的 JSON 文本，用于往返比对 */
function stableText(value: unknown): string {
  const sort = (inner: unknown): unknown => {
    if (Array.isArray(inner)) return inner.map(sort)
    if (inner && typeof inner === 'object') {
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(inner as Record<string, unknown>).sort()) {
        out[key] = sort((inner as Record<string, unknown>)[key])
      }
      return out
    }
    return inner
  }
  return JSON.stringify(sort(value))
}

export function jsonToYaml(source: string, options: Partial<YamlFromJsonOptions> = {}): ConvertResult {
  const opts: YamlFromJsonOptions = { ...YAML_DEFAULTS, ...options }
  const notes: string[] = []
  if (!source.trim()) return { ok: false, value: '', notes: [], error: '输入为空' }
  let data: unknown
  try {
    data = JSON.parse(source)
  } catch (error) {
    const message = (error as Error).message
    const match = /position (\d+)/.exec(message)
    let where = ''
    if (match) {
      const index = Number(match[1])
      const before = source.slice(0, index)
      where = `第 ${before.split('\n').length} 行第 ${index - (before.lastIndexOf('\n') + 1) + 1} 列：`
    }
    return { ok: false, value: '', notes: [], error: `${where}${message.replace(/ in JSON at position \d+.*$/, '')}` }
  }
  if (data === undefined) return { ok: false, value: '', notes: [], error: '解析结果是 undefined，无法写成 YAML' }

  let value = ''
  try {
    value = dump(data, {
      indent: Math.max(1, opts.indent),
      sortKeys: opts.sortKeys,
      forceQuotes: opts.forceQuotes,
      flowLevel: opts.flowLevel,
      lineWidth: opts.wrap ? 80 : -1,
      noRefs: true
    })
  } catch (error) {
    return { ok: false, value: '', notes: [], error: `写不出 YAML：${(error as Error).message}` }
  }
  if (!value.trim()) value = 'null\n'
  if (!value.endsWith('\n')) value = `${value}\n`

  // 往返自检：只有实测才能兜住 YAML 的类型推断陷阱
  try {
    const back = loadAll(value) as unknown[]
    const same = back.length === 1 && stableText(back[0]) === stableText(data)
    if (!same) {
      notes.push('往返不一致：回读后的结构和输入不完全相同，多半是纯数字键或特殊字符串，建议打开「全部加引号」')
    } else {
      notes.push('已往返验证：YAML → JSON 回读结果与输入一致')
    }
  } catch (error) {
    notes.push(`生成的 YAML 回读失败（${(error as Error).message.split('\n')[0]}），请检查数据里是否有奇怪的控制字符`)
  }
  if (!opts.forceQuotes && data && typeof data === 'object' && Object.keys(data).length === 0) {
    notes.push('空对象/空数组已写成 {} 与 []')
  }
  return { ok: true, value, notes }
}

/** 只做校验，不转换 */
export function inspectYaml(source: string): { ok: boolean; notes: string[]; error?: string } {
  if (!source.trim()) return { ok: false, notes: [], error: '输入为空' }
  try {
    const docs = loadAll(source) as unknown[]
    const notes = [`共 ${docs.length} 个文档`]
    const issues = new Set<string>()
    normalize(docs.length === 1 ? docs[0] : docs, new WeakSet(), issues)
    notes.push(...issues)
    return { ok: true, notes }
  } catch (error) {
    const message = (error as Error).message
    return { ok: false, notes: [], error: `${yamlErrorPosition(message)}${firstLine(message)}` }
  }
}
