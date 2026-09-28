export interface QueryParam {
  key: string
  value: string
}

export interface UrlParts {
  protocol: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  origin: string
  params: QueryParam[]
}

export type UrlResult = { ok: true; href: string; parts: UrlParts } | { ok: false; error: string }

const toParams = (source: string): QueryParam[] =>
  [...new URLSearchParams(source).entries()].map(([key, value]) => ({ key, value }))

export function parseUrl(input: string): UrlResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: '请输入 URL' }

  const attempts = [trimmed]
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) attempts.unshift(`https:${trimmed.startsWith('//') ? trimmed : `//${trimmed}`}`)

  for (const candidate of attempts) {
    try {
      const url = new URL(candidate)
      return {
        ok: true,
        href: url.href,
        parts: {
          protocol: url.protocol.replace(/:$/, ''),
          host: url.host,
          hostname: url.hostname,
          port: url.port,
          pathname: url.pathname,
          search: url.search,
          hash: url.hash,
          origin: url.origin,
          params: toParams(url.search)
        }
      }
    } catch {
      /* 换下一个候选继续试 */
    }
  }
  return { ok: false, error: '无法解析：请确认它是合法 URL（含协议，或以 // 开头）' }
}

export function buildQuery(params: QueryParam[]): string {
  const search = new URLSearchParams()
  params.forEach(({ key, value }) => key && search.append(key, value))
  const out = search.toString()
  return out ? `?${out}` : ''
}

export interface TransformResult {
  ok: boolean
  text: string
  error?: string
}

const guard = (fn: (value: string) => string, value: string, label: string): TransformResult => {
  try {
    return { ok: true, text: fn(value) }
  } catch {
    return { ok: false, text: '', error: `${label}失败：百分号序列不合法（如孤立的 % 或 %zz）` }
  }
}

export const encodeComponent = (value: string): TransformResult =>
  guard(encodeURIComponent, value, 'encodeURIComponent')
export const decodeComponent = (value: string): TransformResult =>
  guard(decodeURIComponent, value, 'decodeURIComponent')
export const encodeUri = (value: string): TransformResult =>
  guard(encodeURI, value, 'encodeURI')
export const decodeUri = (value: string): TransformResult =>
  guard(decodeURI, value, 'decodeURI')

/** 与 escape/unescape 类似但不再依赖已废弃 API：对非 ASCII 与保留字符全部转义。 */
export const encodeStrict = (value: string): TransformResult =>
  guard(
    (input) =>
      encodeURIComponent(input).replace(/[!'()*]/g, (char) =>
        `%${char.charCodeAt(0).toString(16).toUpperCase()}`
      ),
    value,
    '严格编码'
  )

export const percentDecodedCount = (value: string): number =>
  (value.match(/%[0-9A-Fa-f]{2}/g) ?? []).length
