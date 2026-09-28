export const CSV_DELIMITERS = [',', ';', '\t', '|'] as const
export type CsvDelimiter = (typeof CSV_DELIMITERS)[number]

const DEFAULT_DELIMITER: CsvDelimiter = ','

export interface CsvParseOptions {
  delimiter?: CsvDelimiter
  trimFields?: boolean
  skipEmptyLines?: boolean
}

export interface CsvTable {
  rows: string[][]
  delimiter: CsvDelimiter
  warnings: string[]
}

/** 只看前 10 行、且忽略引号内的字符，取出现次数最多的候选分隔符 */
export function detectDelimiter(text: string): CsvDelimiter {
  const counts = new Map<string, number>()
  for (const line of text.split(/\r?\n/).slice(0, 10)) {
    let quoted = false
    for (const ch of line) {
      if (ch === '"') quoted = !quoted
      else if (!quoted) counts.set(ch, (counts.get(ch) ?? 0) + 1)
    }
  }
  let best = DEFAULT_DELIMITER
  let bestCount = 0
  for (const candidate of CSV_DELIMITERS) {
    const count = counts.get(candidate) ?? 0
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/** RFC 4180 状态机：支持引号包裹、`""` 转义、字段内换行与 CRLF */
export function parseCsv(text: string, options: CsvParseOptions = {}): CsvTable {
  const delimiter = options.delimiter ?? detectDelimiter(text)
  const trim = options.trimFields ?? true
  const skipEmpty = options.skipEmptyLines ?? true

  const rows: string[][] = []
  const warnings: string[] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let fieldWasQuoted = false

  const endField = () => {
    row.push(trim && !fieldWasQuoted ? field.trim() : field)
    field = ''
    fieldWasQuoted = false
  }
  const endRow = () => {
    endField()
    const isEmptyLine = row.length === 1 && row[0] === ''
    if (!(skipEmpty && isEmptyLine)) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"' && field === '') {
      quoted = true
      fieldWasQuoted = true
      continue
    }
    if (ch === delimiter) {
      endField()
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++
      endRow()
    } else if (ch === '\n') {
      endRow()
    } else {
      field += ch
    }
  }

  if (quoted) warnings.push('引号未闭合，末尾内容已按普通文本处理')
  if (field !== '' || row.length > 0) endRow()

  return { rows, delimiter, warnings }
}

/** 空表头补 `列N`，重复表头加后缀，保证 JSON 键唯一 */
export function normalizeHeaders(raw: string[]): { headers: string[]; warnings: string[] } {
  const warnings: string[] = []
  const seen = new Map<string, number>()
  const headers = raw.map((name, index) => {
    const base = name.trim() || `列${index + 1}`
    const times = seen.get(base) ?? 0
    seen.set(base, times + 1)
    if (times === 0) return base
    warnings.push(`表头「${base}」重复，第 ${index + 1} 列改名为「${base}_${times + 1}」`)
    return `${base}_${times + 1}`
  })
  return { headers, warnings }
}

export interface CsvToObjectsResult {
  ok: boolean
  objects: Record<string, string>[]
  headers: string[]
  warnings: string[]
  error?: string
}

export function csvToObjects(
  text: string,
  options: CsvParseOptions & { hasHeader?: boolean } = {}
): CsvToObjectsResult {
  const table = parseCsv(text, options)
  const warnings = [...table.warnings]
  if (table.rows.length === 0) {
    return { ok: false, objects: [], headers: [], warnings, error: '没有可解析的内容' }
  }

  const hasHeader = options.hasHeader ?? true
  let headers: string[]
  let body: string[][]

  if (hasHeader) {
    const normalized = normalizeHeaders(table.rows[0] as string[])
    headers = normalized.headers
    warnings.push(...normalized.warnings)
    body = table.rows.slice(1)
  } else {
    const width = Math.max(...table.rows.map((row) => row.length))
    headers = Array.from({ length: width }, (_, index) => `列${index + 1}`)
    body = table.rows
  }

  const objects: Record<string, string>[] = []
  body.forEach((row, index) => {
    const record: Record<string, string> = {}
    headers.forEach((header, column) => {
      record[header] = row[column] ?? ''
    })
    if (row.length > headers.length) {
      warnings.push(`第 ${index + 1} 行有 ${row.length} 个字段，超出表头的部分已丢弃`)
    } else if (row.length < headers.length && row.length > 0) {
      warnings.push(`第 ${index + 1} 行只有 ${row.length} 个字段，缺失部分填空`)
    }
    objects.push(record)
  })

  return { ok: true, objects, headers, warnings }
}

export function formatJson(value: unknown, indent: number): string {
  try {
    return JSON.stringify(value, null, indent) ?? 'null'
  } catch {
    return '{"error":"无法序列化"}'
  }
}

export function escapeField(value: string, delimiter: CsvDelimiter): string {
  const needsQuotes =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r') ||
    value !== value.trim()
  if (!needsQuotes) return value
  return `"${value.replace(/"/g, '""')}"`
}

export function toCsvLine(fields: string[], delimiter: CsvDelimiter): string {
  return fields.map((field) => escapeField(field, delimiter)).join(delimiter)
}

type JsonRecord = Record<string, unknown>

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return '[unserializable]'
  }
}

