/**
 * 程序员计算器核心（纯函数，便于单元测试）。
 * 统一以「无符号、按字长截断」的 BigInt 作为规范值存储。
 */
export type BitWidth = 8 | 16 | 32 | 64
export type RadixKey = 'dec' | 'hex' | 'oct' | 'bin'
export type BitOp = 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr'

const RADIX_MAP: Record<RadixKey, 2 | 8 | 10 | 16> = { bin: 2, oct: 8, dec: 10, hex: 16 }
const PATTERN: Record<RadixKey, RegExp> = {
  dec: /^-?\d+$/, hex: /^[0-9a-fA-F]+$/, oct: /^[0-7]+$/, bin: /^[01]+$/
}

function widthMask(bits: BitWidth): bigint {
  return (1n << BigInt(bits)) - 1n
}

/** 按字长截断为无符号规范值（等价 n & mask）。 */
export function truncate(n: bigint, bits: BitWidth): bigint {
  return n & widthMask(bits)
}

/** 有符号（二进制补码）解释后的十进制字符串。 */
export function toSignedString(n: bigint, bits: BitWidth): string {
  const signBit = 1n << BigInt(bits - 1)
  return n & signBit ? String(n - (1n << BigInt(bits))) : String(n)
}

/** 校验某进制输入是否只含合法字符（空串视为合法）。 */
export function isValidRadixInput(key: RadixKey, str: string): boolean {
  return str === '' || PATTERN[key].test(str)
}

/** 解析某进制输入为规范无符号值；非法字符或溢出返回 error。 */
export function parseRadixInput(
  key: RadixKey,
  str: string,
  bits: BitWidth
): { value: bigint; error: string } | { value: null; error: string } {
  if (str === '') return { value: null, error: '' }
  if (!isValidRadixInput(key, str)) return { value: null, error: `${key.toUpperCase()} 输入含非法字符` }
  try {
    const n = key === 'dec' ? BigInt(str) : BigInt(asRadixString(key, str))
    return { value: truncate(n, bits), error: '' }
  } catch {
    return { value: null, error: '数值过大或无法解析' }
  }
}

/** 给 BigInt 补上 JS 可识别的进制前缀字面量。 */
function asRadixString(key: RadixKey, str: string): string {
  if (key === 'hex') return '0x' + str
  if (key === 'oct') return '0o' + str
  if (key === 'bin') return '0b' + str
  return str
}

/** 将规范值格式化为某进制的展示字符串（dec 走有符号解释）。 */
export function formatRadix(value: bigint, key: RadixKey, signed: boolean, bits: BitWidth): string {
  if (key === 'dec') return signed ? toSignedString(value, bits) : value.toString(10)
  if (key === 'hex') return value.toString(16).toUpperCase()
  if (key === 'oct') return value.toString(8)
  return value.toString(2)
}

/**
 * 执行位运算，返回新的规范值。
 * 移位位数须在 0–64；非移位运算的操作数按字长截断。
 */
export function applyBitwise(
  a: bigint,
  op: BitOp,
  operand: string,
  bits: BitWidth
): { value: bigint; error: string } {
  const mask = widthMask(bits)
  if (op === 'not') return { value: (~a) & mask, error: '' }

  if (op === 'shl' || op === 'shr') {
    const s = Number(operand)
    if (!Number.isInteger(s) || s < 0 || s > 64) return { value: a, error: '移位位数需为 0–64 的整数' }
    const b = BigInt(s)
    const v = op === 'shl' ? (a << b) & mask : truncate(a >> b, bits)
    return { value: v, error: '' }
  }

  if (!/^-?\d+$/.test(operand)) return { value: a, error: '操作数需为十进制整数' }
  const b = BigInt(operand) & mask
  const v =
    op === 'and' ? a & b
      : op === 'or' ? a | b
      : op === 'xor' ? a ^ b
      : a
  return { value: v & mask, error: '' }
}

/** 字节单位换算：1 KB = 1024 B。 */
export const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const
export type ByteUnit = (typeof BYTE_UNITS)[number]
const BYTE_FACTOR: Record<ByteUnit, number> = {
  B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4
}

/** 以 fromUnit 表示的 n，换算到所有单位的展示字符串。 */
export function convertBytes(n: number, fromUnit: ByteUnit): Record<ByteUnit, string> {
  const totalBytes = (Number.isFinite(n) ? n : 0) * BYTE_FACTOR[fromUnit]
  const out = {} as Record<ByteUnit, string>
  for (const u of BYTE_UNITS) {
    out[u] = (totalBytes / BYTE_FACTOR[u]).toLocaleString('en-US', { maximumFractionDigits: 4 })
  }
  return out
}

export { RADIX_MAP }
