/**
 * 全角 ⇄ 半角转换内核（纯函数，不抛错）。
 *
 * 可转换的只有两块码位：半角 `U+0020–U+007E` 与全角 `U+FF01–U+FF5E`（差 `0xFEE0`），
 * 外加全角空格 `U+3000` ↔ 半角空格 `U+0020`。CJK 标点（`U+3000–U+303F`，如 `。`、`、`）
 * 没有等价的单字节字符，默认原样保留并如实上报；`mapCjkPunctuation` 打开时按一张人工
 * 维护的常用标点表映射（`。` → `.` 这类归一化，属于改写而非等价转换，故默认关闭）。
 */

export type WidthDirection = 'to-half' | 'to-full'

export interface WidthStats {
  /** 属于全角形式（FF01–FF5E / 3000）的字符数 */
  fullWidth: number
  /** 属于半角可转换形式（20–7E）的字符数 */
  halfWidth: number
  /** 既不是全角也不是半角可转换形式（汉字、假名、CJK 标点等） */
  untouched: number
  /** 其中的空白类字符数 */
  spaces: number
}

export interface WidthResult {
  ok: boolean
  value: string
  /** 实际发生映射的字符数 */
  converted: number
  error?: string
  /** 出现次数去重后的不可转换字符，用于提示「这些没动」 */
  remaining: string[]
  /** CJK 标点被归一化成半角的那些字符（仅在 mapCjkPunctuation 时非空） */
  normalized: string[]
  notes: string[]
  stats: WidthStats
}

const OFFSET = 0xfee0
const FULL_SPACE = 0x3000

/** 中文排版里最常见的几个标点：码位不是 FF01–FF5E，需要单独映射 */
const CJK_TO_HALF: Record<number, string> = {
  0x3000: ' ',
  0x3001: ',',
  0x3002: '.',
  0x300c: '"',
  0x300d: '"',
  0x300e: "'",
  0x300f: "'",
  0x3010: '<',
  0x3011: '>',
  0xff61: '-',
  0xff62: '/',
  0xff64: ':',
  0xff65: ';'
}

const isFullWidth = (code: number): boolean => (code >= 0xff01 && code <= 0xff5e) || code === FULL_SPACE
const isHalfWidth = (code: number): boolean => code >= 0x20 && code <= 0x7e

function statsOf(text: string): WidthStats {
  const stats: WidthStats = { fullWidth: 0, halfWidth: 0, untouched: 0, spaces: 0 }
  for (const ch of text) {
    const code = ch.codePointAt(0) as number
    if (ch === ' ' || ch === '\u3000') stats.spaces += 1
    if (isFullWidth(code)) stats.fullWidth += 1
    else if (isHalfWidth(code)) stats.halfWidth += 1
    else stats.untouched += 1
  }
  return stats
}

/**
 * 按方向转换整段文本。`mapCjkPunctuation` 只在转半角时生效。
 */
export function convertWidth(text: string, direction: WidthDirection, mapCjkPunctuation = false): WidthResult {
  const notes: string[] = []
  if (!text) {
    return { ok: true, value: '', converted: 0, remaining: [], normalized: [], notes: ['输入为空'], stats: statsOf('') }
  }

  let converted = 0
  let normalized = 0
  const remaining = new Set<string>()
  const out: string[] = []

  for (const ch of text) {
    const code = ch.codePointAt(0) as number
    if (direction === 'to-half') {
      if (code === FULL_SPACE) {
        out.push(' ')
        converted += 1
        continue
      }
      if (isFullWidth(code)) {
        out.push(String.fromCharCode(code - OFFSET))
        converted += 1
        continue
      }
      if (mapCjkPunctuation && code in CJK_TO_HALF) {
        out.push(CJK_TO_HALF[code] as string)
        normalized += 1
        continue
      }
      if (!isHalfWidth(code)) remaining.add(ch)
      out.push(ch)
      continue
    }

    if (code === 0x20) {
      out.push('\u3000')
      converted += 1
      continue
    }
    if (isHalfWidth(code)) {
      out.push(String.fromCharCode(code + OFFSET))
      converted += 1
      continue
    }
    if (!isFullWidth(code)) remaining.add(ch)
    out.push(ch)
  }

  const value = out.join('')
  if (!converted && !normalized) notes.push(direction === 'to-full' ? '文本已是全角，没有需要转换的字符' : '没有任何字符被转换')
  if (direction === 'to-half' && !mapCjkPunctuation && remaining.size) {
    notes.push('CJK 标点与汉字没有等价的半角字符，已原样保留（可勾选「中文标点归一化」）')
  }
  if (direction === 'to-full' && remaining.size) {
    notes.push('汉字、假名与 CJK 标点本来就是宽字符，不参与转换')
  }
  if (converted && /[0-9A-Za-z]/.test(text) && direction === 'to-full') {
    notes.push('全角字母数字会破坏对齐与检索，一般只用于排版装饰，别贴进代码或 URL')
  }

  const uniqueRemaining = [...remaining]
  return {
    ok: true,
    value,
    converted: converted + normalized,
    remaining: uniqueRemaining.slice(0, 40),
    normalized: mapCjkPunctuation && direction === 'to-half'
      ? [...new Set([...text].filter((ch) => (ch.codePointAt(0) as number) in CJK_TO_HALF))]
      : [],
    notes,
    stats: statsOf(text)
  }
}

export const FULLWIDTH_SAMPLES: { label: string; value: string }[] = [
  { label: '半角混排', value: 'MYSQL_PORT=3306 // timeout=30s' },
  { label: '全角中文串', value: '订单号：ＡＢＣ－１２３，金额 １９９．００ 元。' },
  { label: '全角空格陷阱', value: '　　启动参数　　' },
  { label: '中英混排', value: '版本号 v2.13.4（2026 年 9 月发布）' }
]
