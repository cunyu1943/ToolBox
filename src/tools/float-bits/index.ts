/**
 * IEEE 754 浮点位视图内核（纯函数）。
 *
 * 覆盖 binary16 / binary32 / binary64：正向「十进制 → 位布局」，反向「位串 → 数值」。
 * 精确十进制展开走 BigInt，因此能如实写出 0.1 真正存下的那 55 位小数，而不是 `0.1`。
 */

export type FloatPrecision = 16 | 32 | 64

export interface Layout {
  precision: FloatPrecision
  name: string
  alias: string
  expBits: number
  fracBits: number
  bias: number
  maxExponent: number
  minNormalExponent: number
}

export const LAYOUTS: Record<FloatPrecision, Layout> = {
  16: {
    precision: 16, name: 'binary16', alias: 'half / float16',
    expBits: 5, fracBits: 10, bias: 15, maxExponent: 15, minNormalExponent: -14
  },
  32: {
    precision: 32, name: 'binary32', alias: 'float / 单精度',
    expBits: 8, fracBits: 23, bias: 127, maxExponent: 127, minNormalExponent: -126
  },
  64: {
    precision: 64, name: 'binary64', alias: 'double / 双精度（JS Number）',
    expBits: 11, fracBits: 52, bias: 1023, maxExponent: 1023, minNormalExponent: -1022
  }
}

export const FLOAT_PRECISIONS: FloatPrecision[] = [16, 32, 64]

export type Classification = 'zero' | 'subnormal' | 'normal' | 'infinity' | 'nan'

export const CLASSIFICATION_CN: Record<Classification, string> = {
  zero: '零',
  subnormal: '次正规数',
  normal: '正规数',
  infinity: '无穷大',
  nan: 'NaN'
}

export interface FloatView {
  layout: Layout
  signBit: string
  expBit: string
  fracBit: string
  bits: string
  bitsGrouped: string
  biasedExponent: number
  unbiasedExponent: number
  /** 有效数字（正规数含隐藏位）的整数值；配合 exp2 即可还原该值 */
  significand: string
  mantissaBig: bigint
  negative: boolean
  /** value = (-1)^sign × significand × 2^exp2 */
  exp2: number
  classification: Classification
  /** JS 侧读到的值（binary16 由本模块解码） */
  value: number
  /** JS 的 toString，即「最短往返」表示 */
  shortForm: string
  /** 该位模式表示的精确十进制（无穷/NaN 时为字面量） */
  exactDecimal: string
  exactDigits: { integer: number; fraction: number }
  /** 相邻可表示值与本值的间距（精确十进制） */
  ulpDecimal: string
  nextUp: number
  nextDown: number
  /** 实际占用的有效位数 */
  significantBits: number
  notes: string[]
}

/** 把 mant × 2^exp2 写成精确十进制（不做四舍五入，只去掉小数末尾多余的 0） */
export function exactDecimalOf(mantissa: bigint, exp2: number): string {
  if (mantissa === 0n) return '0'
  if (exp2 >= 0) return (mantissa << BigInt(exp2)).toString()

  const shift = -exp2
  // mant × 2^-shift = mant × 5^shift / 10^shift
  const digits = (mantissa * 5n ** BigInt(shift)).toString()
  if (digits.length <= shift) {
    const fraction = '0'.repeat(shift - digits.length) + digits
    return `0.${fraction.replace(/0+$/, '') || '0'}`
  }
  const cut = digits.length - shift
  const integer = digits.slice(0, cut)
  const fraction = digits.slice(cut).replace(/0+$/, '')
  return fraction ? `${integer}.${fraction}` : integer
}

interface DecimalLiteral {
  sign: 1 | -1
  digits: string
  exp10: number
}

function splitDecimal(text: string): DecimalLiteral | null {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text)
  if (!match) return null
  const [, signPart = '', intPart = '', fracPart = '', expPart = ''] = match
  const digits = `${intPart}${fracPart}`
  if (!digits) return null
  const exp10 = (expPart ? Number.parseInt(expPart, 10) : 0) - fracPart.length
  return { sign: signPart === '-' ? -1 : 1, digits, exp10 }
}

