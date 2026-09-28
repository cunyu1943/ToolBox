export type StampUnit = 's' | 'ms'

export interface Breakdown {
  label: string
  value: string
}

export interface DecodedStamp {
  ok: boolean
  ms?: number
  error?: string
  iso?: string
  local?: string
  utc?: string
  relative?: string
  breakdown?: Breakdown[]
}

export const commonZones = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'UTC',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles'
] as const

/** 1e12 以上按毫秒解释，否则按秒；用于「自动识别位数」。 */
export function guessUnit(value: number): StampUnit {
  return Math.abs(value) >= 1e12 ? 'ms' : 's'
}

export function toMs(value: number, unit: StampUnit): number {
  return unit === 's' ? Math.round(value * 1000) : Math.round(value)
}

export function formatInZone(ms: number, timeZone: string, locale = 'zh-CN'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'short'
    }).format(new Date(ms))
  } catch {
    return '（无效时区）'
  }
}

export function relativeTo(ms: number, now = Date.now()): string {
  const diff = ms - now
  const abs = Math.abs(diff)
  const units: [number, string][] = [
    [1000, '秒'],
    [60_000, '分钟'],
    [3_600_000, '小时'],
    [86_400_000, '天'],
    [2_592_000_000, '月'],
    [31_536_000_000, '年']
  ]
  if (abs < 1000) return diff === 0 ? '此刻' : '不到 1 秒'
  let chosen = units[0]
  for (const unit of units) {
    if (abs >= unit[0]) chosen = unit
  }
  const amount = Math.round(abs / chosen[0])
  return `${amount} ${chosen[1]}${diff < 0 ? '前' : '后'}`
}

export function decodeTimestamp(raw: string, unit: StampUnit | 'auto'): DecodedStamp {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: '请输入时间戳（纯数字）。' }
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, error: '时间戳应只含数字与可选的负号，例如 1760000000 或 1760000000000。' }
  }
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value)) return { ok: false, error: '数字超出 JS 安全整数范围（2^53-1）。' }

  const resolved: StampUnit = unit === 'auto' ? guessUnit(value) : unit
  const ms = toMs(value, resolved)
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return { ok: false, error: '换算结果不是有效日期。' }

  return {
    ok: true,
    ms,
    iso: date.toISOString(),
    local: formatInZone(ms, Intl.DateTimeFormat().resolvedOptions().timeZone),
    utc: formatInZone(ms, 'UTC'),
    relative: relativeTo(ms),
    breakdown: [
      { label: '秒 (s)', value: String(Math.floor(ms / 1000)) },
      { label: '毫秒 (ms)', value: String(ms) },
      { label: 'ISO 8601', value: date.toISOString() },
      { label: 'Unix 纪元后天数', value: (ms / 86_400_000).toFixed(3) }
    ]
  }
}

/** 支持 `2026-09-23 08:30:00`、`2026-09-23`、ISO 串与时区串。 */
export function encodeDate(raw: string): { ok: boolean; ms?: number; error?: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: '请输入日期时间。' }
  if (trimmed.toLowerCase() === 'now') return { ok: true, ms: Date.now() }

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}${/:\d{2}/.test(trimmed) ? '' : ':00'}`
    : trimmed
  const ms = Date.parse(normalized)
  if (Number.isNaN(ms)) {
    return {
      ok: false,
      error: '无法识别的日期。可用格式：2026-09-23、2026-09-23 08:30:00、2026-09-23T08:30:00+08:00、now。'
    }
  }
  return { ok: true, ms }
}

export function humanizeDuration(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  const d = Math.floor(total / 86_400)
  const h = Math.floor((total % 86_400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [d ? `${d} 天` : '', h ? `${h} 小时` : '', m ? `${m} 分` : '', `${s} 秒`].filter(Boolean).join(' ')
}
