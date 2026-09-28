/**
 * 罗马数字 ⇄ 阿拉伯数字（标准减记法，1 ~ 3999）。
 *
 * 正向：贪心减法表；反向：先按同样的表贪心展开，再用 `toRoman` 回编比对——
 * 不相等即非规范写法（`IIII`、`IL`、`VV` 这类都会在这里被拒），并给出对应的中文规则说明。
 * 3999 之上按标准写法需要「悬线」（overline，表示 ×1000），本工具不实现，只解释原因。
 */

export interface RomanSymbol {
  value: number
  symbol: string
}

export const ROMAN_SYMBOLS: RomanSymbol[] = [
  { value: 1000, symbol: 'M' },
  { value: 900, symbol: 'CM' },
  { value: 500, symbol: 'D' },
  { value: 400, symbol: 'CD' },
  { value: 100, symbol: 'C' },
  { value: 90, symbol: 'XC' },
  { value: 50, symbol: 'L' },
  { value: 40, symbol: 'XL' },
  { value: 10, symbol: 'X' },
  { value: 9, symbol: 'IX' },
  { value: 5, symbol: 'V' },
  { value: 4, symbol: 'IV' },
  { value: 1, symbol: 'I' }
]

export interface RomanPart {
  symbol: string
  value: number
}

export interface ArabicResult {
  ok: boolean
  roman?: string
  parts: RomanPart[]
  error?: string
  notes: string[]
}

export interface RomanParseResult {
  ok: boolean
  value?: number
  parts: RomanPart[]
  error?: string
  notes: string[]
}

const valueOf = (symbol: string): number => ROMAN_SYMBOLS.find((item) => item.symbol === symbol)?.value ?? 0

function expand(n: number): RomanPart[] {
  const parts: RomanPart[] = []
  let rest = n
  for (const item of ROMAN_SYMBOLS) {
    while (rest >= item.value) {
      parts.push(item)
      rest -= item.value
    }
  }
  return parts
}

/** 为什么只能到 3999：M 没有更大的一位符号，第四个千位要写 `MMMM` 或加悬线 */
export function toRoman(input: number | string): ArabicResult {
  const notes: string[] = []
  const raw = typeof input === 'number' ? String(input) : input.trim()
  if (!raw) return { ok: false, parts: [], error: '请输入一个整数', notes }
  if (!/^[+-]?\d+$/.test(raw)) {
    return { ok: false, parts: [], error: `「${raw}」不是整数（罗马数字没有小数、也没有零）`, notes }
  }
  const n = Number(raw)
  if (n === 0) {
    return { ok: false, parts: [], error: '罗马数字体系里没有 0——「零」是印度-阿拉伯数字的贡献', notes }
  }
  if (n < 0) {
    notes.push('古罗马写法没有负号，这里按惯例在正数写法前加 `-`')
    const positive = toRoman(-n)
    return { ...positive, roman: positive.roman ? `-${positive.roman}` : undefined, notes }
  }
  if (n > 3999) {
    return {
      ok: false,
      parts: [],
      error: `${n} 超出 3999：标准减记法里 M 已是最大符号，更大的数只能重复 M 或加悬线（overline 表示 ×1000），本工具只支持 1–3999`,
      notes
    }
  }
  const parts = expand(n)
  return { ok: true, roman: parts.map((part) => part.symbol).join(''), parts, notes }
}

/** 逐个字符给出符号值，用于「按符号展开」视图 */
export function breakdownRoman(roman: string): RomanPart[] {
  const parts: RomanPart[] = []
  const text = roman.trim().toUpperCase()
  let i = 0
  for (const item of ROMAN_SYMBOLS) {
    while (text.startsWith(item.symbol, i)) {
      parts.push(item)
      i += item.symbol.length
    }
    if (i === text.length) break
  }
  return parts
}

