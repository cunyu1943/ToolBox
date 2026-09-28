/**
 * 密码强度评估（纯本地，输入不离开浏览器、不落 localStorage）。
 *
 * 判级与攻击强度假设与「随机密码生成」页共用 `rateEntropy`（离线每秒 10¹¹ 次尝试），
 * 所以同一个熵值在两页得到同一个等级。区别在于这里评估的是**人写的**口令：
 * `长度 × log2(字符集)` 只对「每个字符均匀随机」成立，人会写 qwerty、会写生日，
 * 于是本内核在理论熵之外再给一个经过模式折损的 `effectiveEntropy` 用来判级。
 * 折损只覆盖几类最常见的结构，**不判断语义可猜性**（熟人名 + 年份照样算得偏高）。
 */
import { rateEntropy, type Strength } from '../password-gen/index.ts'

export type CharClass = 'lower' | 'upper' | 'digit' | 'symbol' | 'space' | 'cjk' | 'other'

/**
 * 各类的粗算字符集大小。汉字取 3500 = 《通用规范汉字表》一级字表；
 * 其余非 ASCII 取 100 是保守档，含生僻字符的口令按「无法准确评估」对待。
 */
const CLASS_SIZE: Record<CharClass, number> = {
  lower: 26, upper: 26, digit: 10, symbol: 33, space: 1, cjk: 3500, other: 100
}
const CLASS_LABEL: Record<CharClass, string> = {
  lower: '小写 a–z', upper: '大写 A–Z', digit: '数字 0–9', symbol: '可见符号',
  space: '空格', cjk: '汉字', other: '其他非 ASCII'
}

/** 常见弱口令与键盘序（小写比较）。命中即按「表大小的一半」计熵。 */
export const COMMON_PASSWORDS: string[] = [
  '123456', '1234567', '12345678', '123456789', '1234567890', '1234', '12345', '000000', '111111',
  '666666', '888888', '987654321', '121212', '123123', '123321', '0000', '1111',
  'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'admin', 'admin123', 'root',
  'iloveyou', '5201314', '1314520', '3344520', 'woaini', 'a123456', 'abc123', 'abc123456',
  'qq123456', '123456a', '123qwe', '1q2w3e4r', '1qaz2wsx', 'qazwsx', 'asd123',
  'qwerty', 'qwerty123', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'monkey', 'dragon', 'master',
  'letmein', 'football', 'baseball', 'welcome', 'hello', 'test123', 'guest', 'superman',
  'princess', 'sunshine', 'trustno1', 'whatever', 'starwars', 'michael', 'jennifer',
  'computer', 'internet', 'google', 'facebook', 'iphone', 'xiaomi', 'huawei', 'taobao',
  'alipay', 'wechat', 'samsung', 'xiaomi123'
]
const COMMON = new Set(COMMON_PASSWORDS)
const COMMON_KEYS = COMMON_PASSWORDS.filter((word) => word.length >= 6)

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890']
const ROWS_BOTH = [...KEYBOARD_ROWS, ...KEYBOARD_ROWS.map((row) => [...row].reverse().join(''))]
const YEAR_OR_DATE = /(?:19|20)\d\d(?:[-/._ ]?(?:0[1-9]|1[0-2])(?:[-/._ ]?(?:0[1-9]|[12]\d|3[01]))?)?/
const DATE_SEPARATORS = /[-/._ ]/g
const LOG2 = Math.log2

const round1 = (value: number): number => Math.round(value * 10) / 10

export function charClassOf(ch: string): CharClass {
  const cp = ch.codePointAt(0) ?? 0
  if (cp >= 97 && cp <= 122) return 'lower'
  if (cp >= 65 && cp <= 90) return 'upper'
  if (cp >= 48 && cp <= 57) return 'digit'
  if (cp === 32 || cp === 9) return 'space'
  if (cp >= 33 && cp <= 126) return 'symbol'
  if (
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff)
  ) return 'cjk'
  return 'other'
}

