export interface CalcResult {
  ok: boolean
  value?: number
  error?: string
}

const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
const IDENT = /^[A-Za-zπτ][A-Za-z0-9_]*/

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  tau: Math.PI * 2,
  τ: Math.PI * 2,
  e: Math.E
}

/** range 为参数个数区间，[2, 2] 表示恰好 2 个 */
const FUNCTIONS: Record<string, { range: [number, number]; apply: (args: number[]) => number }> = {
  sqrt: { range: [1, 1], apply: ([x]) => Math.sqrt(x) },
  cbrt: { range: [1, 1], apply: ([x]) => Math.cbrt(x) },
  abs: { range: [1, 1], apply: ([x]) => Math.abs(x) },
  round: { range: [1, 1], apply: ([x]) => Math.round(x) },
  floor: { range: [1, 1], apply: ([x]) => Math.floor(x) },
  ceil: { range: [1, 1], apply: ([x]) => Math.ceil(x) },
  ln: { range: [1, 1], apply: ([x]) => Math.log(x) },
  log: { range: [1, 2], apply: ([x, base]) => (base === undefined ? Math.log10(x) : Math.log(x) / Math.log(base)) },
  log2: { range: [1, 1], apply: ([x]) => Math.log2(x) },
  exp: { range: [1, 1], apply: ([x]) => Math.exp(x) },
  pow: { range: [2, 2], apply: ([a, b]) => a ** b },
  min: { range: [2, 8], apply: (args) => Math.min(...args) },
  max: { range: [2, 8], apply: (args) => Math.max(...args) }
}

export const functionNames = Object.keys(FUNCTIONS)

/** 中文/排版输入常见的等价符号，在解析前统一 */
const ALIASES: [string, string][] = [
  ['×', '*'], ['✕', '*'], ['∗', '*'],
  ['÷', '/'],
  ['−', '-'], ['–', '-'],
  ['（', '('], ['）', ')'],
  ['，', ','],
  ['＾', '^'], ['。', '.']
]

/** 去掉千分位逗号（1,234,567 → 1234567），只用后瞻以保持 Safari 兼容 */
function stripGroupingCommas(source: string): string {
  let previous = ''
  let out = source
  while (previous !== out) {
    previous = out
    out = out.replace(/(\d),(\d{3})(?!\d)/g, '$1$2')
  }
  return out
}

export function normalizeExpression(source: string): string {
  let out = source
  for (const [from, to] of ALIASES) out = out.split(from).join(to)
  return stripGroupingCommas(out)
}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: string }
  | { kind: 'fn'; value: string }
  | { kind: 'const'; value: number }
  | { kind: 'open'; value: string }
  | { kind: 'close'; value: string }
  | { kind: 'comma'; value: string }

class CalcError extends Error {}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  while (index < source.length) {
    const char = source[index] as string
    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (/[0-9.]/.test(char)) {
      const matched = NUMBER.exec(source.slice(index))
      if (!matched) throw new CalcError(`无法解析的数字：「${source.slice(index, index + 8)}」`)
      const value = Number.parseFloat(matched[0])
      if (!Number.isFinite(value)) throw new CalcError(`数字「${matched[0]}」不合法`)
      tokens.push({ kind: 'num', value })
      index += matched[0].length
      continue
    }
    if (/[A-Za-zπτ]/.test(char)) {
      const word = (IDENT.exec(source.slice(index))?.[0] ?? char).toLowerCase()
      const length = word === 'π' || word === 'τ' ? 1 : word.length
      if (FUNCTIONS[word]) {
        tokens.push({ kind: 'fn', value: word })
        index += length
        continue
      }
      if (CONSTANTS[word] !== undefined) {
        tokens.push({ kind: 'const', value: CONSTANTS[word] as number })
        index += length
        continue
      }
      throw new CalcError(`未知的名称「${word}」。常量有 pi、tau、e；函数有 ${functionNames.join('、')}`)
    }
    if ('+-*/%^'.includes(char)) {
      tokens.push({ kind: 'op', value: char })
      index += 1
      continue
    }
    if (char === '(' || char === ')' || char === ',') {
      tokens.push({ kind: char === '(' ? 'open' : char === ')' ? 'close' : 'comma', value: char })
      index += 1
      continue
    }
    throw new CalcError(`无法识别的字符「${char}」`)
  }
  return tokens
}

/**
 * 递归下降求值。一元负号结合得比幂松，所以 -2^2 = -4，2^-3 = 0.125：
 *   expr  := term (('+'|'-') term)*
 *   term  := unary (('*'|'/'|'%') unary)*
 *   unary := ('+'|'-') unary | power
 *   power := atom ('^' unary)?
 */
class Parser {
  private pos = 0

  private readonly tokens: Token[]

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private isOp(...symbols: string[]): boolean {
    const token = this.peek()
    return token?.kind === 'op' && symbols.includes(token.value)
  }

  private eat(kind: Token['kind']): boolean {
    if (this.peek()?.kind !== kind) return false
    this.pos += 1
    return true
  }

