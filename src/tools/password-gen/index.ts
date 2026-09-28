export const LOWER = 'abcdefghijklmnopqrstuvwxyz'
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const DIGITS = '0123456789'
export const DEFAULT_SYMBOLS = '!@#$%^&*()-_=+[]{}<>;:.?/'
/** 易混淆字符：大小写 I/l/1、O/0，以及 Z/2、S/5、B/8 等手写易错对 */
export const SIMILAR_CHARS = 'Il1|O0oZ2zS5B8b'

export const MIN_LENGTH = 6
export const MAX_LENGTH = 128

export type CharClassName = 'lower' | 'upper' | 'digits' | 'symbols'

export interface PasswordOptions {
  length: number
  enabled: Record<CharClassName, boolean>
  symbols: string
  avoidSimilar: boolean
  exclude: string
  everyClass: boolean
}

export const defaultPasswordOptions: PasswordOptions = {
  length: 20,
  enabled: { lower: true, upper: true, digits: true, symbols: true },
  symbols: DEFAULT_SYMBOLS,
  avoidSimilar: true,
  exclude: '',
  everyClass: true
}

const CLASS_LABELS: Record<CharClassName, string> = {
  lower: '小写 a–z',
  upper: '大写 A–Z',
  digits: '数字 0–9',
  symbols: '符号'
}

const uniq = (text: string): string => [...new Set(text)].join('')

export interface CharsetPlan {
  ok: boolean
  pool: string
  groups: { name: CharClassName; label: string; chars: string }[]
  removed: string
  warnings: string[]
  error?: string
}

export function buildCharset(options: PasswordOptions): CharsetPlan {
  const excluded = new Set(uniq(options.exclude ?? ''))
  const avoid = options.avoidSimilar ? new Set(SIMILAR_CHARS) : new Set<string>()
  const warnings: string[] = []
  const sources: Record<CharClassName, string> = {
    lower: LOWER,
    upper: UPPER,
    digits: DIGITS,
    symbols: options.symbols.trim() || DEFAULT_SYMBOLS
  }

  const groups: CharsetPlan['groups'] = []
  const removed = new Set<string>()

  for (const name of Object.keys(sources) as CharClassName[]) {
    if (!options.enabled[name]) continue
    const raw = sources[name]
    const deduped = uniq(raw)
    if (name === 'symbols' && deduped.length !== raw.length) warnings.push('自定义符号里有重复字符，已去重')

    const kept = [...deduped].filter((ch) => {
      if (excluded.has(ch) || avoid.has(ch)) {
        removed.add(ch)
        return false
      }
      return true
    })
    if (kept.length === 0) {
      warnings.push(`${CLASS_LABELS[name]} 的字符被全部排除，该字符类已忽略`)
      continue
    }
    groups.push({ name, label: CLASS_LABELS[name], chars: kept.join('') })
  }

  const pool = uniq(groups.map((group) => group.chars).join(''))
  const fail = (error: string): CharsetPlan => ({
    ok: false,
    pool,
    groups,
    removed: [...removed].join(''),
    warnings,
    error
  })

  if (groups.length === 0) return fail('至少启用一个字符类')
  return { ok: true, pool, groups, removed: [...removed].join(''), warnings }
}

export function clampLength(value: number): number {
  const int = Math.trunc(Number(value))
  if (!Number.isFinite(int)) return MIN_LENGTH
  return Math.min(Math.max(int, MIN_LENGTH), MAX_LENGTH)
}

const RANDOM_RANGE = 2 ** 32
const buffer = new Uint32Array(1024)
let cursor = buffer.length

/**
 * 均匀取 [0, maxExclusive) 的随机整数。
 * 用「拒绝采样」丢掉超出 `maxExclusive` 整数倍的余数区间，避免 `%` 取模的分布偏差。
 */
export function nextRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0
  const limit = Math.floor(RANDOM_RANGE / maxExclusive) * maxExclusive
  for (;;) {
    if (cursor >= buffer.length) {
      crypto.getRandomValues(buffer)
      cursor = 0
    }
    const value = buffer[cursor++] as number
    if (value < limit) return value % maxExclusive
  }
}

export function randomInts(count: number, maxExclusive: number): number[] {
  return Array.from({ length: Math.max(count, 0) }, () => nextRandomInt(maxExclusive))
}