export interface CharsetInfo {
  poolSize: number
  classes: CharClass[]
  counts: Record<CharClass, number>
}

export function analyzeCharset(pwd: string): CharsetInfo {
  const counts: Record<CharClass, number> = {
    lower: 0, upper: 0, digit: 0, symbol: 0, space: 0, cjk: 0, other: 0
  }
  for (const ch of pwd) counts[charClassOf(ch)] += 1
  const classes = (Object.keys(counts) as CharClass[]).filter((name) => counts[name] > 0)
  return { poolSize: classes.reduce((sum, name) => sum + CLASS_SIZE[name], 0), classes, counts }
}

/** 最长「码点等差 ±1」连跑与最长键盘行连跑（正序、逆序都算） */
function longestSequence(pwd: string): { len: number; kind: 'codepoint' | 'keyboard' } {
  const s = pwd.toLowerCase()
  const chars = [...s]
  let best: { len: number; kind: 'codepoint' | 'keyboard' } = { len: 0, kind: 'codepoint' }
  let i = 0
  while (i + 1 < chars.length) {
    const delta = s.charCodeAt(i + 1) - s.charCodeAt(i)
    if (delta !== 1 && delta !== -1) { i += 1; continue }
    let j = i + 1
    while (j + 1 < chars.length && s.charCodeAt(j + 1) - s.charCodeAt(j) === delta) j += 1
    if (j - i + 1 > best.len) best = { len: j - i + 1, kind: 'codepoint' }
    i = j
  }
  for (let start = 0; start < chars.length; start += 1) {
    for (const row of ROWS_BOTH) {
      const at = row.indexOf(chars[start] as string)
      if (at < 0) continue
      let len = 1
      while (start + len < chars.length && row.indexOf(chars[start + len] as string) === at + len) len += 1
      if (len > best.len) best = { len, kind: 'keyboard' }
    }
  }
  return best
}

/** 整串的最小重复周期：`abcabc` → 3、`aaaa` → 1、无整段重复 → 0 */
function repeatPeriod(pwd: string): number {
  const chars = [...pwd.toLowerCase()]
  if (chars.length < 2) return 0
  for (let p = 1; p <= Math.floor(chars.length / 2); p += 1) {
    if (chars.length % p !== 0) continue
    let whole = true
    for (let i = p; i < chars.length; i += 1) {
      if (chars[i] !== chars[i % p]) { whole = false; break }
    }
    if (whole) return p
  }
  return 0
}

export interface StrengthAnalysis {
  ok: boolean
  length: number
  poolSize: number
  classes: string[]
  rawEntropy: number
  effectiveEntropy: number
  patterns: string[]
  warnings: string[]
  suggestion: string
  strength: Strength
}

const SUGGEST_BY_SCORE: Record<Strength['score'], string> = {
  0: '这个口令已经被脚本的第一步覆盖。换成 12 位以上、四类字符混合的随机口令（用「随机密码生成」页），或用三个不相干的词拼成的口令短语。',
  1: '只差一档。再加 3–4 位、把其中一类换成符号，并去掉能被猜到的语义（姓名、生日、连续键盘位）。',
  2: '日常站点够用。若是邮箱、支付，或能重置其他账号的主账号，建议再上一档：16 位以上随机口令 + 两步验证。',
  3: '强度足够。别把它抄在会被同步的地方，并且不同站点用不同口令。',
  4: '强度足够。此时薄弱环节通常不再是口令本身，而是被复用的站点拖库或钓鱼。'
}

