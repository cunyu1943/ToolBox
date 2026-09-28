/**
 * Markdown 表格互转内核（纯函数，不碰 DOM）。
 *
 * 修掉旧站同款工具的两个问题：
 * 1. 列宽用 `String.length` 算，中文（东亚宽度 2）排出来的表是歪的 —— 这里按显示宽度补空格；
 * 2. 出错时把异常吞成空字符串 —— 这里一律返回 `{ ok: false, error }`。
 *
 * CSV/JSON 的解析复用 `../csv-json`，避免同一套 RFC 4180 状态机写两遍。
 */

import { formatJson, normalizeHeaders, parseCsv, rowsFromJson, toCsvLine, type CsvDelimiter } from '../csv-json/index.ts'

export type Align = 'left' | 'center' | 'right' | undefined

export interface TableModel {
  headers: string[]
  rows: string[][]
  /** 与表头一一对齐，缺项按左对齐处理 */
  aligns: Align[]
}

export interface TableResult {
  ok: boolean
  value: string
  headers: string[]
  rowCount: number
  columnCount: number
  aligns: Align[]
  warnings: string[]
  error?: string
}

/* ----------------------------- 显示宽度 ----------------------------- */

/**
 * 东亚宽字符 / 全角标点 / emoji 记 2 列，组合记号与零宽连接符记 0 列。
 * 这是近似实现（不携带完整 EastAsianWidth.txt），但对齐效果已经和编辑器里的等宽字体一致。
 */
const WIDE_RE = /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F300}-\u{1FAFF}]/u
const ZERO_WIDTH_RE = /[\u0300-\u036F\u200B-\u200F\uFE00-\uFE0F]/u

export function displayWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    if (ZERO_WIDTH_RE.test(ch)) continue
    width += WIDE_RE.test(ch) ? 2 : 1
  }
  return width
}

function padToWidth(cell: string, width: number, align: Align): string {
  const gap = Math.max(0, width - displayWidth(cell))
  if (align === 'right') return ' '.repeat(gap) + cell
  if (align === 'center') {
    const left = Math.floor(gap / 2)
    return ' '.repeat(left) + cell + ' '.repeat(gap - left)
  }
  return cell + ' '.repeat(gap)
}

/* ----------------------------- 解析 Markdown 表格 ----------------------------- */

const SEPARATOR_RE = /^:?-{1,}:?$/