/** 十进制字面量的精确值 = num / den */
function decimalRatio(literal: DecimalLiteral): { num: bigint; den: bigint } {
  const base = BigInt(literal.digits)
  const magnitude = literal.exp10 >= 0
    ? { num: base * 10n ** BigInt(literal.exp10), den: 1n }
    : { num: base, den: 10n ** BigInt(-literal.exp10) }
  return literal.sign < 0 ? { num: -magnitude.num, den: magnitude.den } : magnitude
}

function binaryRatio(mantissa: bigint, exp2: number): { num: bigint; den: bigint } {
  return exp2 >= 0
    ? { num: mantissa << BigInt(exp2), den: 1n }
    : { num: mantissa, den: 1n << BigInt(-exp2) }
}

function sameRatio(a: { num: bigint; den: bigint }, b: { num: bigint; den: bigint }): boolean {
  return a.num * b.den === b.num * a.den
}

function group4(bits: string): string {
  return (bits.match(/.{1,4}/g) ?? []).join(' ')
}

function roundHalfEven(x: number): number {
  const floor = Math.floor(x)
  const diff = x - floor
  if (diff > 0.5) return floor + 1
  if (diff < 0.5) return floor
  return floor % 2 === 0 ? floor : floor + 1
}

/** binary16 没有原生 TypedArray（兼容性优先），按规范手写「最近偶数」编码 */
function halfToBits(value: number): number {
  const layout = LAYOUTS[16]
  if (Number.isNaN(value)) return 0x7e00
  const sign = value < 0 || Object.is(value, -0) ? 0x8000 : 0
  const abs = Math.abs(value)
  if (abs === 0) return sign
  // 65504 与下一个可表示值（2^16）的中点是 65520，达到即进位成无穷
  if (abs >= 65520 || abs === Infinity) return sign | 0x7c00

  let exponent = Math.floor(Math.log2(abs))
  while (2 ** exponent > abs) exponent -= 1
  while (2 ** (exponent + 1) <= abs) exponent += 1

  if (exponent < layout.minNormalExponent) {
    const mantissa = roundHalfEven(abs * 2 ** (layout.fracBits + 14))
    return sign | (mantissa >= 0x400 ? 0x0400 : mantissa)
  }

  let fraction = roundHalfEven((abs / 2 ** exponent - 1) * 2 ** layout.fracBits)
  let biased = exponent + layout.bias
  if (fraction >= 0x400) {
    fraction = 0
    biased += 1
    if (biased >= 0x1f) return sign | 0x7c00
  }
  return sign | (biased << layout.fracBits) | fraction
}

function halfFromBits(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1
  const biased = (bits >> LAYOUTS[16].fracBits) & 0x1f
  const fraction = bits & 0x3ff
  if (biased === 0) return sign * fraction * 2 ** -24
  if (biased === 0x1f) return fraction ? Number.NaN : sign * Infinity
  return sign * (1 + fraction / 2 ** LAYOUTS[16].fracBits) * 2 ** (biased - LAYOUTS[16].bias)
}

function bitsOfNumber(value: number, precision: FloatPrecision): bigint {
  if (precision === 16) return BigInt(halfToBits(value))
  const view = new DataView(new ArrayBuffer(precision / 8))
  if (precision === 32) {
    view.setFloat32(0, value, false)
    return BigInt(view.getUint32(0, false))
  }
  view.setFloat64(0, value, false)
  return view.getBigUint64(0, false)
}

function numberFromBits(bits: bigint, precision: FloatPrecision): number {
  if (precision === 16) return halfFromBits(Number(bits) & 0xffff)
  const view = new DataView(new ArrayBuffer(precision / 8))
  if (precision === 32) {
    view.setUint32(0, Number(BigInt.asUintN(32, bits)), false)
    return view.getFloat32(0, false)
  }
  view.setBigUint64(0, BigInt.asUintN(64, bits), false)
  return view.getFloat64(0, false)
}