export function analyzePassword(pwd: string): StrengthAnalysis {
  const chars = [...(pwd ?? '')]
  const length = chars.length
  if (length === 0) {
    return {
      ok: false, length: 0, poolSize: 0, classes: [], rawEntropy: 0, effectiveEntropy: 0,
      patterns: [], warnings: ['尚未输入密码'],
      suggestion: '输入待评估的口令后即时给出等级、熵与破解耗时。',
      strength: rateEntropy(0)
    }
  }

  const { poolSize, classes } = analyzeCharset(pwd)
  const perChar = LOG2(poolSize)
  const rawEntropy = length * perChar
  const lower = pwd.toLowerCase()
  const patterns: string[] = []
  let effective = rawEntropy

  const cap = (bits: number, note: string): void => {
    patterns.push(note)
    if (bits < effective) effective = bits
  }

  if (COMMON.has(lower)) {
    cap(LOG2(COMMON.size * 2), `整串命中常见弱口令表（表内 ${COMMON.size} 条）`)
  } else {
    const hit = COMMON_KEYS.find((word) => lower.includes(word))
    if (hit !== undefined) {
      cap(
        LOG2(COMMON.size * 2) + (length - hit.length) * perChar,
        `内嵌常见口令「${hit}」（其余 ${length - hit.length} 位按随机取字计）`
      )
    }
  }

  const period = repeatPeriod(pwd)
  if (period === 1) cap(perChar, '整串是同一个字符重复')
  else if (period > 1) cap(period * perChar + LOG2(Math.floor(length / period)), `整串是 ${period} 个字符的片段重复`)

  const seq = longestSequence(pwd)
  if (seq.len >= 4 && seq.len / length >= 0.5) {
    cap(
      LOG2(36 * length * 2),
      seq.kind === 'keyboard' ? `含 ${seq.len} 位键盘行序列` : `含 ${seq.len} 位连续字符`
    )
  }

  const dateHit = YEAR_OR_DATE.exec(lower)
  if (dateHit !== null) {
    const matched = dateHit[0]
    const span = matched.replace(DATE_SEPARATORS, '').length
    const isYear = span === 4
    const what = isYear ? '年份' : '日期'
    const space = isYear ? 201 : 36525
    if (matched.length === length) cap(LOG2(space), `整串就是一个${what}`)
    else cap((length - span) * perChar + LOG2(space), `内嵌${what}「${matched}」（其余 ${length - span} 位按随机取字计）`)
  }

  if (classes.length === 1 && classes[0] === 'digit') patterns.push('只用了一类字符：纯数字')
  else if (classes.length === 1 && classes[0] === 'lower') patterns.push('只用了一类字符：纯小写字母')
  if (length < 8) patterns.push(`长度不足 8 位（当前 ${length} 位）`)

  const rounded = Math.round(Math.max(0, Math.min(effective, rawEntropy)) * 10) / 10
  const strength = rateEntropy(rounded)

  const warnings: string[] = [...patterns]
  if (rawEntropy - rounded >= 0.1) {
    warnings.push(`已按模式折损：理论 ${round1(rawEntropy)} bit → 判级用 ${rounded} bit`)
  }
  if (classes.some((name) => name === 'cjk' || name === 'other')) {
    warnings.push('含非 ASCII 字符，字符集只能粗估（汉字按 3500 计），这一档偏高')
  }

  return {
    ok: true, length, poolSize,
    classes: classes.map((name) => CLASS_LABEL[name]),
    rawEntropy: round1(rawEntropy), effectiveEntropy: rounded,
    patterns, warnings,
    suggestion: SUGGEST_BY_SCORE[strength.score],
    strength
  }
}

/** 示例按钮：`expect` 是 label 应当兑现的等级，由 oracle 逐条断言（文案就是断言，不是装饰） */
export const STRENGTH_SAMPLES: { label: string; value: string; expect: string }[] = [
  { label: '常见弱口令', value: 'password123', expect: '很弱' },
  { label: '生日型纯数字', value: '19900101', expect: '很弱' },
  { label: '姓名 + 年份', value: 'Wang2026', expect: '偏弱' },
  { label: 'leet 替换', value: 'Tr0ub4dor&3', expect: '强' },
  { label: '随机 20 位', value: 'Kf7$qs2!mVx9Zp4&Ld0T', expect: '极强' }
]
