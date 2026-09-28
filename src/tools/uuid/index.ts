export type UuidVersion = 'v4' | 'v7'

export interface UuidOptions {
  version: UuidVersion
  count: number
  upper: boolean
  hyphens: boolean
}

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

const shape = (raw: string, options: UuidOptions): string => {
  const withHyphens = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20, 32)}`
  const value = options.hyphens ? withHyphens : raw
  return options.upper ? value.toUpperCase() : value
}

export function uuidV4(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return hex(bytes)
}

/** 48 bit 毫秒时间戳 + 随机位，按时间可排序（RFC 9562）。 */
export function uuidV7(now = Date.now()): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const ms = Math.floor(now)
  bytes[0] = Math.floor(ms / 2 ** 40) & 0xff
  bytes[1] = Math.floor(ms / 2 ** 32) & 0xff
  bytes[2] = Math.floor(ms / 2 ** 24) & 0xff
  bytes[3] = Math.floor(ms / 2 ** 16) & 0xff
  bytes[4] = Math.floor(ms / 2 ** 8) & 0xff
  bytes[5] = ms & 0xff
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return hex(bytes)
}

export function generateUuids(options: UuidOptions): string[] {
  const count = Math.min(Math.max(1, Math.floor(options.count) || 1), 1000)
  const out: string[] = []
  const base = Date.now()
  for (let index = 0; index < count; index += 1) {
    // 同一批内让时间戳递增，v7 结果天然有序
    const raw = options.version === 'v7' ? uuidV7(base + index) : uuidV4()
    out.push(shape(raw, options))
  }
  return out
}

export interface UuidInfo {
  ok: boolean
  error?: string
  version?: number
  variant?: string
  timestamp?: number
}

export function analyzeUuid(value: string): UuidInfo {
  const clean = value.trim().replace(/^[{<([]|[}>)]$/g, '')
  if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(clean)) {
    return { ok: false, error: '不是合法 UUID：需要 32 个十六进制字符（可带 -）。' }
  }
  const raw = clean.replace(/-/g, '').toLowerCase()
  const version = Number.parseInt(raw[12], 16)
  const variantNibble = Number.parseInt(raw[16], 16)
  let variant = '未知'
  if ((variantNibble & 0b1100) === 0b1000) variant = 'RFC 4122'
  else if ((variantNibble & 0b1000) === 0) variant = 'NCS'
  else if ((variantNibble & 0b1110) === 0b1100) variant = 'Microsoft'

  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i += 1) bytes[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16)
  const ms = bytes[0] * 2 ** 40 + bytes[1] * 2 ** 32 + bytes[2] * 2 ** 24 + bytes[3] * 2 ** 16 + bytes[4] * 2 ** 8 + bytes[5]

  return {
    ok: true,
    version,
    variant,
    timestamp: version === 7 ? ms : undefined
  }
}

export const simpleUuid = (value: string): string => value.replace(/-/g, '').toLowerCase()