/** 由位模式生成视图：两个方向共用这一个核心 */
function viewFromBits(bits: bigint, precision: FloatPrecision): FloatView {
  const layout = LAYOUTS[precision]
  const total = layout.expBits + layout.fracBits + 1
  const signMask = 1n << BigInt(total - 1)
  const expMask = (1n << BigInt(layout.expBits)) - 1n
  const fracMask = (1n << BigInt(layout.fracBits)) - 1n

  const signBit = Number((bits & signMask) >> BigInt(total - 1))
  const biasedExponent = Number((bits >> BigInt(layout.fracBits)) & expMask)
  const fraction = Number(bits & fracMask)

  const bitsText = bits.toString(2).padStart(total, '0')
  const unbiasedExponent = biasedExponent - layout.bias
  const allOnes = Number(expMask)
  // 尾数最高位即 quiet 位；binary64 的 fraction 超出 32 位，不能用 & 直接测
  const quietMask = 2 ** (layout.fracBits - 1)
  const isQuietNaN = fraction >= quietMask
  const notes: string[] = []

  let classification: Classification
  let mantissa: bigint
  let exp2: number
  if (biasedExponent === allOnes) {
    classification = fraction === 0 ? 'infinity' : 'nan'
    mantissa = BigInt(fraction)
    exp2 = 0
    if (classification === 'nan') {
      notes.push(isQuietNaN ? '静默 NaN（qNaN，尾数最高位为 1）' : '信号 NaN（sNaN）')
    }
  } else if (biasedExponent === 0) {
    classification = fraction === 0 ? 'zero' : 'subnormal'
    mantissa = BigInt(fraction)
    exp2 = 1 - layout.bias - layout.fracBits
    if (classification === 'subnormal') {
      notes.push(
        `隐藏位为 0：这是次正规数，指数固定在 2^${exp2}，有效位只剩 ${mantissa.toString(2).length} / ${layout.fracBits} 位`
      )
    }
  } else {
    classification = 'normal'
    mantissa = BigInt(2 ** layout.fracBits + fraction)
    exp2 = unbiasedExponent - layout.fracBits
  }

  const negative = signBit === 1
  const value = negative ? -numberFromBits(bits & ~signMask, precision) : numberFromBits(bits, precision)

  // 位模式按无符号数排布时，正半轴单调递增、负半轴单调递减，因此 ±1 ulp 就是 ±1
  let nextUp: number
  let nextDown: number
  if (classification === 'nan') {
    nextUp = Number.NaN
    nextDown = Number.NaN
  } else if (classification === 'infinity') {
    nextUp = value
    nextDown = numberFromBits(negative ? bits + 1n : bits - 1n, precision)
    notes.push(negative ? '已是最小值方向：向 −∞ 一步不改变值，向上一步是有限最大负数' : '已是 +∞：向上仍是 +∞，向下一步是有限最大正数')
  } else if (negative) {
    nextUp = numberFromBits(bits > signMask ? bits - 1n : 1n, precision)
    nextDown = numberFromBits(bits + 1n, precision)
  } else {
    nextUp = numberFromBits(bits + 1n, precision)
    nextDown = bits > 0n ? numberFromBits(bits - 1n, precision) : -numberFromBits(1n, precision)
  }

  const exact = exactDecimalOf(mantissa, exp2)
  const [integerDigits = '', fractionDigits = ''] = exact.split('.')
  const ulpExp = classification === 'normal' || classification === 'infinity' || classification === 'nan'
    ? unbiasedExponent - layout.fracBits
    : 1 - layout.bias - layout.fracBits

  return {
    layout,
    signBit: signBit.toString(),
    expBit: bitsText.slice(1, 1 + layout.expBits),
    fracBit: bitsText.slice(1 + layout.expBits),
    bits: bitsText,
    bitsGrouped: group4(bitsText),
    biasedExponent,
    unbiasedExponent,
    significand: mantissa.toString(),
    mantissaBig: mantissa,
    negative,
    exp2,
    classification,
    value,
    shortForm:
      Number.isNaN(value) ? 'NaN'
        : value === Infinity ? 'Infinity'
          : value === -Infinity ? '-Infinity'
            : Object.is(value, -0) ? '-0' : value.toString(),
    exactDecimal:
      classification === 'nan' ? 'NaN'
        : classification === 'infinity' ? (negative ? '-Infinity' : 'Infinity')
          : negative && mantissa !== 0n ? `-${exact}` : exact,
    exactDigits:
      classification === 'nan' || classification === 'infinity'
        ? { integer: 0, fraction: 0 }
        : { integer: integerDigits.length, fraction: fractionDigits.length },
    ulpDecimal:
      classification === 'nan' ? '—' : classification === 'infinity' ? '—' : exactDecimalOf(1n, ulpExp),
    nextUp,
    nextDown,
    significantBits: mantissa === 0n ? 0 : mantissa.toString(2).length,
    notes
  }
}