/** Fisher–Yates，每一步用拒绝采样的随机数，保证排列均匀 */
export function shuffle(items: string[]): string[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = nextRandomInt(i + 1)
    const left = copy[i] as string
    copy[i] = copy[j] as string
    copy[j] = left
  }
  return copy
}

export interface Strength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  entropyBits: number
  guessesLog10: number
  yearsLog10: number
  hint: string
}

const STRENGTH_STEPS: { min: number; score: Strength['score']; label: string }[] = [
  { min: 100, score: 4, label: '极强' },
  { min: 80, score: 4, label: '很强' },
  { min: 64, score: 3, label: '强' },
  { min: 45, score: 2, label: '中等' },
  { min: 28, score: 1, label: '偏弱' },
  { min: 0, score: 0, label: '很弱' }
]

const LOG10_OF_2 = Math.log10(2)
/** 攻击强度假设：离线高速破解，每秒 10¹¹ 次尝试 */
const GUESSES_PER_SECOND_LOG10 = 11
const SECONDS_PER_YEAR_LOG10 = Math.log10(3.15576e7)

export function rateEntropy(entropyBits: number): Strength {
  const step = STRENGTH_STEPS.find((item) => entropyBits >= item.min) ?? (STRENGTH_STEPS[STRENGTH_STEPS.length - 1] as {
    min: number
    score: Strength['score']
    label: string
  })
  // 平均尝试次数是密钥空间的一半，故用 bits − 1
  const guessesLog10 = (entropyBits - 1) * LOG10_OF_2
  const yearsLog10 = guessesLog10 - GUESSES_PER_SECOND_LOG10 - SECONDS_PER_YEAR_LOG10
  const hint =
    yearsLog10 > 12
      ? '按每秒 10¹¹ 次暴力尝试也远超宇宙年龄'
      : yearsLog10 > 4
        ? '离线暴力破解需要万年量级'
        : yearsLog10 > 0
          ? '离线暴力破解需要数年量级'
          : '离线暴力破解可在短时间内完成'
  return { score: step.score, label: step.label, entropyBits, guessesLog10, yearsLog10, hint }
}

/** 把 log10 量级写成可读文本：`10^12.4`；不足 1 次显示 `< 1` */
export function powerOfTen(exponent: number): string {
  if (!Number.isFinite(exponent)) return '∞'
  if (exponent < 0) return '< 1'
  return `10^${exponent >= 100 ? Math.round(exponent) : exponent.toFixed(1)}`
}

/** 年份量级：超过 10¹² 年直接说「远超宇宙年龄」 */
export function yearsLabel(yearsLog10: number): string {
  return yearsLog10 > 12 ? '远超宇宙年龄' : `${powerOfTen(yearsLog10)} 年`
}

export interface GeneratedPassword {
  ok: boolean
  value: string
  error?: string
  length: number
  poolSize: number
  entropyBits: number
  charsetSummary: string
  strength: Strength
  warnings: string[]
}

export function generatePassword(options: PasswordOptions): GeneratedPassword {
  const plan = buildCharset(options)
  const length = clampLength(options.length)
  if (!plan.ok) {
    return {
      ok: false,
      value: '',
      length,
      poolSize: plan.pool.length,
      entropyBits: 0,
      charsetSummary: '',
      strength: rateEntropy(0),
      warnings: plan.warnings,
      error: plan.error
    }
  }

  const chars: string[] = []
  if (options.everyClass) {
    for (const group of plan.groups) chars.push(group.chars[nextRandomInt(group.chars.length)] as string)
  }
  while (chars.length < length) chars.push(plan.pool[nextRandomInt(plan.pool.length)] as string)

  const value = shuffle(chars).join('')
  // 强制每类至少一个会让真实熵略低于 pool^length，这里给的是空间上界
  const entropyBits = length * Math.log2(plan.pool.length)

  return {
    ok: true,
    value,
    length,
    poolSize: plan.pool.length,
    entropyBits,
    charsetSummary: plan.groups.map((group) => group.label).join('、'),
    strength: rateEntropy(entropyBits),
    warnings: plan.warnings
  }
}

export function generateMany(options: PasswordOptions, count: number): GeneratedPassword[] {
  const safe = Math.min(Math.max(Math.trunc(Number(count)) || 1, 1), 50)
  return Array.from({ length: safe }, () => generatePassword(options))
}

export function classLabel(name: CharClassName): string {
  return CLASS_LABELS[name]
}
