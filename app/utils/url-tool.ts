/**
 * URL 解析与重建：拆出协议/主机/端口/路径/查询参数/片段，
 * 参数以键值对数组表示（允许重复键），编辑后可原样组装回去。
 */

export interface UrlParam {
  key: string
  value: string
}

export interface UrlParts {
  /** 含冒号，如 'https:' */
  protocol: string
  hostname: string
  /** 空字符串表示使用默认端口 */
  port: string
  /** 始终以 / 开头 */
  path: string
  params: UrlParam[]
  /** 不含 #，可为空 */
  hash: string
}

export type UrlParseResult =
  | { ok: true; parts: UrlParts }
  | { ok: false; error: string }

/** 解析 URL；无协议时自动按 https 补全后再解析 */
export function parseUrl(raw: string): UrlParseResult {
  const input = raw.trim()
  if (!input) return { ok: false, error: '请输入 URL' }
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(input) ? input : `https://${input}`
  let u: URL
  try {
    u = new URL(candidate)
  } catch {
    return { ok: false, error: '无法解析，请输入合法 URL' }
  }
  if (!/^https?:$/.test(u.protocol) && u.protocol !== 'ftp:') {
    return { ok: false, error: `不支持的协议：${u.protocol}` }
  }
  return {
    ok: true,
    parts: {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname.startsWith('/') ? u.pathname : `/${u.pathname}`,
      params: [...u.searchParams.entries()].map(([key, value]) => ({ key, value })),
      hash: u.hash.replace(/^#/, '')
    }
  }
}

/** 由部件重建完整 URL */
export function buildUrl(parts: UrlParts): string {
  const host = parts.port ? `${parts.hostname}:${parts.port}` : parts.hostname
  const query = parts.params
    .filter(p => p.key !== '')
    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&')
  const hash = parts.hash ? `#${parts.hash}` : ''
  return `${parts.protocol}//${host}${parts.path || '/'}${query ? `?${query}` : ''}${hash}`
}
