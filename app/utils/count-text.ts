/**
 * 文本统计纯函数：字符数、中文字数、词数、行/句/段数。
 * 以 Unicode 码点计数，emoji（代理对）算 1 个字符。
 */

export interface TextStats {
  /** 总字符数（含空格、标点，不含换行符本身） */
  chars: number
  /** 字符数（不含任何空白） */
  charsNoSpace: number
  /** 中文汉字数（CJK 基本区 + 扩展 A 区） */
  chinese: number
  /** 词数：英文单词数 + 中文汉字数 */
  words: number
  /** 英文单词数（连续拉丁字母/数字算一词） */
  englishWords: number
  /** 非空行数 */
  lines: number
  /** 句子数（按中英文句末标点切分） */
  sentences: number
  /** 段落数（按空行切分） */
  paragraphs: number
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/
const LATIN_WORD = /[A-Za-z0-9À-ÿ]+/g

/** 统计一段文本的各类计数 */
export function countText(text: string): TextStats {
  const empty: TextStats = {
    chars: 0, charsNoSpace: 0, chinese: 0, words: 0,
    englishWords: 0, lines: 0, sentences: 0, paragraphs: 0
  }
  if (!text) return empty

  const codePoints = [...text].filter((c) => c !== '\n' && c !== '\r')
  const chars = codePoints.length
  const charsNoSpace = codePoints.filter((c) => !/\s/.test(c)).length
  const chinese = codePoints.filter((c) => CJK.test(c)).length
  const englishWords = (text.match(LATIN_WORD) || []).length

  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '').length
  const sentences = text
    .split(/[.!?。！？]+/)
    .map((s) => s.trim())
    .filter((s) => s !== '').length
  const trimmed = text.trim()
  const paragraphs = trimmed === ''
    ? 0
    : trimmed.split(/\n[ \t]*\n+/).filter((p) => p.trim() !== '').length

  return {
    chars,
    charsNoSpace,
    chinese,
    englishWords,
    words: englishWords + chinese,
    lines,
    sentences,
    paragraphs
  }
}

/**
 * 估算朗读/阅读时长（分钟）。
 * 中文默认 300 字/分、英文默认 200 词/分，混合文本按各自占比累加。
 */
export function readingMinutes(
  text: string,
  chineseCpm = 300,
  englishWpm = 200
): number {
  if (!text) return 0
  const { chinese, englishWords } = countText(text)
  const minutes = chinese / chineseCpm + englishWords / englishWpm
  return Math.round(minutes * 100) / 100
}
