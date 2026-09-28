/** 逐行文本差异：先裁掉公共前后缀，再对中间段做 LCS 动态规划。 */

export type DiffKind = 'same' | 'add' | 'del'

export interface DiffRow {
  kind: DiffKind
  text: string
  /** 1-based；null 表示该行在这一侧不存在 */
  leftNo: number | null
  rightNo: number | null
}

export interface DiffOptions {
  ignoreCase?: boolean
  ignoreWhitespace?: boolean
}

export interface DiffResult {
  rows: DiffRow[]
  added: number
  removed: number
  same: number
  /** 输入过大时会给出说明，rows 退化为「全删 + 全增」 */
  error?: string
}

/** DP 单元上限，约 16 MB 的 Uint32Array */
const MAX_CELLS = 4_000_000

export const splitLines = (text: string): string[] => {
  if (text === '') return []
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

const keyOf = (line: string, options: DiffOptions): string => {
  let key = line
  if (options.ignoreWhitespace) key = key.replace(/\s+/g, ' ').trim()
  if (options.ignoreCase) key = key.toLowerCase()
  return key
}

function lcsRows(
  left: string[],
  right: string[],
  leftOffset: number,
  rightOffset: number,
  options: DiffOptions
): DiffRow[] {
  const n = left.length
  const m = right.length
  const keys = right.map((line) => keyOf(line, options))
  const width = m + 1
  const table = new Uint32Array((n + 1) * width)

  for (let i = n - 1; i >= 0; i--) {
    const key = keyOf(left[i]!, options)
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        key === keys[j]
          ? table[(i + 1) * width + j + 1]! + 1
          : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!)
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (keyOf(left[i]!, options) === keys[j]) {
      rows.push({ kind: 'same', text: left[i]!, leftNo: leftOffset + i + 1, rightNo: rightOffset + j + 1 })
      i++
      j++
    } else if (table[(i + 1) * width + j]! >= table[i * width + j + 1]!) {
      rows.push({ kind: 'del', text: left[i]!, leftNo: leftOffset + i + 1, rightNo: null })
      i++
    } else {
      rows.push({ kind: 'add', text: right[j]!, leftNo: null, rightNo: rightOffset + j + 1 })
      j++
    }
  }
  while (i < n) {
    rows.push({ kind: 'del', text: left[i]!, leftNo: leftOffset + i + 1, rightNo: null })
    i++
  }
  while (j < m) {
    rows.push({ kind: 'add', text: right[j]!, leftNo: null, rightNo: rightOffset + j + 1 })
    j++
  }
  return rows
}

export function diffLines(leftText: string, rightText: string, options: DiffOptions = {}): DiffResult {
  const left = splitLines(leftText)
  const right = splitLines(rightText)

  let prefix = 0
  while (prefix < left.length && prefix < right.length && keyOf(left[prefix]!, options) === keyOf(right[prefix]!, options))
    prefix++

  let suffix = 0
  while (
    suffix < left.length - prefix &&
    suffix < right.length - prefix &&
    keyOf(left[left.length - 1 - suffix]!, options) === keyOf(right[right.length - 1 - suffix]!, options)
  )
    suffix++

  const leftMiddle = left.slice(prefix, left.length - suffix)
  const rightMiddle = right.slice(prefix, right.length - suffix)
  const cells = (leftMiddle.length + 1) * (rightMiddle.length + 1)

  const head: DiffRow[] = left.slice(0, prefix).map((line, index) => ({
    kind: 'same' as const,
    text: line,
    leftNo: index + 1,
    rightNo: index + 1
  }))
  const tailStart = left.length - suffix
  const tail: DiffRow[] = left.slice(tailStart).map((line, index) => ({
    kind: 'same' as const,
    text: line,
    leftNo: tailStart + index + 1,
    rightNo: right.length - suffix + index + 1
  }))

  if (cells > MAX_CELLS) {
    return {
      rows: [
        ...head,
        ...leftMiddle.map((text, index) => ({
          kind: 'del' as const,
          text,
          leftNo: prefix + index + 1,
          rightNo: null
        })),
        ...rightMiddle.map((text, index) => ({
          kind: 'add' as const,
          text,
          leftNo: null,
          rightNo: prefix + index + 1
        })),
        ...tail
      ],
      added: rightMiddle.length,
      removed: leftMiddle.length,
      same: head.length + tail.length,
      error: `差异区间过大（${leftMiddle.length} × ${rightMiddle.length} 行），已退化为整体替换，请缩小比较范围`
    }
  }

  const rows = [
    ...head,
    ...lcsRows(leftMiddle, rightMiddle, prefix, prefix, options),
    ...tail
  ]

  return {
    rows,
    added: rows.filter((row) => row.kind === 'add').length,
    removed: rows.filter((row) => row.kind === 'del').length,
    same: rows.filter((row) => row.kind === 'same').length
  }
}

export interface PatchOptions {
  leftName?: string
  rightName?: string
  /** 每个 hunk 上下保留的相同行数 */
  context?: number
}

export function toUnifiedPatch(rows: DiffRow[], options: PatchOptions = {}): string {
  const context = options.context ?? 3
  const changed = rows.reduce<number[]>((acc, row, index) => {
    if (row.kind !== 'same') acc.push(index)
    return acc
  }, [])
  if (changed.length === 0) return ''

  const groups: number[][] = []
  for (const index of changed) {
    const last = groups[groups.length - 1]
    if (last && index - last[last.length - 1]! <= context * 2) last.push(index)
    else groups.push([index])
  }

  const hunks = groups.map((group) => {
    const from = Math.max(0, group[0]! - context)
    const to = Math.min(rows.length - 1, group[group.length - 1]! + context)
    return { from, to }
  })

  // 预统计每行之前已消费的左右行数，用于 @@ 头
  const leftBefore: number[] = []
  const rightBefore: number[] = []
  let lc = 0
  let rc = 0
  for (const row of rows) {
    leftBefore.push(lc)
    rightBefore.push(rc)
    if (row.kind !== 'add') lc++
    if (row.kind !== 'del') rc++
  }

  const lines = [
    `--- ${options.leftName ?? 'a'}`,
    `+++ ${options.rightName ?? 'b'}`
  ]

  for (const hunk of hunks) {
    const slice = rows.slice(hunk.from, hunk.to + 1)
    const oldCount = slice.filter((row) => row.kind !== 'add').length
    const newCount = slice.filter((row) => row.kind !== 'del').length
    const oldStart = leftBefore[hunk.from]! + 1
    const newStart = rightBefore[hunk.from]! + 1
    lines.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)
    for (const row of slice) {
      lines.push(`${row.kind === 'same' ? ' ' : row.kind === 'add' ? '+' : '-'}${row.text}`)
    }
  }

  return `${lines.join('\n')}\n`
}