/** 非规范写法的分类说明，按优先级返回第一条命中的规则 */
function diagnose(text: string): string | undefined {
  if (/([IVXLCDM])\1{3}/.test(text)) return '同一个符号最多连写 3 次（4 要用减法形式，如 4 写 IV 而不是 IIII）'
  const pairs = new Set(['CM', 'CD', 'XC', 'XL', 'IX', 'IV'])
  const larger: Record<string, string[]> = { I: ['V', 'X'], X: ['L', 'C'], C: ['D', 'M'] }
  for (let i = 0; i < text.length - 1; i += 1) {
    const pair = text.slice(i, i + 2)
    if (pairs.has(pair)) continue
    const [a, b] = [...pair]
    const va = valueOf(a as string)
    const vb = valueOf(b as string)
    if (va > 0 && vb > 0 && va < vb) {
      const legal = larger[a as string] ?? []
      return `${pair} 不是合法的减记组合：${legal.length ? `${a} 只能放在 ${legal.join('/')} 之前` : `${a} 不能作减数（V、L、D 没有减记写法）`}`
    }
  }
  if (/V.*V|L.*L|D.*D/.test(text)) return 'V、L、D 代表 5、50、500，翻倍就该写成 X、C、M，所以最多出现一次'
  return undefined
}

/** 宽容求值：小值在大值前按减记处理。用于「解析出数值再回编比对」来判定是否规范 */
function lenientValue(text: string): number {
  let total = 0
  for (let i = 0; i < text.length; i += 1) {
    const value = valueOf(text[i] as string)
    const next = i + 1 < text.length ? valueOf(text[i + 1] as string) : 0
    total += value < next ? -value : value
  }
  return total
}

/** 解析罗马数字；接受小写，拒绝非规范写法并说明违反了哪条规则 */
export function fromRoman(text: string): RomanParseResult {
  const notes: string[] = []
  const upper = text.trim().toUpperCase()
  if (!upper) return { ok: false, parts: [], error: '请输入罗马数字，例如 MCMXCIV', notes }
  if (upper.startsWith('-')) {
    const inner = fromRoman(upper.slice(1))
    return { ...inner, value: inner.value === undefined ? undefined : -inner.value, notes: [...inner.notes, '按负数处理'] }
  }
  const illegal = [...new Set([...upper].filter((ch) => !'IVXLCDM'.includes(ch)))]
  if (illegal.length) {
    return { ok: false, parts: [], error: `「${illegal.join(' ')}」不是罗马数字符号（只有 I V X L C D M）`, notes }
  }

  let parts = breakdownRoman(upper)
  if (parts.reduce((sum, part) => sum + part.symbol.length, 0) !== upper.length) {
    parts = [...upper].map((ch) => ({ symbol: ch, value: valueOf(ch) }))
  }
  const value = lenientValue(upper)
  const canonical = toRoman(value)
  if (!canonical.ok) {
    return { ok: false, parts, value, error: canonical.error ?? '超出可表示范围', notes }
  }
  if (canonical.roman !== upper) {
    const reason = diagnose(upper)
    notes.push(`规范写法是 ${canonical.roman}`)
    return {
      ok: false,
      parts,
      value,
      error: `非规范写法：${reason ?? `按符号展开后与标准减法表回编的结果 ${canonical.roman} 不一致`}`,
      notes
    }
  }
  if (/[ivxlcdm]/.test(text.trim())) notes.push('已按大写读法处理（罗马数字不区分大小写）')
  if (value >= 1000) notes.push('四位数以上请核对是否把 `M` 误写成 `m` 或漏写')
  return { ok: true, value, parts, notes }
}

export const ROMAN_SAMPLES: { label: string; value: string }[] = [
  { label: '年份 2026', value: '2026' },
  { label: 'MDCLXVI', value: '1666' },
  { label: 'MMMCMXCIX', value: '3999' },
  { label: '非规范 IIII', value: 'IIII' },
  { label: '越界 4000', value: '4000' }
]
