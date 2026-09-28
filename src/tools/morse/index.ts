/**
 * 国际摩尔斯电码（ITU-R M.1677-1 常用子集）编解码内核。
 *
 * 约定：码元内部无分隔，字符之间一个空格，单词之间「 / 」。解码容忍 `·`/`⋅` 当作点、
 * `—`/`–`/`‑` 当作划、`|` 当作词分隔；`_` 不当分隔符，它是字符（..--.-）。
 * 表里没有的字符（汉字等）如实上报为 unknown，不静默丢弃。
 *
 * 时长模型（用于「发完要多久」）：点 = 1 单位、划 = 3 单位、字符内间隔 = 1、字符间 = 3、
 * 词间 = 7；并按 PARIS 惯例给每个单词末尾再算一个 7 单位的词间隔，
 * 于是 "PARIS" 恰为 50 单位，20 WPM 下 1 单位 = 60 ms → 3 秒。
 */

export const MORSE_TABLE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', "'": '.----.',
  '(': '-.--.', ')': '-.--.-', '/': '-..-.', '=': '-...-', '+': '.-.-.',
  '-': '-....-', _: '..--.-', ':': '---...', ';': '-.-.-.', '@': '.--.-.'
}

const REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([ch, code]) => [code, ch])
)

/** 收录顺序：A–Z、0–9、标点，供参考表渲染 */
export const MORSE_CHARS: string[] = Object.keys(MORSE_TABLE)

export interface MorseStats {
  /** 成功编码的字符数 */
  chars: number
  words: number
  dits: number
  dahs: number
  /** PARIS 口径的时间单位总数 */
  units: number
}

export interface MorseResult {
  ok: boolean
  value: string
  /** 编码时未收录的字符，或解码时看不懂的电码 */
  unknown: string[]
  notes: string[]
  stats: MorseStats
}

const emptyStats = (): MorseStats => ({ chars: 0, words: 0, dits: 0, dahs: 0, units: 0 })

/** 把点划的各种排版写法归一成 `.` 与 `-`（U+00B7 ·、U+2212 −、U+2014 —、U+2013 –、U+2011 ‑） */
export function normalizeMorseSymbols(text: string): string {
  return text
    .replace(/[\u00b7\u2022\u2219\u22c5\u30fb]/g, '.')
    .replace(/[\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/[|\uff5c]/g, '/')
    .replace(/\uff0f/g, '/')
}

function unitsOfCodes(words: string[][]): number {
  let units = 0
  for (const codes of words) {
    for (const code of codes) {
      for (const element of code) units += element === '.' ? 1 : 3
      units += Math.max(0, code.length - 1) // 字符内间隔
    }
    units += Math.max(0, codes.length - 1) * 3 // 字符间间隔
    units += 7 // PARIS 惯例：词尾留一个词间隔
  }
  return units
}

function tallyCodes(words: string[][]): { dits: number; dahs: number; chars: number } {
  let dits = 0
  let dahs = 0
  let chars = 0
  for (const codes of words) {
    for (const code of codes) {
      chars += 1
      for (const element of code) {
        if (element === '.') dits += 1
        else dahs += 1
      }
    }
  }
  return { dits, dahs, chars }
}

export function morseEncode(text: string): MorseResult {
  const notes: string[] = []
  const unknown: string[] = []
  const words: string[][] = []

  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue
    const codes: string[] = []
    for (const ch of word.toUpperCase()) {
      const code = MORSE_TABLE[ch]
      if (code) codes.push(code)
      else if (!unknown.includes(ch)) unknown.push(ch)
    }
    if (codes.length) words.push(codes)
  }

  const stats = emptyStats()
  const tallied = tallyCodes(words)
  stats.chars = tallied.chars
  stats.dits = tallied.dits
  stats.dahs = tallied.dahs
  stats.words = words.length
  stats.units = unitsOfCodes(words)

  if (unknown.length) notes.push(`未收录的字符已跳过：${unknown.join(' ')}`)
  if (stats.chars && stats.chars < 5) notes.push('电码太短，抄收时几乎没有冗余，实际通联会重复播发')
  if (text.includes('\n')) notes.push('换行按空白处理，词与词之间仍然是一个「 / 」')

  return { ok: stats.chars > 0, value: words.map((codes) => codes.join(' ')).join(' / '), unknown, notes, stats }
}

export function morseDecode(text: string): MorseResult {
  const notes: string[] = []
  const unknown: string[] = []
  const words: string[][] = []
  const normalized = normalizeMorseSymbols(text)

  for (const segment of normalized.split('/')) {
    const codes: string[] = []
    for (const token of segment.trim().split(/\s+/)) {
      if (!token) continue
      if (!/^[.-]+$/.test(token)) {
        if (!unknown.includes(token)) unknown.push(token)
        continue
      }
      const ch = REVERSE[token]
      if (ch) codes.push(ch)
      else if (!unknown.includes(token)) unknown.push(token)
    }
    if (codes.length) words.push(codes)
  }

  const stats = emptyStats()
  const tallied = tallyCodes(words.map((codes) => codes.map((ch) => MORSE_TABLE[ch] as string)))
  stats.chars = tallied.chars
  stats.dits = tallied.dits
  stats.dahs = tallied.dahs
  stats.words = words.length
  stats.units = unitsOfCodes(words.map((codes) => codes.map((ch) => MORSE_TABLE[ch] as string)))

  if (unknown.length) notes.push(`看不懂的电码已跳过：${unknown.join(' ')}`)
  if (/\.{5,}|-{5,}/.test(normalized)) {
    notes.push('出现了 5 个以上的连续点或划——国际码表里单个字符最长只有 5 个码元，多半是漏了空格')
  }

  return { ok: words.length > 0, value: words.map((codes) => codes.join('')).join(' '), unknown, notes, stats }
}

/** 1 个时间单位的毫秒数：`1200 / WPM`（PARIS 标准） */
export const unitMs = (wpm: number): number => 1200 / Math.max(1, wpm)

export function transmitSeconds(units: number, wpm: number): number {
  return (units * unitMs(wpm)) / 1000
}

/** 按时长给出人类可读的播报耗时 */
export function formatDuration(seconds: number): string {
  if (!seconds) return '0 秒'
  if (seconds < 1) return `${Math.round(seconds * 1000)} 毫秒`
  if (seconds < 60) return `${seconds.toFixed(1)} 秒`
  const m = Math.floor(seconds / 60)
  return `${m} 分 ${Math.round(seconds - m * 60)} 秒`
}

export const MORSE_SAMPLES: { label: string; value: string }[] = [
  { label: 'SOS', value: 'SOS' },
  { label: 'CQ CQ DE', value: 'CQ CQ DE BG1ABC' },
  { label: '73', value: '73 de BG1ABC, QTH Beijing' },
  { label: '不可编码', value: '你好 world' }
]
