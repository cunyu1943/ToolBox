/**
 * 行文本处理：去重 / 去空行 / 去空白 / 排序 / 反转 / 加序号 / 打乱。
 *
 * 两条与旧实现不同的硬约束：
 * - **行结束符要保留**。`split` 用 `/\r\n|\r|\n/` 会静默把 CRLF 变成 LF，粘回 Windows 文件就整体改写；
 *   这里先探测占多数的 EOL，输出时按原样拼接，并在 notes 里说明。
 * - **不静默丢数据**。每个操作都返回「改了几行」和被删掉内容的预览，去重键是否忽略空白/大小写
 *   必须由调用方显式选，不替用户猜。
 */

export type Eol = '\n' | '\r\n' | '\r'

export interface SplitResult {
  lines: string[]
  eol: Eol
  /** 输入里同时存在多种行尾（按占多数的拼接） */
  mixed: boolean
}

export function splitLines(text: string): SplitResult {
  const crlf = (text.match(/\r\n/g) || []).length
  const loneLf = (text.match(/\n/g) || []).length - crlf
  const loneCr = (text.match(/\r(?!\n)/g) || []).length
  const tally: [Eol, number][] = [['\n', loneLf], ['\r\n', crlf], ['\r', loneCr]]
  const top = tally.reduce((a, b) => (b[1] > a[1] ? b : a))
  const present = tally.filter(([, n]) => n > 0).length
  return {
    lines: text.length ? text.split(/\r\n|\r|\n/) : [],
    eol: present ? top[0] : '\n',
    mixed: present > 1
  }
}

export const joinLines = (lines: string[], eol: Eol): string => lines.join(eol)

const eolNote = (split: SplitResult): string[] =>
  split.mixed
    ? [`输入里有多种行尾，结果统一用占多数的一种（${split.eol === '\r\n' ? 'CRLF' : split.eol === '\r' ? 'CR' : 'LF'}）`]
    : []

export interface ValueReport {
  value: string
  /** 被删除的行数 */
  removed: number
  /** 被删行的预览（最多 5 条） */
  dropped: string[]
  notes: string[]
}

export type DedupeKey = 'exact' | 'trim' | 'trimCase'
export type KeepWhich = 'first' | 'last'

export interface DedupeOptions {
  key: DedupeKey
  keep: KeepWhich
}

const keyOf = (line: string, key: DedupeKey): string =>
  key === 'exact' ? line : key === 'trim' ? line.trim() : line.trim().toLowerCase()

export function dedupeLines(text: string, options: DedupeOptions): ValueReport {
  const split = splitLines(text)
  const seen = new Map<string, number>()
  const dropped: number[] = []
  split.lines.forEach((line, index) => {
    const key = keyOf(line, options.key)
    const previous = seen.get(key)
    if (previous === undefined) {
      seen.set(key, index)
      return
    }
    if (options.keep === 'first') {
      dropped.push(index)
      return
    }
    // keep === 'last'：先前保留的那一行让位给当前行
    dropped.push(previous)
    seen.set(key, index)
  })
  const removedSet = new Set(dropped)
  const kept = split.lines.filter((_, index) => !removedSet.has(index))
  const notes: string[] = [...eolNote(split)]
  if (options.key === 'trim') notes.push('去重时忽略了行首尾空白（`a` 与 `a ` 视为同一行）')
  if (options.key === 'trimCase') notes.push('去重时忽略了行首尾空白与大小写（`A` 与 `a ` 视为同一行）')
  notes.push(
    dropped.length
      ? `删掉 ${dropped.length} 行，保留 ${kept.length} 行（${options.keep === 'first' ? '保留首次出现' : '保留最后一次出现'}）`
      : '没有重复行'
  )
  return {
    value: joinLines(kept, split.eol),
    removed: dropped.length,
    dropped: dropped.slice(0, 5).map((index) => split.lines[index] as string),
    notes
  }
}

export type EmptyMode = 'empty' | 'blank'

export function removeEmptyLines(text: string, mode: EmptyMode): ValueReport {
  const split = splitLines(text)
  const kept = split.lines.filter((line) => (mode === 'empty' ? line.length > 0 : line.trim().length > 0))
  const removed = split.lines.length - kept.length
  return {
    value: joinLines(kept, split.eol),
    removed,
    dropped: [],
    notes: [
      ...eolNote(split),
      removed
        ? mode === 'blank'
          ? `删掉 ${removed} 行（含只有空格/制表符的行）`
          : `删掉 ${removed} 行真正的空行；另有 ${split.lines.filter((l) => l.length && !l.trim()).length} 行只有空白字符，按「只删空行」保留了`
        : '没有可删的空行'
    ]
  }
}

export type TrimSide = 'both' | 'start' | 'end'

export interface TrimResult {
  value: string
  changed: number
  tabs: number
  notes: string[]
}

export function trimLines(text: string, side: TrimSide): TrimResult {
  const split = splitLines(text)
  const strip = (line: string): string =>
    side === 'both' ? line.trim() : side === 'start' ? line.replace(/^\s+/, '') : line.replace(/\s+$/, '')
  const trimmed = split.lines.map(strip)
  const changed = trimmed.filter((line, index) => line !== split.lines[index]).length
  const tabs = split.lines.filter((line) => line.includes('\t')).length
  return {
    value: joinLines(trimmed, split.eol),
    changed,
    tabs,
    notes: [
      ...eolNote(split),
      changed ? `${changed} 行去掉了${side === 'both' ? '首尾' : side === 'start' ? '行首' : '行尾'}空白` : '没有需要去空白的行',
      tabs ? `${tabs} 行含制表符，只去了空白、没有把 \\t 换成空格` : ''
    ].filter(Boolean)
  }
}

