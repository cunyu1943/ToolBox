/**
 * JWT（JSON Web Token）解析纯函数。
 * 只做 base64url 解码展示 header/payload，不验证签名（无密钥，且属客户端工具）。
 */

import { base64Decode } from './encoding'

/** base64url → 标准 base64（补齐 padding）后 UTF-8 解码 */
function decodeBase64Url(segment: string): string {
  let s = segment.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4 !== 0) s += '='
  return base64Decode(s)
}

export interface JwtParsed {
  ok: boolean
  header?: string
  payload?: string
  signature?: string
  error?: string
}

/** 解析 JWT 三段结构，header/payload 以格式化 JSON 返回 */
export function parseJwt(token: string): JwtParsed {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return { ok: false, error: 'JWT 应由三段以“.”分隔' }
  try {
    const header = JSON.parse(decodeBase64Url(parts[0]!)) as unknown
    const payload = JSON.parse(decodeBase64Url(parts[1]!)) as unknown
    return {
      ok: true,
      header: JSON.stringify(header, null, 2),
      payload: JSON.stringify(payload, null, 2),
      signature: parts[2]
    }
  } catch {
    return { ok: false, error: '头部或载荷不是合法的 base64url 编码 JSON' }
  }
}

/** 从 payload 读取的常用时间戳字段，转为本地可读时间字符串 */
export function describeJwtTime(payloadJson: string): string[] {
  try {
    const obj = JSON.parse(payloadJson) as Record<string, unknown>
    const lines: string[] = []
    const map: Record<string, string> = { exp: '过期 (exp)', iat: '签发 (iat)', nbf: '生效 (nbf)' }
    for (const key of ['iat', 'nbf', 'exp']) {
      const v = obj[key]
      if (typeof v === 'number')
        lines.push(`${map[key]}：${new Date(v * 1000).toLocaleString('zh-CN')}（${v}）`)
    }
    return lines
  } catch {
    return []
  }
}
