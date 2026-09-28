/**
 * 文本统计内核（纯函数，无 DOM 依赖）。
 *
 * 三件事刻意做在明处：
 * 1. 「字数」按 Unicode 码点统计，代理对（emoji、扩展 B 平面汉字）算 1 个，同时给出 UTF-16
 *    单元数与 UTF-8 字节数，避免「长度」这个词被误解；
 * 2. 词数 = 拉丁词数 + 中日韩文字数（逐字计词），因为中文分词需要词典，纯前端不做；
 *    中文标点与全角符号单独计数，不掺进字数里；
 * 3. 阅读时长按 中文 300 字/分 + 英文 200 词/分 混合折算，是估算而非承诺。
 */

export interface TextStats {
  /** Unicode 码点数（代理对算 1） */
  chars: number
  /** 去掉所有空白后的码点数 */
  charsWithoutSpaces: number
  /** UTF-16 代码单元数，即 String#length */
  utf16Units: number
  utf8Bytes: number
  words: number
  latinWords: number
  /** 中日韩文字（汉字/假名/谚文），不含标点 */
  cjkChars: number
  /** 中日韩标点与全角符号：，。「」！？：（）等 */
  cjkPunct: number
  /** 字母（不含 CJK）数，用于看中英占比 */
  letters: number
  digits: number
  /** 非空白、非字母数字、非中日韩文字与标点的其它符号（含 emoji、半角标点） */
  symbols: number
  lines: number
  nonEmptyLines: number
  paragraphs: number
  sentences: number
  /** 最长一行的码点数 */
  longestLine: number
  spaces: number
  tabs: number
  newlines: number
  /** 英文高频词排行（已去停用词与纯数字） */
  topWords: { word: string; count: number }[]
  reading: { minutes: number; seconds: number; label: string }
}

const CJK_RANGES: readonly (readonly [number, number])[] = [
  [0x3040, 0x30ff],
  [0x3130, 0x318f],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xac00, 0xd7af],
  [0xf900, 0xfaff],
  [0x20000, 0x2a6df],
  [0x2a700, 0x2ebef]
]

/** 中日韩标点与全角符号：单列计数，避免混进「字数/词数」 */
const CJK_PUNCT_RANGES: readonly (readonly [number, number])[] = [
  [0x2e80, 0x2eff],
  [0x3000, 0x303f],
  [0x31c0, 0x31ef],
  [0xfe30, 0xfe4f],
  [0xff01, 0xff65]
]

function inRanges(codePoint: number, ranges: readonly (readonly [number, number])[]): boolean {
  for (const [from, to] of ranges) {
    if (codePoint >= from && codePoint <= to) return true
  }
  return false
}

function isCjk(codePoint: number): boolean {
  return inRanges(codePoint, CJK_RANGES)
}

function isCjkPunct(codePoint: number): boolean {
  return inRanges(codePoint, CJK_PUNCT_RANGES)
}

function hasCjk(token: string): boolean {
  for (const ch of token) {
    if (isCjk(ch.codePointAt(0) ?? 0)) return true
  }
  return false
}

/** 词形：字母/数字串，允许内部的连字符与撇号（`co-op`、`don't` 算一个词） */
const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu

/**
 * 中文句读按「字符之后」切开；西文只在 `.!?` 后面紧跟空白或行尾时切开，
 * 这样 `3.14`、`v1.2.3`、`e.g.` 里的句点不会被当成句子结束。
 */
function splitSentences(text: string): string[] {
  return text.split(/(?<=[。！？…])|(?<=[.!?])(?=\s|$)/)
}

const STOPWORDS = new Set(
  ('a an the and or but if then than that this these those of in on at to from by with without '
    + 'as is are was were be been being do does did done have has had will would shall should can '
    + 'could may might must not no nor so such very just also it its into over under again more '
    + 'most other some any each few all both own same he she they them their there here when where '
    + 'why how what which who whom whose while because about against between during before after '
    + 'up down out off through too two one three four five six seven eight nine ten first second '
    + 'i you we me my our us your his her i.e e.g etc').split(' ')
)

