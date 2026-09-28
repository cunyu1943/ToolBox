export const MIN_BASE = 2
export const MAX_BASE = 36

export interface BaseOption {
  base: number
  label: string
}

export const quickBases: BaseOption[] = [
  { base: 2, label: '二进制 BIN' },
  { base: 8, label: '八进制 OCT' },
  { base: 10, label: '十进制 DEC' },
  { base: 16, label: '十六进制 HEX' }
]

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export const digitSetOf = (base: number): string => DIGITS.slice(0, base)

export function isValidBase(base: number): boolean {
  return Number.isInteger(base) && base >= MIN_BASE && base <= MAX_BASE
}

/** 0x / 0b / 0o 前缀只是标注进制，剥掉后按选定的进制解析 */
function stripPrefix(source: string, base: number): string {
  const text = source.toLowerCase()
  if (base === 16 && text.startsWith('0x')) return source.slice(2)
  if (base === 2 && text.startsWith('0b')) return source.slice(2)
  if (base === 8 && text.startsWith('0o')) return source.slice(2)
  if (base === 10 && text.startsWith('0d')) return source.slice(2)
  return source
}

export interface ParseResult {
  ok: boolean
  value?: bigint
  negative?: boolean
  error?: string
}

/**
 * 逐位 Horner 展开（BigInt 字面量只认十进制，所以不能直接用 `BigInt('FF')`）。
 * `label` 只进报错文案，调用方按「16 进制」「Base32」这种带单位的写法传进来。
 */
function accumulate(body: string, digits: string, radix: number, label: string): ParseResult {
  let value = 0n
  const radixBigInt = BigInt(radix)
  for (const char of body.toUpperCase()) {
    const digit = digits.indexOf(char)
    if (digit < 0) {
      return {
        ok: false,
        error: `「${char}」不是 ${label}的合法数字（${label}只用到 ${digits.split('').join(' ')}）`
      }
    }
    value = value * radixBigInt + BigInt(digit)
  }
  return { ok: true, value }
}

/** 任意 2–36 进制字符串 → BigInt，支持前导负号、下划线与空格分隔 */
export function parseInBase(input: string, base: number): ParseResult {
  if (!isValidBase(base)) return { ok: false, error: `进制必须是 ${MIN_BASE}–${MAX_BASE} 之间的整数` }
  const raw = stripPrefix(input.trim().replace(/[\s_]/g, ''), base)
  if (!raw) return { ok: false, error: '输入为空' }
  const negative = raw.startsWith('-')
  const body = negative || raw.startsWith('+') ? raw.slice(1) : raw
  if (!body) return { ok: false, error: '只有符号，缺少数字' }

  const parsed = accumulate(body, digitSetOf(base), base, `${base} 进制`)
  if (!parsed.ok) return parsed
  const value = parsed.value ?? 0n
  return { ok: true, value: negative ? -value : value, negative }
}

/** BigInt.prototype.toString 原生支持 2–36 进制，字母统一大写 */
export function toBase(value: bigint, base: number): string {
  if (!isValidBase(base)) return ''
  return value.toString(base).toUpperCase()
}

export interface BaseRow {
  base: number
  label: string
  value: string
}

export interface ConversionResult {
  ok: boolean
  error?: string
  rows?: BaseRow[]
  value?: bigint
  bitLength?: number
  byteLength?: number
  decimalDigitCount?: number
}

/** 一次算出四个常用进制 + 可选的自定义目标进制 */
export function convertAll(input: string, fromBase: number, targetBase?: number): ConversionResult {
  const parsed = parseInBase(input, fromBase)
  if (!parsed.ok || parsed.value === undefined) {
    return { ok: false, error: parsed.error ?? '无法解析' }
  }
  const value = parsed.value
  const rows: BaseRow[] = quickBases.map((option) => ({
    ...option,
    value: toBase(value, option.base)
  }))
  if (targetBase !== undefined && isValidBase(targetBase) && !quickBases.some((option) => option.base === targetBase)) {
    rows.push({ base: targetBase, label: `${targetBase} 进制`, value: toBase(value, targetBase) })
  }
  const magnitude = value < 0n ? -value : value
  const bits = magnitude === 0n ? 1 : magnitude.toString(2).length
  return {
    ok: true,
    rows,
    value,
    bitLength: bits,
    byteLength: Math.ceil(bits / 8),
    decimalDigitCount: magnitude.toString(10).length
  }
}

/** 大数按 4 位一组书写，便于人工核对位数 */
export function groupByFour(value: string): string {
  const negative = value.startsWith('-')
  const body = negative ? value.slice(1) : value
  return (negative ? '-' : '') + body.replace(/\B(?=(.{4})+(?!.))/g, ' ')
}

/** 逐位权值展开，例如 F A → 15×16^1 + 10×16^0，用于教学展示 */
export function placeValueBreakdown(input: string, base: number): string {
  const body = stripPrefix(input.trim().replace(/[\s_]/g, ''), base).replace(/^[+-]/, '').toUpperCase()
  if (!body || !isValidBase(base)) return ''
  const allowed = digitSetOf(base)
  return [...body]
    .map((char, index) => {
      const digit = allowed.indexOf(char)
      if (digit < 0) return ''
      return `${digit}×${base}^${body.length - index - 1}`
    })
    .filter(Boolean)
    .join(' + ')
}

