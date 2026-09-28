export type JsonIndent = 0 | 2 | 4 | '\t'

export interface JsonError {
  message: string
  line?: number
  column?: number
}

export type ParseOutcome =
  | { ok: true; value: unknown }
  | { ok: false; error: JsonError }

export interface JsonSummary {
  chars: number
  keys: number
  values: number
  depth: number
}

/** V8 的报错文本里带 `position N`，换算成行列方便定位。 */
function locate(source: string, position: number): { line: number; column: number } {
  const before = source.slice(0, position)
  const lastBreak = before.lastIndexOf('\n')
  return { line: before.split('\n').length, column: position - lastBreak }
}

export function parseJson(source: string): ParseOutcome {
  try {
    return { ok: true, value: JSON.parse(source) }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    const match = /position (\d+)/.exec(message)
    if (!match) return { ok: false, error: { message } }
    const { line, column } = locate(source, Number(match[1]))
    return { ok: false, error: { message, line, column } }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep(value[key])
        return acc
      }, {})
  }
  return value
}

export function stringifyJson(value: unknown, indent: JsonIndent): string {
  const pad = indent === '\t' ? '\t' : indent === 0 ? undefined : indent
  return JSON.stringify(value, null, pad) ?? 'null'
}

export interface FormatOptions {
  indent: JsonIndent
  sortKeys: boolean
}

export type FormatOutcome =
  | { ok: true; text: string; summary: JsonSummary }
  | { ok: false; error: JsonError }

export function formatJson(source: string, options: FormatOptions): FormatOutcome {
  const parsed = parseJson(source)
  if (!parsed.ok) return parsed
  const value = options.sortKeys ? sortDeep(parsed.value) : parsed.value
  const text = stringifyJson(value, options.indent)
  return { ok: true, text, summary: summarize(value, text.length) }
}

export function summarize(value: unknown, chars = 0): JsonSummary {
  let keys = 0
  let values = 0
  let depth = 0

  const walk = (node: unknown, level: number): void => {
    depth = Math.max(depth, level)
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, level + 1))
      return
    }
    if (isPlainObject(node)) {
      keys += Object.keys(node).length
      Object.values(node).forEach((item) => walk(item, level + 1))
      return
    }
    values += 1
  }

  walk(value, 1)
  return { chars, keys, values, depth }
}

/** 从一段可能夹带注释 / 单引号 / 尾随逗号的"接近 JSON"文本里尽力抽取值；失败返回 undefined。 */
export function tryParseLoose(source: string): ParseOutcome {
  const strict = parseJson(source)
  if (strict.ok) return strict
  const stripped = source
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1')
  const relaxed = parseJson(stripped)
  return relaxed.ok ? relaxed : strict
}
