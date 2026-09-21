/**
 * 行级文本差异对比（LCS 最短编辑路径）。
 * 先裁剪公共前后缀，再对剩余区域跑 O(n*m) DP，超限则退化为全删全增。
 */

export type DiffOp = 'same' | 'add' | 'del'

export interface DiffLine {
  op: DiffOp
  /** 左侧行号（same/del 有值），1 起 */
  oldNo: number | null
  /** 右侧行号（same/add 有值），1 起 */
  newNo: number | null
  text: string
}

export interface DiffResult {
  lines: DiffLine[]
  added: number
  removed: number
  unchanged: number
}

/** DP 表单元格上限，超过则退化（约 4MB，防止页面卡死） */
const MAX_CELLS = 1_000_000

function splitLines(text: string): string[] {
  const norm = text.replace(/\r\n?/g, '\n')
  if (norm === '') return []
  return norm.split('\n')
}

export function diffLines(oldText: string, newText: string): DiffResult {
  const a = splitLines(oldText)
  const b = splitLines(newText)

  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) tail++

  const midA = a.slice(head, a.length - tail)
  const midB = b.slice(head, b.length - tail)

  // 在 midA/midB 内求 LCS 编辑脚本，行号从 head+1 起算
  let ops: { op: DiffOp; aIdx: number | null; bIdx: number | null }[] = []
  if (midA.length * midB.length > MAX_CELLS) {
    ops = [
      ...midA.map((_, i) => ({ op: 'del' as DiffOp, aIdx: i, bIdx: null })),
      ...midB.map((_, j) => ({ op: 'add' as DiffOp, aIdx: null, bIdx: j }))
    ]
  } else {
    // dp[i][j] = midA[i..] 与 midB[j..] 的 LCS 长度
    const dp: number[][] = Array.from({ length: midA.length + 1 }, () =>
      new Array<number>(midB.length + 1).fill(0)
    )
    for (let i = midA.length - 1; i >= 0; i--) {
      for (let j = midB.length - 1; j >= 0; j--) {
        dp[i]![j] =
          midA[i] === midB[j]
            ? dp[i + 1]![j + 1]! + 1
            : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
      }
    }
    let i = 0
    let j = 0
    while (i < midA.length && j < midB.length) {
      if (midA[i] === midB[j]) {
        ops.push({ op: 'same', aIdx: i, bIdx: j })
        i++
        j++
      } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
        ops.push({ op: 'del', aIdx: i, bIdx: null })
        i++
      } else {
        ops.push({ op: 'add', aIdx: null, bIdx: j })
        j++
      }
    }
    while (i < midA.length) {
      ops.push({ op: 'del', aIdx: i, bIdx: null })
      i++
    }
    while (j < midB.length) {
      ops.push({ op: 'add', aIdx: null, bIdx: j })
      j++
    }
  }

  const lines: DiffLine[] = []
  for (let k = 0; k < head; k++) {
    lines.push({ op: 'same', oldNo: k + 1, newNo: k + 1, text: a[k]! })
  }
  let added = 0
  let removed = 0
  for (const o of ops) {
    lines.push({
      op: o.op,
      oldNo: o.aIdx === null ? null : head + o.aIdx + 1,
      newNo: o.bIdx === null ? null : head + o.bIdx + 1,
      text: o.aIdx !== null ? midA[o.aIdx]! : midB[o.bIdx!]!
    })
    if (o.op === 'add') added++
    else if (o.op === 'del') removed++
  }
  for (let k = 0; k < tail; k++) {
    const ai = a.length - tail + k
    lines.push({
      op: 'same',
      oldNo: ai + 1,
      newNo: b.length - tail + k + 1,
      text: a[ai]!
    })
  }

  return { lines, added, removed, unchanged: head + tail + ops.filter(o => o.op === 'same').length }
}

/** 生成统一差异格式（unified diff，无上下文合并，0 行上下文） */
export function toUnifiedDiff(result: DiffResult): string {
  return result.lines
    .map(l =>
      l.op === 'add' ? `+ ${l.text}` : l.op === 'del' ? `- ${l.text}` : `  ${l.text}`
    )
    .join('\n')
}
