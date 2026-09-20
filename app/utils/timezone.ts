/**
 * 时区相关纯函数：不依赖任何日期库，基于 Intl.DateTimeFormat 的 formatToParts，
 * 结果确定、可单测。时间戳(epoch)始终按 UTC 定义，展示/解析时可指定时区。
 */

export interface TimezoneOption {
  value: string
  label: string
}

/** 常用时区，默认中国标准时间 */
export const TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai（北京时间）' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo（东京）' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore（新加坡）' },
  { value: 'Europe/London', label: 'Europe/London（伦敦）' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin（柏林）' },
  { value: 'America/New_York', label: 'America/New_York（纽约）' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles（洛杉矶）' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney（悉尼）' }
]

/** 把某 instant 在指定时区的墙上时间，折算成「当作 UTC 解释」的毫秒数（秒级精度） */
function wallClockAsUtc(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(new Date(instantMs))
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? 0)
  let hour = get('hour')
  if (hour === 24) hour = 0 // 某些环境 hour12:false 的午夜返回 24
  return Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
}

/** 指定时区在某时刻相对 UTC 的偏移（毫秒，向东为正） */
export function zoneOffsetMs(instantMs: number, timeZone: string): number {
  return wallClockAsUtc(instantMs, timeZone) - wallClockAsUtc(instantMs, 'UTC')
}

/** epoch 毫秒 → 指定时区的 'YYYY-MM-DD HH:mm:ss'（墙上时间） */
export function formatInZone(instantMs: number, timeZone: string): string {
  if (!Number.isFinite(instantMs)) return ''
  const d = new Date(wallClockAsUtc(instantMs, timeZone))
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** 指定时区的墙上时间分量 → epoch 毫秒（两遍修正处理夏令时） */
export function zonedComponentsToMs(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  timeZone: string
): number {
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s)
  let ts = asUtc - zoneOffsetMs(asUtc, timeZone)
  ts = asUtc - zoneOffsetMs(ts, timeZone) // 用第一次结果再校准，规避 DST 边界
  return ts
}

const DT_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/

/**
 * 解析 'YYYY-MM-DD HH:mm[:ss]'（缺省秒为 0）为指定时区的 epoch 毫秒。
 * 非法返回 null。
 */
export function zonedStringToMs(input: string, timeZone: string): number | null {
  const m = DT_RE.exec(input.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const h = Number(m[4])
  const mi = Number(m[5])
  const s = m[6] ? Number(m[6]) : 0
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null
  return zonedComponentsToMs(y, mo, d, h, mi, s, timeZone)
}

/** 秒级时间戳字符串 → 毫秒；>=1e12 视为毫秒，否则按秒 */
export function normalizeToMs(value: number): number {
  return Math.abs(value) >= 1e12 ? value : value * 1000
}
