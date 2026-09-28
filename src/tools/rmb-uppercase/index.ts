/**
 * 人民币金额大写互转内核（纯函数）。
 *
 * 正向：阿拉伯数字 → 中文大写（壹贰叁…元角分，遵循票据填写惯例）。
 * 反向：中文大写 → 数字，用来核对票面大小写是否一致，同时为 round-trip 自检提供独立 oracle。
 * 全程以「分」为单位的整数运算，不做浮点，因此不会出现 0.1+0.2 那类误差。
 */

const DIGITS_CN = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const SECTION_UNITS = ['', '拾', '佰', '仟']
/** 四位一节的节权；16 位整数正好用到「万亿」 */
const GROUP_UNITS = ['', '万', '亿', '万亿']

/** 整数部分最多 16 位（9999 万亿…，即 10^16 − 1 元） */
export const MAX_INTEGER_DIGITS = 16

export interface AmountGroup {
  /** 该节的原始 4 位（最高节可能不足 4 位） */
  digits: string
  unit: string
  chinese: string
}

export interface AmountParts {
  ok: boolean
  error: string
  warnings: string[]
  /** 以「分」为单位的整数金额 */
  cents: bigint
  yuan: bigint
  jiao: number
  fen: number
  negative: boolean
  /** 规范化两位小数的十进制串，如 `1234.50` */
  decimal: string
  groups: AmountGroup[]
}

function failAmount(error: string, warnings: string[]): AmountParts {
  return {
    ok: false, error, warnings, cents: 0n, yuan: 0n, jiao: 0, fen: 0,
    negative: false, decimal: '', groups: []
  }
}

function buildAmount(cents: bigint, negative: boolean, warnings: string[]): AmountParts {
  const yuan = cents / 100n
  const rest = Number(cents % 100n)
  const jiao = Math.floor(rest / 10)
  const fen = rest % 10
  const signed = negative && cents !== 0n
  const digits = yuan.toString().replace(/^0+(?=\d)/, '')
  const chunks: string[] = []
  for (let end = digits.length; end > 0; end -= 4) chunks.unshift(digits.slice(Math.max(0, end - 4), end))
  const groups: AmountGroup[] = chunks.map((chunk, index) => {
    const fromTop = chunks.length - 1 - index
    return { digits: chunk, unit: GROUP_UNITS[fromTop] ?? `10^${fromTop * 4}`, chinese: sectionToChinese(chunk) }
  })

  return {
    ok: true,
    error: '',
    warnings,
    cents,
    yuan,
    jiao,
    fen,
    negative: signed,
    decimal: `${signed ? '-' : ''}${yuan.toString()}.${String(jiao)}${String(fen)}`,
    groups
  }
}

/** 接受 `1,234.5`、`￥1234.50`、`１２３４．５`、`-12.3`、`(12.30)`、`12.34元` 等写法 */
export function parseAmount(input: string): AmountParts {
  const warnings: string[] = []
  if (!input || !input.trim()) return failAmount('请输入金额', warnings)

  let text = input
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, '.')
    .replace(/[，,\s]/g, '')
    .replace(/人民币|RMB|rmb/gi, '')
    .replace(/[￥¥$€]|元|圆/g, '')
    .replace(/整$|正$/, '')
    .trim()

  let negative = false
  if (/^\(.*\)$/.test(text) || /^（.*）$/.test(text)) {
    negative = true
    text = text.replace(/[()（）]/g, '')
    warnings.push('会计上用小括号表示负数，已按负数处理')
  }
  if (/^[-－]|^负/.test(text)) {
    negative = true
    text = text.slice(1)
  }
  if (text.startsWith('+')) text = text.slice(1)

  if (/角|分/.test(text)) {
    return failAmount('这里只接收阿拉伯数字金额；带「角/分」的中文写法请用下方的「大写转数字」', warnings)
  }
  if (!/^\d*(\.\d*)?$/.test(text) || !text.replace('.', '')) {
    return failAmount('只能包含数字、小数点与货币符号', warnings)
  }
  if (text.startsWith('.')) text = `0${text}`

  const [rawInt = '0', decPart = ''] = text.split('.')
  const intPart = rawInt.replace(/^0+(?=\d)/, '') || '0'
  if (intPart.length > MAX_INTEGER_DIGITS) {
    return failAmount(`整数部分最多 ${MAX_INTEGER_DIGITS} 位（万亿级），当前 ${intPart.length} 位`, warnings)
  }

  let cents = BigInt(intPart) * 100n + BigInt((decPart + '00').slice(0, 2))
  if (decPart.length > 2) {
    if (Number(decPart[2]) >= 5) cents += 1n
    const rounded = `${(cents / 100n).toString()}.${(cents % 100n).toString().padStart(2, '0')}`
    warnings.push(`小数位超过 2 位，已四舍五入到分：${intPart}.${decPart} → ${rounded}`)
  }
  return buildAmount(cents, negative, warnings)
}

function sectionToChinese(section: string): string {
  let out = ''
  let zeroPending = false
  for (let i = 0; i < section.length; i++) {
    const digit = Number(section[i])
    const position = section.length - 1 - i
    if (digit === 0) {
      if (out) zeroPending = true
      continue
    }
    if (zeroPending) {
      out += '零'
      zeroPending = false
    }
    out += DIGITS_CN[digit] + (SECTION_UNITS[position] ?? '')
  }
  return out
}

/** 亿以内（<10^8）：万节 + 个节，节间不足四位要补「零」 */
function belowYi(value: bigint): string {
  const wan = Number(value / 10000n)
  const rest = Number(value % 10000n)
  let out = ''
  if (wan) out = sectionToChinese(String(wan)) + '万'
  if (rest) {
    if (out && rest < 1000) out += '零'
    out += sectionToChinese(String(rest))
  }
  return out
}

