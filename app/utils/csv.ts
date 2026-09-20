/**
 * CSV ⇄ JSON 互转纯函数，支持引号包裹、字段内逗号/换行/转义双引号。
 */

export interface CsvOptions {
  delimiter?: string
  /** 首行是否作为表头（生成对象数组） */
  header?: boolean
}

/** 解析 CSV 文本为二维数组（保留每个字段原样） */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      pushField()
    } else if (c === '\n') {
      pushRow()
    } else if (c === '\r') {
      if (text[i + 1] !== '\n') pushRow()
    } else {
      field += c
    }
  }
  // 末字段/末行（除非文本恰好以换行结束）
  if (field.length > 0 || row.length > 0) pushRow()
  // 去掉完全空行
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** CSV 文本 → JSON 值（header=true 时为对象数组，否则为二维数组） */
export function csvToJson(text: string, { delimiter = ',', header = true }: CsvOptions = {}): string {
  const rows = parseCsv(text, delimiter)
  if (!header) return JSON.stringify(rows, null, 2)
  if (rows.length === 0) return JSON.stringify([], null, 2)
  const cols = rows[0]
  const objs = rows.slice(1).map((r) => {
    const o: Record<string, string> = {}
    cols.forEach((col, idx) => {
      o[col] = r[idx] ?? ''
    })
    return o
  })
  return JSON.stringify(objs, null, 2)
}

function escapeField(value: unknown, delimiter: string): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (s.includes('"') || s.includes(delimiter) || s.includes('\n') || s.includes('\r'))
    return '"' + s.replace(/"/g, '""') + '"'
  return s
}

/** JSON（对象数组或二维数组）→ CSV 文本 */
export function jsonToCsv(json: string): string {
  const data: unknown = JSON.parse(json)
  if (!Array.isArray(data)) throw new Error('顶层需为数组')
  const delimiter = ','
  if (data.length === 0) return ''
  const isArrayOfArrays = Array.isArray(data[0])
  if (isArrayOfArrays) {
    return (data as unknown[][]).map((r) => r.map((c) => escapeField(c, delimiter)).join(delimiter)).join('\n')
  }
  const objects = data as Record<string, unknown>[]
  const cols = [...new Set(objects.flatMap((o) => Object.keys(o ?? {})))]
  const headerLine = cols.map((c) => escapeField(c, delimiter)).join(delimiter)
  const body = objects
    .map((o) => cols.map((c) => escapeField(o?.[c], delimiter)).join(delimiter))
    .join('\n')
  return body ? `${headerLine}\n${body}` : headerLine
}
