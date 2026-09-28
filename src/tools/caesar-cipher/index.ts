/**
 * 古典密码内核（纯函数，无 DOM 依赖）。
 *
 * 只变换 ASCII 英文字母并保留原大小写，其它字符（数字、标点、中文）原样穿过并计数；
 * 这一类工具用于教学与解谜，不是加密手段——凯撒/维吉尼亚的密码空间小到可以在浏览器里
 * 瞬间穷举，`crackCaesar` 本身就是证明。
 */

export type CipherMethod = 'caesar' | 'rot13' | 'atbash' | 'vigenere' | 'beaufort'

export interface CipherResult {
  ok: boolean
  text: string
  error?: string
  notes: string[]
}

export interface CaesarCrack {
  shift: number
  text: string
  /** 越高越像英文文本（对数似然的均值） */
  score: number
}

export interface CaesarCrackResult {
  results: CaesarCrack[]
  letterCount: number
}

export const CIPHER_METHODS: {
  id: CipherMethod
  label: string
  /** 界面里展示的一次变换说明 */
  formula: string
  keyLabel?: string
  reciprocal: boolean
}[] = [
  { id: 'caesar', label: '凯撒 (Caesar)', formula: 'C = (P + n) mod 26', keyLabel: '位移 n（-25 ~ 25）', reciprocal: false },
  { id: 'rot13', label: 'ROT13', formula: '位移固定 13，自身互逆', reciprocal: true },
  { id: 'atbash', label: 'Atbash', formula: 'A↔Z、B↔Y，首尾对折，自身互逆', reciprocal: true },
  { id: 'vigenere', label: '维吉尼亚 (Vigenère)', formula: 'C = (P + K) mod 26，密钥逐字母移位', keyLabel: '密钥（只用其中的字母）', reciprocal: false },
  { id: 'beaufort', label: 'Beaufort', formula: 'C = (K − P) mod 26，加密解密同一操作', reciprocal: true }
]

/** a–z 的英文单字母频率（百分比），用于给凯撒暴力破解的候选排序 */
const ENGLISH_FREQ = [
  8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.155, 7.007, 0.15, 0.776, 4.025, 2.808,
  4.125, 2.405, 1.897, 0.095, 4.753, 7.507, 2.784, 1.091, 1.257, 0.034, 2.032, 0.186, 0.965
]

const A_UPPER = 65
const A_LOWER = 97

