import * as yaml from 'js-yaml'

/**
 * YAML ⇄ JSON 互转（基于 js-yaml）。
 * 失败时返回带行列信息的错误文本，供页面直接展示。
 */

export interface ConvertResult {
  ok: boolean
  output: string
  error: string
}

export function yamlToJson(src: string): ConvertResult {
  if (!src.trim()) return { ok: false, output: '', error: '请输入 YAML 内容' }
  try {
    const data = yaml.load(src)
    if (data === undefined) return { ok: false, output: '', error: '未解析到有效文档' }
    return { ok: true, output: JSON.stringify(data, null, 2) ?? 'null', error: '' }
  } catch (e) {
    return { ok: false, output: '', error: toReadableError(e) }
  }
}

export function jsonToYaml(src: string): ConvertResult {
  if (!src.trim()) return { ok: false, output: '', error: '请输入 JSON 内容' }
  let data: unknown
  try {
    data = JSON.parse(src)
  } catch (e) {
    return { ok: false, output: '', error: `JSON 不合法：${(e as Error).message}` }
  }
  try {
    return { ok: true, output: yaml.dump(data, { lineWidth: -1, noRefs: true }).trimEnd(), error: '' }
  } catch (e) {
    return { ok: false, output: '', error: toReadableError(e) }
  }
}

function toReadableError(e: unknown): string {
  const err = e as yaml.exception.YAMLException & { line?: number; column?: number; mark?: { line: number; column: number } }
  const mark = err.mark
  const pos = mark ? `（第 ${mark.line + 1} 行第 ${mark.column + 1} 列）` : ''
  const msg = (err.reason || err.message || '解析失败').split('\n')[0]
  return `${msg}${pos}`
}