export interface NumberInspectResult {
  ok: boolean
  error: string
  views: FloatView[]
  /** 该精度能否精确表示输入；null 表示溢出成无穷 */
  lossless: (boolean | null)[]
  /** 输入字符串自己的精确十进制展开 */
  inputExact: string
  inputDigits: { integer: number; fraction: number }
  notes: string[]
}

function failNumber(error: string): NumberInspectResult {
  return {
    ok: false, error, views: [], lossless: [], inputExact: '',
    inputDigits: { integer: 0, fraction: 0 }, notes: []
  }
}

/** 把十进制字面量原样展开成精确小数（0.1 → 0.1，1e-3 → 0.001，1.23e5 → 123000） */
function expandLiteral(literal: DecimalLiteral): string {
  const clean = literal.digits.replace(/^0+(?=\d)/, '')
  const negative = literal.sign < 0 && clean.replace(/^0+/, '') !== ''
  let text: string
  if (literal.exp10 >= 0) {
    text = clean + '0'.repeat(literal.exp10)
  } else if (clean.length > -literal.exp10) {
    const cut = clean.length + literal.exp10
    text = `${clean.slice(0, cut)}.${clean.slice(cut)}`
  } else {
    text = `0.${'0'.repeat(-literal.exp10 - clean.length)}${clean}`
  }
  return negative ? `-${text}` : text
}

export function inspectNumber(input: string): NumberInspectResult {
  const text = input.trim()
  if (!text) return failNumber('请输入一个十进制数')

  /** 各格式的 qNaN 位模式：指数全 1 + 尾数最高位 1 */
  const qNaNPattern = (precision: FloatPrecision, negative: boolean): bigint => {
    const layout = LAYOUTS[precision]
    const total = layout.expBits + layout.fracBits + 1
    const expAll = (1n << BigInt(layout.expBits)) - 1n
    return (
      (negative ? 1n << BigInt(total - 1) : 0n) |
      (expAll << BigInt(layout.fracBits)) |
      (1n << BigInt(layout.fracBits - 1))
    )
  }
  /** 各格式的无穷位模式：指数全 1 + 尾数全 0 */
  const infinityPattern = (precision: FloatPrecision, negative: boolean): bigint => {
    const layout = LAYOUTS[precision]
    const total = layout.expBits + layout.fracBits + 1
    const expAll = (1n << BigInt(layout.expBits)) - 1n
    return (negative ? 1n << BigInt(total - 1) : 0n) | (expAll << BigInt(layout.fracBits))
  }

  if (/^[-+]?nan$/i.test(text)) {
    const negative = text.startsWith('-')
    const views = FLOAT_PRECISIONS.map((precision) => viewFromBits(qNaNPattern(precision, negative), precision))
    return {
      ok: true, error: '', views, lossless: [true, true, true], inputExact: 'NaN',
      inputDigits: { integer: 3, fraction: 0 },
      notes: ['NaN 的位模式不唯一，这里给出各格式的 qNaN（指数全 1、尾数最高位为 1）']
    }
  }

  if (/^[-+]?(inf|infinity)$/i.test(text)) {
    const negative = text.startsWith('-')
    const views = FLOAT_PRECISIONS.map((precision) => viewFromBits(infinityPattern(precision, negative), precision))
    return {
      ok: true, error: '', views, lossless: [true, true, true],
      inputExact: negative ? '-Infinity' : 'Infinity', inputDigits: { integer: 8, fraction: 0 },
      notes: ['无穷大：指数位全 1 且尾数全 0；它不是某个实数的近似值']
    }
  }

  const literal = splitDecimal(text)
  if (!literal) return failNumber('只接受十进制字面量（可带小数点与 e 指数），例如 0.1、-3.5、1e-8')

  const value = Number(text)
  if (Number.isNaN(value)) return failNumber('无法解析为数值')

  const ratio = decimalRatio(literal)
  const views: FloatView[] = []
  const lossless: (boolean | null)[] = []
  const notes: string[] = []

  for (const precision of FLOAT_PRECISIONS) {
    const layout = LAYOUTS[precision]
    const view = viewFromBits(bitsOfNumber(value, precision), precision)
    views.push(view)

    if (view.classification === 'infinity') {
      lossless.push(null)
      notes.push(`${layout.name} 溢出为 ${view.value > 0 ? '+' : '−'}∞：绝对值超出该格式上限`)
      continue
    }
    if (view.mantissaBig === 0n) {
      lossless.push(ratio.num === 0n)
      if (ratio.num !== 0n) notes.push(`${layout.name} 下该值小于最小次正规数，被整体舍入为 0`)
      continue
    }
    const exact = sameRatio(binaryRatio(view.negative ? -view.mantissaBig : view.mantissaBig, view.exp2), ratio)
    lossless.push(exact)
    if (!exact) {
      view.notes.push('输入无法被该格式精确表示，位布局展示的是「最近偶数」舍入后的真实存储值')
    } else if (view.classification === 'subnormal') {
      view.notes.push('次正规数仍能精确表示该输入，只是有效位变少')
    }
  }

  const exactText = expandLiteral(literal)
  const [integer = '', fraction = ''] = exactText.split('.')
  return {
    ok: true,
    error: '',
    views,
    lossless,
    inputExact: exactText,
    inputDigits: { integer: integer.replace(/^-/, '').length, fraction: fraction.length },
    notes
  }
}