/**
 * RFC 4648 的 Base32 数字表：A–Z 表示 0–25，2–7 表示 26–31。
 * 与 `parseInBase(x, 32)` 用的 `0–9A–V` **是两套不同的字母表**，同一个数写出来不一样。
 */
export const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function toBase32(value: bigint): string {
  const negative = value < 0n
  let magnitude = negative ? -value : value
  const radix = BigInt(BASE32_ALPHABET.length)
  let out = ''
  do {
    out = BASE32_ALPHABET[Number(magnitude % radix)] + out
    magnitude /= radix
  } while (magnitude > 0n)
  return negative ? `-${out}` : out
}

/** 末尾的 `=` 是 RFC 4648 的字节填充符，按整数读时直接丢掉 */
export function parseBase32(input: string): ParseResult {
  const raw = input.trim().replace(/[\s_]/g, '').replace(/=+$/, '')
  if (!raw) return { ok: false, error: '输入为空' }
  const negative = raw.startsWith('-')
  const body = negative || raw.startsWith('+') ? raw.slice(1) : raw
  if (!body) return { ok: false, error: '只有符号，缺少数字' }

  const parsed = accumulate(body, BASE32_ALPHABET, 32, 'Base32')
  if (!parsed.ok) return parsed
  const value = parsed.value ?? 0n
  return { ok: true, value: negative ? -value : value, negative }
}

export const BIT_WIDTHS = [8, 16, 32, 64] as const

export type BitOp = 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr'

export interface BitOpOption {
  value: BitOp
  label: string
  symbol: string
  /** NOT 只有一个操作数；移位用第二个操作数当位移量而不是当掩码 */
  arity: 1 | 2
  shift: boolean
}

export const bitOps: BitOpOption[] = [
  { value: 'and', label: '按位与 AND', symbol: 'A & B', arity: 2, shift: false },
  { value: 'or', label: '按位或 OR', symbol: 'A | B', arity: 2, shift: false },
  { value: 'xor', label: '按位异或 XOR', symbol: 'A ^ B', arity: 2, shift: false },
  { value: 'not', label: '按位取反 NOT', symbol: '~A', arity: 1, shift: false },
  { value: 'shl', label: '左移', symbol: 'A << B', arity: 2, shift: true },
  { value: 'shr', label: '右移', symbol: 'A >> B', arity: 2, shift: true }
]

export const bitOpOf = (op: BitOp): BitOpOption =>
  bitOps.find((option) => option.value === op) ?? bitOps[0]

export interface BitwiseResult {
  ok: boolean
  error?: string
  width: number
  /** 操作数按本位宽补码截断后的无符号值 */
  a: bigint
  b: bigint
  /** 结果，同样落在 [0, 2^width) 内 */
  value: bigint
  /** 同位宽下按最高位为符号位解读 */
  signed: bigint
  bitsA: string
  bitsB: string
  bitsValue: string
  overflow: boolean
}

function padBits(value: bigint, width: number): string {
  return value.toString(2).padStart(width, '0')
}

/**
 * 定点宽度的按位运算。BigInt 的 `&` / `|` / `^` / `~` 本身就是**无限位补码**，
 * 所以负操作数不用特殊处理，`a & mask` 直接就是它在本位宽下的补码表示。
 * 唯一要显式处理的是逻辑右移：先截断再 `>>`，否则负数会一直移出 1。
 */
export function bitwise(a: bigint, b: bigint, op: BitOp, width: number): BitwiseResult {
  const option = bitOpOf(op)
  if (!BIT_WIDTHS.includes(width as (typeof BIT_WIDTHS)[number])) {
    return { ok: false, error: '位宽只能选 8 / 16 / 32 / 64', width, a, b, value: 0n, signed: 0n, bitsA: '', bitsB: '', bitsValue: '', overflow: false }
  }
  const bits = BigInt(width)
  const mask = (1n << bits) - 1n
  const signBit = 1n << (bits - 1n)
  const ua = a & mask
  const ub = b & mask
  const shift = Number(ub)
  if (option.shift && (b < 0n || shift > width)) {
    return { ok: false, error: `位移量必须是 0–${width} 之间的整数`, width, a: ua, b: ub, value: 0n, signed: 0n, bitsA: '', bitsB: '', bitsValue: '', overflow: false }
  }

  let value: bigint
  switch (option.value) {
    case 'and':
      value = ua & ub
      break
    case 'or':
      value = ua | ub
      break
    case 'xor':
      value = ua ^ ub
      break
    case 'not':
      value = ~ua & mask
      break
    case 'shl':
      value = (ua << BigInt(shift)) & mask
      break
    case 'shr':
      value = ua >> BigInt(shift)
      break
    default:
      value = ua
  }

  // 左移被截掉的 1 是本位宽下真实发生的溢出，值得单独提示
  const overflow = option.value === 'shl' && shift > 0 && (ua & (mask << BigInt(width - shift))) > 0n
  return {
    ok: true,
    width,
    a: ua,
    b: ub,
    value,
    signed: value & signBit ? value - (1n << bits) : value,
    bitsA: padBits(ua, width),
    bitsB: option.arity === 1 ? '' : padBits(option.shift ? BigInt(shift) : ub, width),
    bitsValue: padBits(value, width),
    overflow
  }
}
