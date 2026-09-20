/**
 * 日期计算纯函数。为避免时区/夏令时漂移，日期差值与加减都基于 UTC 日历日。
 * 输入统一为 'YYYY-MM-DD' 字符串。
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** 解析 YYYY-MM-DD，非法返回 null */
export function parseDate(s: string): { y: number; m: number; d: number } | null {
  const m = DATE_RE.exec(s.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null // 如 2 月 30 日
  return { y, m: mo, d }
}

function toUtcDay(s: { y: number; m: number; d: number }): number {
  return Date.UTC(s.y, s.m - 1, s.d) / 86_400_000
}

/** b - a 的整天差（可为负）。任一非法返回 null */
export function daysBetween(a: string, b: string): number | null {
  const pa = parseDate(a)
  const pb = parseDate(b)
  if (!pa || !pb) return null
  return Math.round(toUtcDay(pb) - toUtcDay(pa))
}

/** 日期加减天数，返回 YYYY-MM-DD；非法返回 null */
export function addDays(date: string, days: number): string | null {
  const p = parseDate(date)
  if (!p || !Number.isFinite(days)) return null
  const dt = new Date(Date.UTC(p.y, p.m - 1, p.d))
  dt.setUTCDate(dt.getUTCDate() + Math.round(days))
  return toISODate(dt)
}

function toISODate(dt: Date): string {
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysInMonth(y: number, m1: number): number {
  // m1: 1~12
  return new Date(Date.UTC(y, m1, 0)).getUTCDate()
}

/** 在给定日期上加 months 个整月，日超出目标月长度时向月末夹紧 */
function addMonths(s: { y: number; m: number; d: number }, months: number) {
  const total = s.y * 12 + (s.m - 1) + months
  const y = Math.floor(total / 12)
  const m1 = (total % 12) + 1
  const d = Math.min(s.d, daysInMonth(y, m1))
  return { y, m: m1, d }
}

/** 两个日期的年/月/日差（b 晚于 a 时为正），用于「相差 X 年 Y 个月 Z 天」 */
export function diffComponents(
  a: string,
  b: string
): { years: number; months: number; days: number } | null {
  const pa = parseDate(a)
  const pb = parseDate(b)
  if (!pa || !pb) return null
  const sign = toUtcDay(pb) >= toUtcDay(pa) ? 1 : -1
  const [s, t] = sign === 1 ? [pa, pb] : [pb, pa]

  // 先估整月数，再按锚点日校准，最后数余天，规避月末夹紧带来的负天数
  let months = (t.y - s.y) * 12 + (t.m - s.m)
  if (t.d < s.d) months -= 1
  let anchor = addMonths(s, months)
  let days = Math.round(toUtcDay(t) - toUtcDay(anchor))
  if (days < 0) {
    months -= 1
    anchor = addMonths(s, months)
    days = Math.round(toUtcDay(t) - toUtcDay(anchor))
  }
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  return { years: (years * sign) || 0, months: (remMonths * sign) || 0, days: (days * sign) || 0 }
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 星期几（中文），非法返回 null */
export function weekday(date: string): string | null {
  const p = parseDate(date)
  if (!p) return null
  return WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] ?? null
}