  parse(): number {
    const value = this.expr()
    const rest = this.peek()
    if (rest) {
      throw new CalcError(
        rest.kind === 'close' ? '括号不匹配：多了一个右括号' : `意外的符号「${rest.value}」`
      )
    }
    return value
  }

  private expr(): number {
    let value = this.term()
    while (this.isOp('+', '-')) {
      const op = (this.peek() as { value: string }).value
      this.pos += 1
      const rhs = this.term()
      value = op === '+' ? value + rhs : value - rhs
    }
    return value
  }

  private term(): number {
    let value = this.unary()
    while (this.isOp('*', '/', '%')) {
      const op = (this.peek() as { value: string }).value
      this.pos += 1
      const rhs = this.unary()
      if (op === '*') value *= rhs
      else if (op === '/') {
        if (rhs === 0) throw new CalcError('除以零没有定义')
        value /= rhs
      } else {
        if (rhs === 0) throw new CalcError('取余的除数不能为零')
        value %= rhs
      }
    }
    return value
  }

  private unary(): number {
    if (this.isOp('-')) {
      this.pos += 1
      return -this.unary()
    }
    if (this.isOp('+')) {
      this.pos += 1
      return this.unary()
    }
    return this.power()
  }

  private power(): number {
    const base = this.atom()
    if (this.isOp('^')) {
      this.pos += 1
      return base ** this.unary()
    }
    return base
  }

  private argumentList(): number[] {
    if (!this.eat('open')) throw new CalcError('函数名后面需要左括号')
    const list: number[] = []
    if (this.peek()?.kind !== 'close') {
      do {
        list.push(this.expr())
      } while (this.eat('comma'))
    }
    if (!this.eat('close')) throw new CalcError('括号不匹配：缺少右括号')
    return list
  }

  private atom(): number {
    const token = this.peek()
    if (!token) throw new CalcError('表达式在期望数字时结束了')
    this.pos += 1
    if (token.kind === 'num') return token.value
    if (token.kind === 'const') return token.value
    if (token.kind === 'open') {
      const value = this.expr()
      if (!this.eat('close')) throw new CalcError('括号不匹配：缺少右括号')
      return value
    }
    if (token.kind === 'fn') {
      const spec = FUNCTIONS[token.value]
      const list = this.argumentList()
      const [min, max] = spec.range
      if (list.length < min || list.length > max) {
        throw new CalcError(
          min === max
            ? `${token.value}() 需要 ${min} 个参数，收到 ${list.length} 个`
            : `${token.value}() 需要 ${min}–${max} 个参数，收到 ${list.length} 个`
        )
      }
      return spec.apply(list)
    }
    throw new CalcError(`意外的符号「${token.value}」`)
  }
}

export function evaluateExpression(source: string): CalcResult {
  const text = normalizeExpression(source)
  if (!text.trim()) return { ok: false, error: '表达式为空' }
  try {
    const value = new Parser(tokenize(text)).parse()
    if (Number.isNaN(value)) {
      return { ok: false, error: '结果是 NaN：检查是否对负数开偶次根、或取了对 0/负数的对数' }
    }
    if (!Number.isFinite(value)) return { ok: false, error: '结果溢出为无穷大，请缩小数值' }
    return { ok: true, value }
  } catch (error) {
    if (error instanceof CalcError) return { ok: false, error: error.message }
    return { ok: false, error: '表达式无法解析' }
  }
}

/** 12 位有效数字四舍五入，顺带抹掉 0.1+0.2 这类二进制浮点噪声 */
export function roundSignificant(value: number, digits = 12): number {
  if (!Number.isFinite(value) || value === 0) return value
  return Number.parseFloat(value.toPrecision(digits))
}

/**
 * 始终只展示 12 位有效数字：超过 1e12 或小于 1e-6 改用科学计数法，
 * 避免把补零后的位数当成有效精度（例如 2^53 不会显示成 …740000）。
 */
export function formatNumber(value: number): string {
  const rounded = roundSignificant(value)
  if (rounded === 0) return '0'
  const abs = Math.abs(rounded)
  if (abs >= 1e12 || abs < 1e-6) {
    return rounded
      .toExponential(11)
      .replace(/(\.\d*?)0+e/, '$1e')
      .replace(/\.e/, 'e')
  }
  return String(rounded)
}

/** 只给纯十进制串的整数部分加千分位；含指数时原样返回，避免误导 */
export function groupThousands(value: string): string {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value
  const negative = value.startsWith('-')
  const int = negative ? value.slice(1) : value
  const [head, tail] = int.split('.')
  const grouped = (head as string).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (negative ? '-' : '') + grouped + (tail ? `.${tail}` : '')
}

export interface CalcEvaluation extends CalcResult {
  formatted: string
  grouped: string
}

export function calculate(source: string): CalcEvaluation {
  const result = evaluateExpression(source)
  if (!result.ok) return { ...result, formatted: '', grouped: '' }
  const formatted = formatNumber(result.value as number)
  return { ...result, formatted, grouped: groupThousands(formatted) }
}
