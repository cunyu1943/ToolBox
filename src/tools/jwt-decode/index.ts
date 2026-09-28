export interface JwtSegment {
  raw: string
  json: string
  value: Record<string, unknown>
}

export interface JwtClaim {
  key: string
  label: string
  rendered: string
  /** exp/iat/nbf 才有：本地时间串 */
  at?: Date
  /** exp 已过期 / nbf 尚未生效；其余声明为 undefined */
  status?: 'expired' | 'not-yet'
  secondsLeft?: number
}

export interface JwtDecodeResult {
  ok: boolean
  error?: string
  header?: JwtSegment
  payload?: JwtSegment
  signature?: string
  algorithm?: string
  tokenType?: string
  claims?: JwtClaim[]
  segmentCount?: number
}

const CLAIM_LABELS: Record<string, string> = {
  iss: '签发者 Issuer',
  sub: '主体 Subject',
  aud: '受众 Audience',
  exp: '过期时间 Expires',
  nbf: '生效时间 Not Before',
  iat: '签发时间 Issued At',
  jti: '标识 JWT ID'
}

/** 时间日期类工具共用的秒级时间戳判据（键名小写、值像是秒/毫秒整数） */
const DATE_CLAIMS = new Set(['exp', 'iat', 'nbf', 'auth_time', 'updated_at'])

export function decodeSegment(segment: string): { ok: boolean; text?: string; error?: string } {
  const clean = segment.replace(/\s+/g, '')
  if (!clean) return { ok: false, error: '段为空' }
  if (!/^[A-Za-z0-9\-_]*={0,2}$/.test(clean)) {
    return { ok: false, error: '段含有 base64url 之外的字符（只允许 A-Z a-z 0-9 - _ 与可选的 = 填充）' }
  }
  const base64 = clean.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    return { ok: false, error: 'base64url 解码失败，令牌可能被截断' }
  }
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return { ok: true, text: new TextDecoder('latin1').decode(bytes) }
  }
}

function parseObject(text: string): { ok: boolean; value?: Record<string, unknown>; json?: string; error?: string } {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, error: '段内容不是合法 JSON（JWT 的 header/payload 必须是 JSON 对象）' }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: '段内容不是 JSON 对象' }
  }
  return { ok: true, value: value as Record<string, unknown>, json: JSON.stringify(value, null, 2) }
}

export function decodeJwt(input: string): JwtDecodeResult {
  const trimmed = input.trim().replace(/^Bearer\s+/i, '')
  if (!trimmed) return { ok: false, error: '粘贴的令牌为空' }
  const parts = trimmed.split('.')
  if (parts.length < 2) {
    return { ok: false, error: 'JWT 应为「header.payload.signature」点分结构，实际只找到 1 段' }
  }
  if (parts.length > 3) {
    return { ok: false, error: `点分段数为 ${parts.length}，超出 JWT 的 3 段上限` }
  }
  const [head, body, signature = ''] = parts as [string, string, string]

  const segments = [decodeSegment(head), decodeSegment(body)]
  for (const entry of segments) {
    if (!entry.ok) return { ok: false, error: entry.error ?? '段解码失败' }
  }
  const objects = segments.map((entry) => parseObject(entry.text as string))
  for (const entry of objects) {
    if (!entry.ok) return { ok: false, error: entry.error ?? '段解析失败' }
  }

  const header = objects[0] as { value: Record<string, unknown>; json: string }
  const payload = objects[1] as { value: Record<string, unknown>; json: string }
  const alg = typeof header.value.alg === 'string' ? header.value.alg : undefined
  const typ = typeof header.value.typ === 'string' ? header.value.typ : undefined

  return {
    ok: true,
    header: { raw: head, json: header.json, value: header.value },
    payload: { raw: body, json: payload.json, value: payload.value },
    signature,
    algorithm: alg,
    tokenType: typ,
    claims: describeClaims(payload.value),
    segmentCount: parts.length
  }
}

function describeClaims(payload: Record<string, unknown>): JwtClaim[] {
  const now = Date.now()
  return Object.entries(payload).map(([key, value]) => {
    const label = CLAIM_LABELS[key] ?? key
    if (DATE_CLAIMS.has(key) && typeof value === 'number' && Number.isFinite(value)) {
      // 1e12 以上按毫秒处理：秒级时间戳到公元 33658 年才会越过该阈值
      const ms = value >= 1e12 ? value : value * 1000
      const at = new Date(ms)
      const secondsLeft = Math.round((ms - now) / 1000)
      return {
        key,
        label,
        rendered: `${formatMs(ms)}（${relativeText(secondsLeft)}）`,
        at,
        status: key === 'exp' && ms < now ? 'expired' : key === 'nbf' && ms > now ? 'not-yet' : undefined,
        secondsLeft
      }
    }
    return { key, label, rendered: renderValue(value) }
  })
}

function renderValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function formatMs(ms: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return '无效时间'
  return date.toLocaleString('zh-CN', { hour12: false })
}

/** 供「相对时间」文案复用：正数表示还剩，负数表示已过去 */
export function relativeText(seconds: number): string {
  const abs = Math.abs(seconds)
  const units: [number, string][] = [
    [31536000, '年'],
    [2592000, '个月'],
    [86400, '天'],
    [3600, '小时'],
    [60, '分钟'],
    [1, '秒']
  ]
  const hit = units.find(([size]) => abs >= size)
  if (!hit) return '不足 1 秒'
  const [size, name] = hit
  const amount = Math.round(abs / size)
  return seconds >= 0 ? `${amount} ${name}后` : `${amount} ${name}前`
}

/** 生成一个可用于演示的 HS256 令牌（签名是占位随机串，仅用于查看结构） */
export function sampleJwt(minutes = 30): string {
  const encode = (value: unknown): string =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    sub: '1234567890',
    name: '张三',
    admin: false,
    iat: now,
    exp: now + minutes * 60
  })
  const signature = encode(`demo-signature-${now}`)
  return `${header}.${payload}.${signature}`
}