export interface BitsInspectResult {
  ok: boolean
  error: string
  view?: FloatView
  precision?: FloatPrecision
}

/** 反向：位串 → 数值。空格 / 下划线 / 逗号会被忽略，长度自动判定精度 */
export function inspectBits(input: string, forced?: FloatPrecision): BitsInspectResult {
  const cleaned = input.replace(/[\s_,|.]/g, '')
  if (!cleaned) return { ok: false, error: '请输入 16、32 或 64 位二进制位串' }
  if (!/^[01]+$/.test(cleaned)) return { ok: false, error: '位串只能包含 0 和 1' }

  const detected = FLOAT_PRECISIONS.includes(cleaned.length as FloatPrecision)
    ? (cleaned.length as FloatPrecision)
    : null
  const precision = forced ?? detected
  if (!precision) {
    return { ok: false, error: `位串长度 ${cleaned.length} 不属于任何格式（16 / 32 / 64 位）` }
  }
  const layout = LAYOUTS[precision]
  if (cleaned.length !== layout.expBits + layout.fracBits + 1) {
    return { ok: false, error: `${layout.name} 需要 ${layout.expBits + layout.fracBits + 1} 位，当前 ${cleaned.length} 位` }
  }
  return { ok: true, error: '', view: viewFromBits(BigInt(`0b${cleaned}`), precision), precision }
}

/** 位串按「符号 | 指数 | 尾数」三段展示 */
export function segmentBits(view: FloatView): string {
  return `${view.signBit} ${view.expBit} ${view.fracBit}`
}

export const FLOAT_SAMPLES: { label: string; value: string }[] = [
  { label: '0.1（经典误差）', value: '0.1' },
  { label: '0.30000000000000004', value: '0.30000000000000004' },
  { label: '1（精确）', value: '1' },
  { label: '0.5（精确）', value: '0.5' },
  { label: '1/3 的十进制写法', value: '0.3333333333333333' },
  { label: '最大双精度', value: '1.7976931348623157e308' },
  { label: '最小正规数', value: '2.2250738585072014e-308' },
  { label: '最小次正规数', value: '5e-324' },
  { label: '65504（binary16 上限）', value: '65504' },
  { label: '70000（binary16 溢出）', value: '70000' },
  { label: '负零', value: '-0' },
  { label: 'NaN', value: 'NaN' }
]
