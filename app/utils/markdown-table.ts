import { parseCsv } from './csv'

/**
 * 文本 → Markdown 表格生成。
 * 输入支持 Tab / 逗号 / 分号 / 竖线 / 连续空格分隔，首行作表头；
 * 单元格内的 | 自动转义、换行转 <br>，可选按列宽补空格对齐源码。
 */

export type MdAlign = 'left' | 'center' | 'right'

export interface MdTableOptions {
  /** 每列对齐方式，缺省全部左对齐 */
  alignments?: MdAlign[]
  /** 是否把单元格补白到列宽，让源码纵向对齐，默认 true */
  pad?: boolean
}

const AUTO_DELIMS = ['\t', ',', ';', '|']

/** 取首行探测分隔符；找不到单字符分隔符则回退「连续两个空格」 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== '') ?? ''
  for (const d of AUTO_DELIMS) if (firstLine.includes(d)) return d
  return '  '
}

/** 解析原始文本为二维数组（去掉全空行、trim 单元格） */
export function parseTableInput(text: string, delimiter: string): string[][] {
  let rows: string[][]
  if (delimiter === '  ') {
    rows = text
      .split(/\r?\n/)
      .filter((l) => l.trim() !== '')
      .map((l) => l.trim().split(/\s{2,}/))
  } else {
    rows = parseCsv(text, delimiter)
  }
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ''))
}

function separatorCell(align: MdAlign, width: number): string {
  const dashes = Math.max(width, 3)
  if (align === 'center') return `:${'-'.repeat(Math.max(dashes - 2, 1))}:`
  if (align === 'right') return `${'-'.repeat(Math.max(dashes - 1, 2))}:`
  return '-'.repeat(dashes)
}

const fit = (s: string, w: number, align: MdAlign) => {
  const gap = ' '.repeat(Math.max(w - s.length, 0))
  if (align === 'right') return gap + s
  if (align === 'center') {
    const left = Math.floor(gap.length / 2)
    return ' '.repeat(left) + s + ' '.repeat(gap.length - left)
  }
  return s + gap
}

/** 二维数组 → Markdown 表格文本，首行为表头 */
export function buildMarkdownTable(rows: string[][], options: MdTableOptions = {}): string {
  const { alignments = [], pad = true } = options
  if (!rows.length) return ''
  const cols = Math.max(...rows.map((r) => r.length))
  const norm = rows.map((r) => {
    const filled = [...r]
    while (filled.length < cols) filled.push('')
    return filled.map((c) => c.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>'))
  })
  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(3, ...norm.map((r) => r[i].length))
  )
  const alignOf = (i: number): MdAlign => alignments[i] ?? 'left'
  const render = (cells: string[]) =>
    `| ${cells.map((c, i) => (pad ? fit(c, widths[i], alignOf(i)) : c)).join(' | ')} |`
  const sep = Array.from({ length: cols }, (_, i) => separatorCell(alignOf(i), widths[i]))
  return [render(norm[0]), `| ${sep.join(' | ')} |`, ...norm.slice(1).map(render)].join('\n')
}

/** 一步到位：原始文本 + 分隔符（'auto' 表示探测）→ Markdown 表格 */
export function generateMarkdownTable(
  text: string,
  opts: { delimiter?: string; alignments?: MdAlign[]; pad?: boolean } = {}
): string {
  if (!text.trim()) throw new Error('请输入表格数据（每行一条，单元格用分隔符隔开）')
  const delim = !opts.delimiter || opts.delimiter === 'auto' ? detectDelimiter(text) : opts.delimiter
  const rows = parseTableInput(text, delim)
  if (!rows.length) throw new Error('未解析到任何数据行')
  return buildMarkdownTable(rows, { alignments: opts.alignments, pad: opts.pad })
}