/** 按未转义的 `|` 切分；`\|` 保留成字面竖线，首尾的空管道去掉 */
function splitCells(line: string): string[] {
  const body = line.trim()
  let text = body
  if (text.startsWith('|')) text = text.slice(1)
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1)

  const cells: string[] = []
  let current = ''
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] as string
    if (ch === '\\' && text[i + 1] === '|') {
      current += '|'
      i += 1
      continue
    }
    if (ch === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

export type ParseTableResult =
  | { ok: true; model: TableModel; warnings: string[] }
  | { ok: false; error: string; warnings: string[] }

export function parseMdTable(source: string): ParseTableResult {
  const warnings: string[] = []
  const lines = source.split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return { ok: false, error: '输入为空', warnings }
  if (!lines.some((line) => line.includes('|'))) {
    return { ok: false, error: '没找到 `|` 分隔符：Markdown 表格每行都要用竖线分列', warnings }
  }

  const headerIndex = lines.findIndex((line) => line.includes('|'))
  const head = splitCells(lines[headerIndex] as string)
  const second = lines[headerIndex + 1]
  const hasSeparator = !!second && splitCells(second).length > 0 && splitCells(second).every((cell) => SEPARATOR_RE.test(cell))

  if (headerIndex > 0) warnings.push(`忽略表格之前的 ${headerIndex} 行文字`)
  if (!hasSeparator) warnings.push('没有 `|---|---|` 分隔行，已把第一行当表头、其余当数据行')

  const aligns: Align[] = head.map((_, index) => {
    const cell = hasSeparator ? splitCells(second as string)[index] : undefined
    if (!cell) return undefined
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    if (left) return 'left'
    return undefined
  })

  const bodyLines = (hasSeparator ? lines.slice(headerIndex + 2) : lines.slice(headerIndex + 1)).filter((line) => line.includes('|'))
  const width = head.length
  const normalized = normalizeHeaders(head)
  const rows = bodyLines.map((line, index) => {
    const cells = splitCells(line)
    if (cells.length > width) {
      warnings.push(`第 ${index + 1} 行有 ${cells.length} 列，超出表头的 ${width} 列已丢弃`)
      return cells.slice(0, width)
    }
    if (cells.length < width) {
      warnings.push(`第 ${index + 1} 行只有 ${cells.length} 列，缺失部分已补空`)
      return [...cells, ...Array.from({ length: width - cells.length }, () => '')]
    }
    return cells
  })
  if (!rows.length) warnings.push('只有表头，没有数据行')

  return { ok: true, model: { headers: normalized.headers, rows, aligns }, warnings: [...warnings, ...normalized.warnings] }
}

/* ----------------------------- 渲染 Markdown 表格 ----------------------------- */

export interface RenderOptions {
  /** 按列宽补空格对齐；关掉则输出紧凑的单空格形式 */
  pad: boolean
  /** auto = 纯数字列右对齐；source = 沿用分隔行声明的对齐；none = 全部左对齐 */
  align: 'source' | 'auto' | 'none'
}

export const RENDER_DEFAULTS: RenderOptions = { pad: true, align: 'source' }

function numericColumn(rows: string[][], index: number): boolean {
  let seen = 0
  for (const row of rows) {
    const cell = (row[index] ?? '').trim()
    if (!cell) continue
    if (!/^[+-]?\d{1,3}(,\d{3})*(\.\d+)?%?$|^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?%?$/.test(cell)) return false
    seen += 1
  }
  return seen > 0
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim() || ' '
}

export function renderMdTable(model: TableModel, options: Partial<RenderOptions> = {}): string {
  const opts: RenderOptions = { ...RENDER_DEFAULTS, ...options }
  const { headers, rows } = model
  const aligns = headers.map((_, index) => {
    if (opts.align === 'none') return undefined as Align
    if (opts.align === 'auto' && numericColumn(rows, index)) return 'right' as Align
    return model.aligns[index]
  })

  const cells = (list: string[]) => list.map(escapeCell)
  const header = cells(headers)
  const body = rows.map((row) => cells(row))
  const widths = header.map((_, index) =>
    Math.max(3, displayWidth(header[index] as string), ...body.map((row) => displayWidth(row[index] ?? '')))
  )

  const line = (list: string[]) => `| ${list.map((cell, index) => padToWidth(cell, widths[index] as number, aligns[index])).join(' | ')} |`
  const separator = `| ${aligns
    .map((align, index) => {
      const width = widths[index] as number
      const bar = '-'.repeat(Math.max(3, width - (align === 'center' ? 2 : align ? 1 : 0)))
      if (align === 'center') return `:${bar}:`
      if (align === 'right') return `${bar}:`
      if (align === 'left') return `:${bar}`
      return bar
    })
    .join(' | ')} |`

  return [line(header), separator, ...body.map(line)].join('\n')
}

/* ----------------------------- 与其他格式互转 ----------------------------- */

export type TableSource = 'md' | 'csv' | 'json'
export type TableTarget = 'md' | 'csv' | 'tsv' | 'json'
export type JsonShape = 'objects' | 'arrays' | 'columns'

export interface ConvertOptions {
  /** CSV 是否把首行当表头 */
  hasHeader: boolean
  delimiter?: CsvDelimiter
  jsonShape: JsonShape
  indent: number
  pad: boolean
  align: RenderOptions['align']
}

export const CONVERT_DEFAULTS: ConvertOptions = {
  hasHeader: true,
  jsonShape: 'objects',
  indent: 2,
  pad: true,
  align: 'source'
}

function failed(error: string, warnings: string[] = []): TableResult {
  return { ok: false, value: '', headers: [], rowCount: 0, columnCount: 0, aligns: [], warnings, error }
}

function modelFromCsv(source: string, options: ConvertOptions): { model?: TableModel; error?: string; warnings: string[] } {
  const table = parseCsv(source, { delimiter: options.delimiter ?? ',', trimFields: true })
  const warnings = [...table.warnings]
  if (!table.rows.length) return { error: '没有可解析的内容', warnings }
  if (options.hasHeader) {
    const head = table.rows[0] as string[]
    const normalized = normalizeHeaders(head)
    return {
      model: { headers: normalized.headers, rows: table.rows.slice(1), aligns: head.map(() => undefined) },
      warnings: [...warnings, ...normalized.warnings]
    }
  }
  const width = Math.max(...table.rows.map((row) => row.length))
  const headers = Array.from({ length: width }, (_, index) => `列${index + 1}`)
  return { model: { headers, rows: table.rows, aligns: headers.map(() => undefined) }, warnings }
}

function modelFromJson(source: string): { model?: TableModel; error?: string; warnings: string[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (cause) {
    return { error: `JSON 解析失败：${cause instanceof Error ? cause.message : String(cause)}`, warnings: [] }
  }
  const shaped = rowsFromJson(parsed)
  if ('error' in shaped) return { error: shaped.error, warnings: [] }
  return {
    model: {
      headers: shaped.headers,
      rows: shaped.rows,
      aligns: shaped.headers.map((_, index) => (numericColumn(shaped.rows, index) ? ('right' as Align) : undefined))
    },
    warnings: shaped.warnings
  }
}

export function tableToJson(model: TableModel, shape: JsonShape, indent: number): string {
  const clean = (cell: string) => cell.replace(/<br>/g, '\n').trim()
  if (shape === 'arrays') return formatJson([model.headers, ...model.rows], indent)
  if (shape === 'columns') {
    const columns: Record<string, string[]> = {}
    model.headers.forEach((header, index) => {
      columns[header] = model.rows.map((row) => clean(row[index] ?? ''))
    })
    return formatJson(columns, indent)
  }
  return formatJson(
    model.rows.map((row) => {
      const record: Record<string, string> = {}
      model.headers.forEach((header, index) => {
        record[header] = clean(row[index] ?? '')
      })
      return record
    }),
    indent
  )
}

/** 统一入口：`from` 决定怎么读，`to` 决定怎么写 */
export function convertTable(source: string, from: TableSource, to: TableTarget, options: Partial<ConvertOptions> = {}): TableResult {
  const opts: ConvertOptions = { ...CONVERT_DEFAULTS, ...options }
  if (!source.trim()) return failed(`请输入 ${from === 'md' ? 'Markdown 表格' : from === 'csv' ? 'CSV / TSV 文本' : 'JSON 数据'}`)

  let model: TableModel
  const warnings: string[] = []

  if (from === 'md') {
    const parsed = parseMdTable(source)
    if (!parsed.ok) return failed(parsed.error, parsed.warnings)
    model = parsed.model
    warnings.push(...parsed.warnings)
  } else if (from === 'csv') {
    const built = modelFromCsv(source, opts)
    if (built.error) return failed(built.error, built.warnings)
    model = built.model as TableModel
    warnings.push(...built.warnings)
  } else {
    const built = modelFromJson(source)
    if (built.error) return failed(built.error, built.warnings)
    model = built.model as TableModel
    warnings.push(...built.warnings)
  }

  let value = ''
  if (to === 'md') {
    value = `${renderMdTable(model, { pad: opts.pad, align: opts.align })}\n`
    warnings.push(`已按显示宽度补空格${opts.align === 'auto' ? '，数字列右对齐' : ''}`)
  } else if (to === 'json') {
    value = `${tableToJson(model, opts.jsonShape, opts.indent)}\n`
  } else {
    const delimiter: CsvDelimiter = to === 'tsv' ? '\t' : (opts.delimiter ?? ',')
    if (to === 'tsv' && model.rows.some((row) => row.some((cell) => /\t/.test(cell)))) {
      warnings.push('单元格里有制表符，TSV 会因此错列，建议改用 CSV')
    }
    const lines = [toCsvLine(model.headers, delimiter), ...model.rows.map((row) => toCsvLine(row, delimiter))]
    // CSV/TSV 用 CRLF（RFC 4180），行尾也要一致，否则最后一行是 LF、其余是 CRLF
    value = `${lines.join('\r\n')}\r\n`
  }

  return {
    ok: true,
    value,
    headers: model.headers,
    rowCount: model.rows.length,
    columnCount: model.headers.length,
    aligns: model.aligns,
    warnings
  }
}

/** 行列互换：表头变第一列。常用于把「一行一条记录」转成「一列一条记录」 */
export function transpose(source: string): TableResult {
  const parsed = parseMdTable(source)
  if (!parsed.ok) return failed(parsed.error, parsed.warnings)
  const { headers, rows, aligns } = parsed.model
  const height = rows.length
  const newHeaders = height ? rows.map((_, index) => `第${index + 1}行`) : ['（无数据行）']
  const newRows = headers.map((header, column) => [header, ...rows.map((row) => row[column] ?? '')])
  const model: TableModel = { headers: newHeaders, rows: newRows, aligns: newHeaders.map((_, index) => (index === 0 ? undefined : aligns[0])) }
  return {
    ok: true,
    value: `${renderMdTable(model)}\n`,
    headers: newHeaders,
    rowCount: newRows.length,
    columnCount: newHeaders.length,
    aligns: model.aligns,
    warnings: parsed.warnings
  }
}

export const TABLE_SAMPLES: { label: string; value: string }[] = [
  {
    label: '中文列 + 数字列（对齐会歪）',
    value: `| 项目 | 负责人 | 进度 | 说明 |
|:-----|:------:|-----:|:-----|
| 构建提速 | 张三 | 85% | 从 42s 降到 9s |
| 文档 | 李四 | 100% | 已完成，含\\|转义\\|示例 |
| 移动端适配 | 王五 | 60% |
`
  },
  {
    label: '紧凑写法（表头当数据用）',
    value: `a|b|c
1|中文|2.5
2|emoji 🙂|3`
  }
]