/** 支持四种常见形状：对象数组、二维数组、标量数组、以及「列名 → 等长数组」的列式对象 */
export function rowsFromJson(parsed: unknown): { rows: string[][]; headers: string[]; warnings: string[] } | { error: string } {
  const errors = (message: string) => ({ error: message })

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { rows: [], headers: [], warnings: ['数组为空'] }

    if (parsed.every((item) => isPlainObject(item))) {
      const headers: string[] = []
      for (const item of parsed as JsonRecord[]) {
        for (const key of Object.keys(item)) if (!headers.includes(key)) headers.push(key)
      }
      const warnings = headers.some((header) => header === '')
        ? ['存在空键名，已改为空列名']
        : []
      const rows = (parsed as JsonRecord[]).map((item) => headers.map((header) => cellText(item[header])))
      return { headers, rows, warnings }
    }

    if (parsed.every((item) => Array.isArray(item))) {
      const width = Math.max(...(parsed as unknown[][]).map((row) => row.length))
      const headers = Array.from({ length: width }, (_, index) => `列${index + 1}`)
      const rows = (parsed as unknown[][]).map((row) => headers.map((_, index) => cellText(row[index])))
      return { headers, rows, warnings: ['输入是二维数组，表头按列序生成'] }
    }

    if (parsed.every((item) => !isPlainObject(item) && !Array.isArray(item))) {
      return { headers: ['value'], rows: parsed.map((item) => [cellText(item)]), warnings: [] }
    }
    return errors('数组元素类型不一致，无法确定列')
  }

  if (isPlainObject(parsed)) {
    const keys = Object.keys(parsed)
    const columns = keys.map((key) => (parsed as JsonRecord)[key])
    if (keys.length > 0 && columns.every((column) => Array.isArray(column))) {
      const lengths = new Set((columns as unknown[][]).map((column) => column.length))
      if (lengths.size !== 1) return errors('列式对象的各列长度不一致')
      const height = (columns[0] as unknown[]).length
      const rows = Array.from({ length: height }, (_, rowIndex) =>
        (columns as unknown[][]).map((column) => cellText(column[rowIndex]))
      )
      return { headers: [...keys], rows, warnings: ['检测到列式对象，已按行转置'] }
    }
    return errors('顶层是对象，请传入对象数组（或每列等长的列式对象）')
  }

  return errors('JSON 顶层需要是数组或对象，标量无法转成表格')
}

export interface JsonToCsvResult {
  ok: boolean
  csv: string
  headers: string[]
  rowCount: number
  warnings: string[]
  error?: string
}

export function jsonToCsv(
  source: string,
  options: { delimiter?: CsvDelimiter; includeHeader?: boolean } = {}
): JsonToCsvResult {
  const delimiter = options.delimiter ?? DEFAULT_DELIMITER
  const empty: JsonToCsvResult = { ok: false, csv: '', headers: [], rowCount: 0, warnings: [] }
  if (!source.trim()) return { ...empty, error: '请输入 JSON 内容' }

  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (cause) {
    return { ...empty, error: `JSON 解析失败：${cause instanceof Error ? cause.message : String(cause)}` }
  }

  const shaped = rowsFromJson(parsed)
  if ('error' in shaped) return { ...empty, error: shaped.error }

  const { headers, rows, warnings } = shaped
  const lines: string[] = []
  if (options.includeHeader ?? true) {
    if (headers.length > 0) lines.push(toCsvLine(headers, delimiter))
  }
  for (const row of rows) lines.push(toCsvLine(row, delimiter))

  return {
    ok: true,
    csv: lines.join('\r\n'),
    headers,
    rowCount: rows.length,
    warnings: [...warnings]
  }
}
