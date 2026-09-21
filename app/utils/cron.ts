/**
 * Cron 表达式（标准 5 字段：分 时 日 月 周）解析、中文描述与后续执行时间推算。
 * 支持 * 、? （视同 *）、列表 a,b、范围 a-b、步长 *\/n、a-b\/n。
 * 周字段 0~7（7 视为周日）。日与周同时受限时按「或」匹配（与 vixie cron 一致）。
 */

export interface CronField {
  label: string
  expr: string
  values: number[]
  /** 是否匹配任意值（* 或 ?） */
  any: boolean
}

export type CronParseResult =
  | { ok: true; fields: CronField[]; describe: string }
  | { ok: false; error: string }

const FIELD_DEFS: { label: string; min: number; max: number; unit: string }[] = [
  { label: '分钟', min: 0, max: 59, unit: '分' },
  { label: '小时', min: 0, max: 23, unit: '时' },
  { label: '日', min: 1, max: 31, unit: '日' },
  { label: '月份', min: 1, max: 12, unit: '月' },
  { label: '星期', min: 0, max: 6, unit: '周' }
]

const DOW_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function parseField(expr: string, min: number, max: number): number[] | null {
  const values = new Set<number>()
  for (const part of expr.split(',')) {
    if (!part) return null
    let body = part
    let step = 1
    const slash = part.split('/')
    if (slash.length === 2) {
      body = slash[0]!
      if (!/^\d+$/.test(slash[1]!)) return null
      step = Number(slash[1])
      if (step < 1) return null
    } else if (slash.length > 2) {
      return null
    }
    let lo = min
    let hi = max
    if (body !== '*' && body !== '?') {
      const range = body.split('-')
      if (range.length === 2) {
        if (!/^\d+$/.test(range[0]!) || !/^\d+$/.test(range[1]!)) return null
        lo = Number(range[0])
        hi = Number(range[1])
      } else if (/^\d+$/.test(body)) {
        if (slash.length === 2) lo = Number(body) // a-b/n 或 n/n 中起点即范围
        else lo = hi = Number(body)
      } else {
        return null
      }
    }
    if (lo > hi || hi > max || lo < min) return null
    for (let v = lo; v <= hi; v += step) values.add(v)
  }
  return [...values].sort((a, b) => a - b)
}

/** 解析 5 字段 cron 表达式 */
export function parseCron(expr: string): CronParseResult {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) {
    return { ok: false, error: '应为 5 个字段：分 时 日 月 周（空格分隔）' }
  }
  const fields: CronField[] = []
  for (let i = 0; i < 5; i++) {
    const def = FIELD_DEFS[i]!
    let raw = parts[i]!
    if (i === 4) raw = raw.replace(/^7$/, '0') // 7 = 周日
    const values = parseField(raw, def.min, def.max)
    if (!values) return { ok: false, error: `「${def.label}」字段非法：${parts[i]}` }
    fields.push({ label: def.label, expr: parts[i]!, values, any: raw === '*' || raw === '?' })
  }
  return { ok: true, fields, describe: describeFields(fields) }
}

function describeFields(fields: CronField[]): string {
  return fields.map((f, i) => {
    const unit = FIELD_DEFS[i]!.unit
    if (f.any) return `${f.label}任意`
    if (f.expr.includes('/')) return `每 ${f.expr.split('/')[1]} ${unit}`
    if (i === 4) return f.values.map(v => DOW_NAMES[v]).join('、')
    if (f.values.length === 1) return `${f.label}固定 ${f.values[0]}`
    return `${f.label}指定 ${f.values.length} 个值`
  }).join('，')
}

/** 从 from 之后（不含 from 当分钟）推算后 count 次执行时间。非法表达式返回空数组。 */
export function nextRuns(expr: string, from: Date, count = 5): Date[] {
  const parsed = parseCron(expr)
  if (!parsed.ok) return []
  const [minute, hour, dom, month, dow] = parsed.fields.map(f => new Set(f.values))
  const domAny = parsed.fields[2]!.any
  const dowAny = parsed.fields[4]!.any
  const runs: Date[] = []
  // 按天推进（最多回看 4 年），命中日期后再枚举当天的 时:分
  const start = new Date(from.getTime())
  start.setSeconds(0, 0)
  for (let d = 0; d < 1461 && runs.length < count; d++) {
    const day = new Date(start.getTime() + d * 86400000)
    if (!month!.has(day.getMonth() + 1)) continue
    const domHit = dom!.has(day.getDate())
    const dowHit = dow!.has(day.getDay())
    const dayHit = domAny && dowAny
      ? true
      : domAny
        ? dowHit
        : dowAny
          ? domHit
          : domHit || dowHit // 日、周同时受限时取「或」
    if (!dayHit) continue
    for (let h = 0; h < 24 && runs.length < count; h++) {
      if (!hour!.has(h)) continue
      for (let m = 0; m < 60 && runs.length < count; m++) {
        if (!minute!.has(m)) continue
        const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
        if (t.getTime() > start.getTime()) runs.push(t)
      }
    }
  }
  return runs
}

/** 常用预设，供界面快捷按钮使用 */
export const CRON_PRESETS: { label: string; expr: string }[] = [
  { label: '每分钟', expr: '* * * * *' },
  { label: '每 5 分钟', expr: '*/5 * * * *' },
  { label: '每天零点', expr: '0 0 * * *' },
  { label: '工作日九点', expr: '0 9 * * 1-5' },
  { label: '每月 1 号', expr: '0 0 1 * *' },
  { label: '每 15 分钟整点', expr: '*/15 * * * *' }
]
