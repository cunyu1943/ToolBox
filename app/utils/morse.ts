/**
 * 国际摩尔斯电码编解码。
 * 约定：码元之间用空格分隔，单词之间用「 / 」分隔。
 * 中文字符不在摩尔斯表内，按未知字符如实上报（降级而非报错）。
 */

/** 字符 → 电码（国际常用子集：26 字母 + 10 数字 + 常用标点） */
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

/** 电码 → 字符（由 MORSE_TABLE 求逆） */
const REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([c, m]) => [m, c])
)

export interface MorseResult {
  value: string
  /** 编码时未收录的字符，或解码时无法识别的电码 */
  unknown: string[]
}

/** 文本 → 摩尔斯电码。字母不区分大小写，单词间隔输出为「 / 」。 */
export function morseEncode(text: string): MorseResult {
  const unknown: string[] = []
  const words: string[] = []
  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue
    const codes: string[] = []
    for (const ch of word.toUpperCase()) {
      const m = MORSE_TABLE[ch]
      if (m) codes.push(m)
      else unknown.push(ch)
    }
    if (codes.length) words.push(codes.join(' '))
  }
  return { value: words.join(' / '), unknown }
}

/** 摩尔斯电码 → 文本。以「/」识别单词边界，其余空白为码元分隔。 */
export function morseDecode(morse: string): MorseResult {
  const unknown: string[] = []
  const words: string[] = []
  for (const segment of morse.split(/[/／]/)) {
    const chars: string[] = []
    for (const token of segment.trim().split(/\s+/)) {
      if (!token) continue
      const ch = REVERSE[token]
      if (ch) chars.push(ch)
      else unknown.push(token)
    }
    if (chars.length) words.push(chars.join(''))
  }
  return { value: words.join(' '), unknown }
}