function isAsciiLetter(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

function countLetters(text: string): number {
  let n = 0
  for (let i = 0; i < text.length; i += 1) {
    if (isAsciiLetter(text.charCodeAt(i))) n += 1
  }
  return n
}

/** 位移一个 ASCII 字母，保持大小写；非字母返回原字符 */
function shiftChar(ch: string, amount: number): string {
  const code = ch.charCodeAt(0)
  if (!isAsciiLetter(code)) return ch
  const base = code >= A_LOWER ? A_LOWER : A_UPPER
  const normalized = ((amount % 26) + 26) % 26
  return String.fromCharCode(base + (((code - base + normalized) % 26) + 26) % 26)
}

function mapAlphabet(ch: string, transform: (plain: number) => number): string {
  const code = ch.charCodeAt(0)
  if (!isAsciiLetter(code)) return ch
  const base = code >= A_LOWER ? A_LOWER : A_UPPER
  const out = ((transform(code - base) % 26) + 26) % 26
  return String.fromCharCode(base + out)
}

function keyLetters(key: string): number[] {
  const out: number[] = []
  for (const ch of key) {
    const code = ch.toUpperCase().charCodeAt(0)
    if (code >= A_UPPER && code <= 90) out.push(code - A_UPPER)
  }
  return out
}

/** 统计被原样保留的非字母字符数，用于提示「这段里有中文/符号没被处理」 */
function passthroughNote(text: string): string[] {
  let skipped = 0
  let cjk = 0
  for (const ch of text) {
    if (/[一-鿿぀-ヿ가-힯]/u.test(ch)) {
      cjk += 1
      skipped += 1
    } else if (!isAsciiLetter(ch.charCodeAt(0))) skipped += 1
  }
  const notes: string[] = []
  if (skipped) notes.push(`${skipped} 个非英文字母字符原样保留（其中中日韩文字 ${cjk} 个）`)
  return notes
}

export function applyCipher(
  text: string,
  method: CipherMethod,
  options: { shift?: number; key?: string; decode?: boolean } = {}
): CipherResult {
  const notes: string[] = []
  const letters = countLetters(text)
  if (!text) return { ok: false, text: '', error: '请输入要处理的文本', notes }
  if (!letters) {
    return { ok: false, text: '', error: '古典密码只作用于英文字母，这段文本里没有可处理的字母', notes }
  }

  const decode = options.decode === true

  if (method === 'atbash') {
    const out = [...text].map((ch) => mapAlphabet(ch, (plain) => 25 - plain)).join('')
    return { ok: true, text: out, notes: passthroughNote(text) }
  }

  if (method === 'rot13' || method === 'caesar') {
    const raw = method === 'rot13' ? 13 : (options.shift ?? 3)
    if (!Number.isInteger(raw)) return { ok: false, text: '', error: '位移必须是整数', notes }
    if (raw < -25 || raw > 25) notes.push(`位移已按 26 取模归一：${raw} → ${((raw % 26) + 26) % 26}`)
    const amount = (decode ? -raw : raw) % 26
    const out = [...text].map((ch) => shiftChar(ch, amount)).join('')
    return { ok: true, text: out, notes: [...notes, ...passthroughNote(text)] }
  }

  const key = options.key ?? ''
  const stream = keyLetters(key)
  if (!stream.length) return { ok: false, text: '', error: '密钥至少要包含一个英文字母', notes }
  if (key.length > stream.length) {
    notes.push(`密钥里的 ${key.length - stream.length} 个非字母字符已忽略，实际使用 ${stream.length} 个字母`)
  }

  let index = 0
  const beaufort = method === 'beaufort'
  const sign = decode && !beaufort ? -1 : 1
  const out = [...text]
    .map((ch) => {
      if (!isAsciiLetter(ch.charCodeAt(0))) return ch
      const k = (stream[index % stream.length] as number) * sign
      // 只让字母消耗密钥流，标点与空格不推进密钥位置（与标准实现一致）
      index += 1
      return mapAlphabet(ch, (plain) => (beaufort ? k - plain : plain + k))
    })
    .join('')

  return { ok: true, text: out, notes: [...notes, ...passthroughNote(text)] }
}

/**
 * 凯撒暴力破解：26 个位移全部解一遍，用英文单字母频率的对数似然排序。
 * 样本太短（< 20 个字母）时排序几乎随机，页面需要据此提示不可信。
 */
export function crackCaesar(text: string): CaesarCrackResult {
  const letters: string[] = []
  for (const ch of text) {
    if (isAsciiLetter(ch.charCodeAt(0))) letters.push(ch)
  }
  if (!letters.length) return { results: [], letterCount: 0 }

  const observed = new Array<number>(26).fill(0)
  for (const ch of letters) {
    observed[ch.toUpperCase().charCodeAt(0) - A_UPPER] += 1
  }

  const results: CaesarCrack[] = []
  for (let shift = 0; shift < 26; shift += 1) {
    let logSum = 0
    for (let i = 0; i < 26; i += 1) {
      if (!observed[i]) continue
      // observed[i] 是密文字母 i 的出现次数；按 shift 解密后它对应明文字母 (i − shift) mod 26
      const plain = ((i - shift) % 26 + 26) % 26
      logSum += (observed[i] as number) * Math.log((ENGLISH_FREQ[plain] as number) / 100)
    }
    results.push({
      shift,
      text: applyCipher(text, 'caesar', { shift, decode: true }).text,
      score: logSum / letters.length
    })
  }
  results.sort((a, b) => b.score - a.score)
  return { results, letterCount: letters.length }
}

export const CIPHER_SAMPLES: { label: string; value: string; method: CipherMethod; key?: string; shift?: number }[] = [
  { label: '凯撒 +3', value: 'Hello, World!', method: 'caesar', shift: 3 },
  { label: 'ROT13', value: 'Uryyb, Jbeyq!', method: 'rot13' },
  { label: '维吉尼亚', value: 'ATTACKATDAWN', method: 'vigenere', key: 'LEMON' },
  { label: 'Beaufort', value: 'ATTACKATDAWN', method: 'beaufort', key: 'LEMON' },
  { label: 'Atbash', value: 'The quick brown fox', method: 'atbash' },
  { label: '中英混排', value: '你好 Hello 2026！', method: 'caesar', shift: 5 },
  { label: '待破解密文', value: 'Wklv lv d vhfuhw phvvdjh DERXW wrrolqj vwxghqwv.', method: 'caesar', shift: 3 }
]