/**
 * 整数部分读法。中文按「四位一节」进位，所以 10^12 是「壹万亿」而不是「壹亿万」：
 * 先按亿切分，亿以上本身再用「万 + 个」两级读法，最后乘上 亿 这个位权。
 */
export function integerToChinese(value: bigint): string {
  if (value === 0n) return '零'
  const yi = value / 100000000n
  const rest = value % 100000000n
  let out = ''
  if (yi) out = belowYi(yi) + '亿'
  if (rest) {
    if (out && rest < 10000000n) out += '零'
    out += belowYi(rest)
  }
  return out || '零'
}

export interface UppercaseResult {
  ok: boolean
  error: string
  text: string
  parsed: AmountParts | null
}

/**
 * 金额 → 中文大写。`withSuffix` 决定是否补「整（正）」：
 * 只有元没有分时按惯例必须写，有角有分时不写。
 */
export function toUppercase(input: string, withSuffix = true): UppercaseResult {
  const parsed = parseAmount(input)
  if (!parsed.ok || !parsed) return { ok: false, error: parsed.error, text: '', parsed: null }

  const { yuan, jiao, fen, negative } = parsed
  let text = `${integerToChinese(yuan)}元`
  if (jiao === 0 && fen === 0) text += withSuffix ? '整' : ''
  else if (jiao === 0) text += `零${DIGITS_CN[fen]}分`
  else if (fen === 0) text += `${DIGITS_CN[jiao]}角${withSuffix ? '整' : ''}`
  else text += `${DIGITS_CN[jiao]}角${DIGITS_CN[fen]}分`

  return { ok: true, error: '', text: negative ? `负${text}` : text, parsed }
}

export interface LowercaseResult {
  ok: boolean
  error: string
  /** 数字金额，两位小数，如 `123456.78` */
  decimal: string
  cents: bigint
  warnings: string[]
}

const CN_TO_DIGIT: Record<string, number> = {
  零: 0, 壹: 1, 贰: 2, 叁: 3, 肆: 4, 伍: 5, 陆: 6, 柒: 7, 捌: 8, 玖: 9,
  〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 两: 2
}
const CN_SECTION_UNIT: Record<string, number> = { 拾: 10, 佰: 100, 仟: 1000 }

/** 中文大写 → 数字。异写（圆/正、〇、一十）与全角都能读；「万亿」按 10^12 处理 */
export function fromUppercase(input: string): LowercaseResult {
  const warnings: string[] = []
  const fail = (error: string): LowercaseResult => ({ ok: false, error, decimal: '', cents: 0n, warnings })

  const text = input.trim().replace(/\s+/g, '')
  if (!text) return fail('请输入中文大写金额')

  const negative = /^负/.test(text)
  const body = text.replace(/^负/, '')
  if (/[0-9０-９]/.test(body)) return fail('这里只接收中文大写；数字金额请填在上方输入框')

  let total = 0n
  let section = 0n
  let current = 0n
  let hasDigit = false
  let jiao: number | null = null
  let fen: number | null = null
  let sawYuan = false

  for (const ch of body) {
    const digit = CN_TO_DIGIT[ch]
    if (digit !== undefined) {
      current = BigInt(digit)
      hasDigit = true
      continue
    }
    const unit = CN_SECTION_UNIT[ch]
    if (unit) {
      // 「拾伍」这类省略系数字的写法，按 1 计
      section += (hasDigit ? current : 1n) * BigInt(unit)
      current = 0n
      hasDigit = false
      continue
    }
    if (ch === '万') {
      // 万是「节内位权」：把已经攒到的本节数值整体升一位，留给可能的 亿 去乘
      section = (section + current) * 10000n
      current = 0n
      hasDigit = false
      continue
    }
    if (ch === '亿') {
      total = (total + section + current) * 100000000n
      section = 0n
      current = 0n
      hasDigit = false
      continue
    }
    if (ch === '元' || ch === '圆') {
      total += section + current
      section = 0n
      current = 0n
      hasDigit = false
      sawYuan = true
      continue
    }
    if (ch === '角') {
      jiao = Number(current)
      current = 0n
      hasDigit = false
      continue
    }
    if (ch === '分') {
      fen = Number(current)
      current = 0n
      hasDigit = false
      continue
    }
    if (ch === '整' || ch === '正') continue
    return fail(`出现无法识别的字符「${ch}」`)
  }

  if (jiao !== null && (jiao < 0 || jiao > 9)) return fail('角只能是 0–9')
  if (fen !== null && (fen < 0 || fen > 9)) return fail('分只能是 0–9')

  const cents = (total + section + current) * 100n + BigInt(jiao ?? 0) * 10n + BigInt(fen ?? 0)
  if (!sawYuan && jiao === null && fen === null) warnings.push('未写「元」，仍按整数金额处理')
  const rest = Number(cents % 100n)
  const decimal = `${negative && cents !== 0n ? '-' : ''}${(cents / 100n).toString()}.${String(Math.floor(rest / 10))}${String(rest % 10)}`
  return { ok: true, error: '', decimal, cents, warnings }
}

export const RMB_SAMPLES: { label: string; value: string }[] = [
  { label: '常规', value: '1234.56' },
  { label: '连续零', value: '1000000.04' },
  { label: '整亿', value: '100000000' },
  { label: '万亿级', value: '9999999999999999.99' },
  { label: '只有角', value: '0.5' },
  { label: '只有分', value: '0.04' },
  { label: '负数', value: '-88.8' },
  { label: '三位小数（会进位）', value: '1.005' },
  { label: '大写示例', value: '壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元玖角捌分' }
]