function readingLabel(totalSeconds: number): string {
  if (totalSeconds < 60) return `约 ${totalSeconds} 秒`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds ? `约 ${minutes} 分 ${seconds} 秒` : `约 ${minutes} 分钟`
  return `约 ${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
}

export function analyzeText(text: string): TextStats {
  let chars = 0
  let charsWithoutSpaces = 0
  let cjkChars = 0
  let cjkPunct = 0
  let letters = 0
  let digits = 0
  let symbols = 0
  let spaces = 0
  let tabs = 0
  let newlines = 0

  for (const ch of text) {
    chars += 1
    const cp = ch.codePointAt(0) ?? 0
    if (/\s/u.test(ch)) {
      if (ch === ' ') spaces += 1
      else if (ch === '\t') tabs += 1
      else if (ch === '\n') newlines += 1
      continue
    }
    charsWithoutSpaces += 1
    if (isCjk(cp)) cjkChars += 1
    else if (isCjkPunct(cp)) cjkPunct += 1
    else if (/\p{L}/u.test(ch)) letters += 1
    else if (/\p{N}/u.test(ch)) digits += 1
    else symbols += 1
  }

  const tokens = text.match(WORD_RE) ?? []
  const latinTokens = tokens.filter((token) => !hasCjk(token))

  const lines = text === '' ? [] : text.split('\n')
  const paragraphs = text === '' ? [] : text.split(/\n[ \t]*\n/).filter((block) => block.trim() !== '')
  const sentences = splitSentences(text).filter((part) => /[\p{L}\p{N}]/u.test(part))

  const counts = new Map<string, number>()
  for (const token of latinTokens) {
    const lower = token.toLowerCase().replace(/^['’-]+|['’-]+$/g, '')
    if (lower.length < 2 || STOPWORDS.has(lower) || /^\d+$/.test(lower)) continue
    counts.set(lower, (counts.get(lower) ?? 0) + 1)
  }
  const topWords = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }))

  // 中文 300 字/分、英文 200 词/分，两路各自折算后相加
  const estimated = Math.round((cjkChars / 300 + latinTokens.length / 200) * 60)
  const totalSeconds = charsWithoutSpaces === 0 ? 0 : Math.max(estimated, 1)

  return {
    chars,
    charsWithoutSpaces,
    utf16Units: text.length,
    utf8Bytes: new TextEncoder().encode(text).length,
    words: cjkChars + latinTokens.length,
    latinWords: latinTokens.length,
    cjkChars,
    cjkPunct,
    letters,
    digits,
    symbols,
    lines: lines.length,
    nonEmptyLines: lines.filter((line) => line.trim() !== '').length,
    paragraphs: paragraphs.length,
    sentences: sentences.length,
    longestLine: lines.reduce((max, line) => Math.max(max, [...line].length), 0),
    spaces,
    tabs,
    newlines,
    topWords,
    reading: {
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60,
      label: readingLabel(totalSeconds)
    }
  }
}

/** 各类文本形态的示例，供页面一键填入 */
export const TEXT_STATS_SAMPLES: { label: string; value: string }[] = [
  {
    label: '中英混排',
    value: 'ToolBox 是一个纯前端的在线工具箱。\nIt runs fully in your browser — no backend, no tracking, and 100% of the data stays local.'
  },
  {
    label: '一段古文',
    value: '春冬之时，素湍绿潭，回清倒影。绝巘多生怪柏，悬泉瀑布，飞漱其间，清荣峻茂，良多趣味。\n\n每至晴初霜旦，林寒涧肃，常有高猿长啸，属引凄异，空谷传响，哀转久绝。'
  },
  { label: '带代码缩进', value: 'function greet(name) {\n\tif (!name) {\n\t\treturn "hi"\n\t}\n\treturn `hello, ${name}`\n}' },
  { label: '含 emoji', value: '提交成功 ✅ 1.0.0 已发布 🎉🎉 记得 review 👀 这处改动。\nPrice: $3.14 (v1.2.3)' },
  { label: '单个词', value: 'hello' },
  { label: '只有空白', value: '   \n  \n ' }
]
