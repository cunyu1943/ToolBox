/**
 * 百分比计算：四类常见问法，全部给「算式 + 结果」，方便核对而不是只甩一个数。
 *
 * 取数一律经 `round(x, 10)`，抹掉 `0.1 + 0.2` 这类二进制浮点噪声；
 * 展示精度由页面决定。除零不抛错，返回 `null` 让界面给提示。
 */

const round = (value: number, digits = 10): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export interface PercentLine {
  /** 展示用算式，如 `15% × 200 = 30` */
  formula: string
  value: number
}

export interface PercentResult {
  ok: boolean
  error?: string
  lines: PercentLine[]
  /** 0–100 的占比，用于画进度条；不适用时为 null */
  barPercent: number | null
  notes: string[]
}

export type PercentMode = 'of' | 'what-percent' | 'change' | 'reverse'

/** a% 的 b 是多少 */
export function partOf(percent: number, value: number): number | null {
  if (!Number.isFinite(percent) || !Number.isFinite(value)) return null
  return round((percent / 100) * value)
}

/** x 是 y 的百分之几；y = 0 无定义 */
export function percentOf(x: number, y: number): number | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || y === 0) return null
  return round((x / y) * 100)
}

/** 从 a 变到 b 的变化百分比；a = 0 无定义 */
export function changePercent(a: number, b: number): { percent: number; absolute: number } | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null
  return { percent: round(((b - a) / a) * 100), absolute: round(b - a) }
}

/** 已知「增加/减少 p% 之后得到 v」，反推原数 */
export function reversePercent(
  after: number,
  percent: number,
  direction: 'increase' | 'decrease'
): number | null {
  const factor = direction === 'increase' ? 1 + percent / 100 : 1 - percent / 100
  if (!Number.isFinite(after) || !Number.isFinite(percent) || factor === 0) return null
  return round(after / factor)
}

export function computePercent(mode: PercentMode, a: number, b: number): PercentResult {
  const fail = (error: string): PercentResult => ({ ok: false, error, lines: [], barPercent: null, notes: [] })
  if ([a, b].some((value) => !Number.isFinite(value))) return fail('请输入有效数字')

  switch (mode) {
    case 'of': {
      const value = partOf(a, b)
      if (value === null) return fail('计算失败')
      return { ok: true, lines: [{ formula: `${a}% × ${b} = ${value}`, value }], barPercent: a, notes: [] }
    }
    case 'what-percent': {
      const percent = percentOf(a, b)
      if (percent === null) return fail('作为基准的数不能为 0')
      return {
        ok: true,
        lines: [{ formula: `${a} ÷ ${b} × 100 = ${percent}%`, value: percent }],
        barPercent: Math.max(0, Math.min(100, percent)),
        notes: percent > 100 ? [`结果超过 100%：${a} 比基准 ${b} 大出 ${round(percent - 100)}%。`] : []
      }
    }
    case 'change': {
      const changed = changePercent(a, b)
      if (changed === null) return fail('起始值不能为 0（变化率没有基准）')
      const { percent, absolute } = changed
      const notes: string[] = []
      if (percent !== 0) {
        const back = changePercent(b, a)
        if (back) {
          notes.push(
            `反向看：从 ${b} 回到 ${a} 是 ${back.percent > 0 ? '+' : ''}${back.percent}%。涨了再跌回去不等于跌同样的百分比，基数变了。`
          )
        }
      }
      return {
        ok: true,
        lines: [
          { formula: `(${b} − ${a}) ÷ ${a} × 100 = ${percent}%`, value: percent },
          { formula: `绝对变化 ${b} − ${a} = ${absolute}`, value: absolute }
        ],
        barPercent: null,
        notes
      }
    }
    case 'reverse': {
      const before = reversePercent(b, a, 'increase')
      const after = reversePercent(b, a, 'decrease')
      const lines: PercentLine[] = []
      if (before !== null) {
        lines.push({ formula: `原数增加 ${a}% 后是 ${b} → 原数 = ${b} ÷ ${round(1 + a / 100)} = ${before}`, value: before })
      }
      if (after !== null) {
        lines.push({ formula: `原数减少 ${a}% 后是 ${b} → 原数 = ${b} ÷ ${round(1 - a / 100)} = ${after}`, value: after })
      }
      if (!lines.length) return fail('该百分比下无法反推（分母为 0）')
      return { ok: true, lines, barPercent: null, notes: ['「增加 p% 后」与「减少 p% 后」两种解释都给了，按题意取一条。'] }
    }
  }
}

export const PERCENT_MODES: { label: string; value: PercentMode; a: string; b: string; hint: string }[] = [
  { label: '求一个数的百分之几', value: 'of', a: '百分比（%）', b: '数值', hint: '如 15% 的 200 是多少' },
  { label: '求占比', value: 'what-percent', a: '部分', b: '整体', hint: '如 30 是 120 的百分之几' },
  { label: '求变化率', value: 'change', a: '起始值', b: '结束值', hint: '如 从 80 涨到 100 涨了多少 %' },
  { label: '反推原数', value: 'reverse', a: '百分比（%）', b: '变化后的数', hint: '如 加了 13% 增值税后是 1130，原价多少' }
]