export type SortMode = 'asc' | 'desc' | 'number' | 'length' | 'reverse'

export interface SortOptions {
  mode: SortMode
  unique: boolean
}

const firstNumber = (line: string): number | undefined => {
  const match = /[+-]?(?:\d+\.?\d*|\.\d+)/.exec(line)
  return match ? Number(match[0]) : undefined
}

export function sortLines(text: string, options: SortOptions): { value: string; notes: string[]; lines: number } {
  const split = splitLines(text)
  let lines = [...split.lines]
  if (options.mode === 'reverse') lines.reverse()
  else {
    const direction = options.mode === 'desc' ? -1 : 1
    const compare = (a: string, b: string): number => {
      if (options.mode === 'length') return direction * (a.length - b.length)
      if (options.mode === 'number') {
        const na = firstNumber(a)
        const nb = firstNumber(b)
        // 没有数字的行一律排在后面，避免「空 → 0」把 `abc` 塞到 `-5` 前面
        if (na === undefined && nb === undefined) return 0
        if (na === undefined) return 1
        if (nb === undefined) return -1
        return direction * (na - nb)
      }
      // 拼音排序要 Intl.Collator 带 locale，中文按 Unicode 码位（实质是笔画/区位）而不是拼音
      return direction * a.localeCompare(b, 'zh-Hans-CN')
    }
    lines = lines
      .map((line, index) => ({ line, index }))
      .sort((a, b) => compare(a.line, b.line) || a.index - b.index)
      .map((item) => item.line)
  }
  let removed = 0
  if (options.unique) {
    const seen = new Set<string>()
    const kept = lines.filter((line) => (seen.has(line) ? false : (seen.add(line), true)))
    removed = lines.length - kept.length
    lines = kept
  }
  return {
    value: joinLines(lines, split.eol),
    lines: lines.length,
    notes: [
      ...eolNote(split),
      options.mode === 'asc' || options.mode === 'desc'
        ? '中文按 Unicode 码位比较（不是拼音）；要拼音序请先转成拼音'
        : options.mode === 'number'
          ? '按每行第一个数字比较，不含数字的行排在最后'
          : options.mode === 'length'
            ? '按 UTF-16 单元数比长度，emoji 算 2'
            : '仅反转行序',
      removed ? `顺带去掉 ${removed} 行重复` : ''
    ].filter(Boolean)
  }
}

export type NumberFormat = 'dot' | 'paren' | 'plain' | 'bracket' | 'minus'

const SEPARATORS: Record<NumberFormat, (n: number) => string> = {
  dot: (n) => `${n}. `,
  paren: (n) => `${n}) `,
  plain: (n) => `${n} `,
  bracket: (n) => `[${n}] `,
  minus: () => '- '
}

export interface NumberOptions {
  start: number
  step: number
  format: NumberFormat
  /** 序号左补零到几位（0 = 不补） */
  pad: number
  skipEmpty: boolean
}

export function numberLines(text: string, options: NumberOptions): { value: string; notes: string[]; numbered: number } {
  const split = splitLines(text)
  let counter = options.start
  let numbered = 0
  const width = Math.max(options.pad, String(options.start + split.lines.length * options.step).length)
  const lines = split.lines.map((line) => {
    if (options.skipEmpty && !line.trim()) return line
    const label = SEPARATORS[options.format](counter)
    const padded =
      options.pad > 0 && options.format !== 'minus'
        ? label.replace(/\d+/, (digits) => digits.padStart(options.pad, '0'))
        : label
    counter += options.step
    numbered += 1
    return `${padded}${line}`
  })
  const notes: string[] = [...eolNote(split)]
  if (options.pad > 0 && width > options.pad) notes.push(`序号超过 ${options.pad} 位，实际补到 ${width} 位`)
  if (options.skipEmpty) notes.push('空白行没有编号，也不消耗序号')
  if (options.format === 'minus') notes.push('`- ` 是 Markdown 无序列表写法，本身不带序号数字')
  return { value: joinLines(lines, split.eol), notes, numbered }
}

/** mulberry32：可复现的 32 位种子随机，打乱结果能进断言 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleLines(text: string, seed: number): { value: string; seed: number; notes: string[] } {
  const split = splitLines(text)
  const lines = [...split.lines]
  const rng = seededRandom(seed)
  for (let i = lines.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = lines[i] as string
    lines[i] = lines[j] as string
    lines[j] = tmp
  }
  return {
    value: joinLines(lines, split.eol),
    seed,
    notes: [...eolNote(split), `同一颗种子（${seed}）必得同一个顺序，换种子即换结果`]
  }
}

export interface LineStats {
  lines: number
  nonEmpty: number
  unique: number
  longest: number
  characters: number
  words: number
}

export function lineStats(text: string): LineStats {
  const { lines } = splitLines(text)
  const nonEmpty = lines.filter((line) => line.trim())
  return {
    lines: text.length ? lines.length : 0,
    nonEmpty: nonEmpty.length,
    unique: new Set(lines).size,
    longest: lines.reduce((max, line) => Math.max(max, line.length), 0),
    characters: text.length,
    words: nonEmpty.reduce((sum, line) => sum + (line.trim().match(/\S+/g) || []).length, 0)
  }
}

export const LINE_SAMPLES: { label: string; value: string }[] = [
  { label: '重复行', value: 'apple\nbanana\napple\nCherry\nbanana' },
  { label: '带空行与缩进', value: '  first\r\n\r\n\tsecond\r\n   \r\nthird' },
  { label: '数字开头', value: '10. ten\n9 nine\n100 hundred\nabc' }
]
