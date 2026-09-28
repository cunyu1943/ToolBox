import {
  HK_CHARS, HK_REV, HK_WORDS, POLY, S2T_CHARS, S2T_WORDS, T2S_CHARS, T2S_WORDS,
  TW_CHARS, TW_REV, TW_WORDS,
} from './table'

export type Variant = 'cn' | 'tw' | 'hk'

export interface Spot {
  at: number
  src: string
  def: string
  alts: string[]
  /** true = 由二字词表主动判定过；false = 只按字级默认值，最需要用户复核 */
  fixed: boolean
}

export interface ConvertResult {
  output: string
  spots: Spot[]
  words: number
  chars: number
}

const SEP = '\u0000'
const KV = '\u0001'
const ENTRY = '\u0002'

/** 并列两串（键串 \u0000 值串）→ 逐码点配对的 Map */
function charMap(packed: string): Map<string, string> {
  const cut = packed.indexOf(SEP)
  const keys = [...packed.slice(0, cut)]
  const vals = [...packed.slice(cut + 1)]
  const m = new Map<string, string>()
  for (let i = 0; i < keys.length; i++) m.set(keys[i] as string, vals[i] as string)
  return m
}

/** 词表：`键\u0001值`；`incremental` 时值只写「位置+目标字」，回放到键上 */
function wordMap(packed: string, incremental = false): Map<string, string> {
  const m = new Map<string, string>()
  if (!packed) return m
  for (const entry of packed.split(ENTRY)) {
    const cut = entry.indexOf(KV)
    const key = entry.slice(0, cut)
    const raw = entry.slice(cut + 1)
    if (!incremental) {
      m.set(key, raw)
      continue
    }
    const cps = [...key]
    // 「位置 + -」表示这里**保持原字**（字级默认值会误转，词表把它按住）
    for (let i = 0; i < raw.length; i += 2) {
      const v = raw[i + 1] as string
      if (v !== '-') cps[Number(raw[i])] = v
    }
    m.set(key, cps.join(''))
  }
  return m
}

/** 一字多形表：`字\u0001备选串` */
function polyMap(packed: string): Map<string, string[]> {
  const m = new Map<string, string[]>()
  if (!packed) return m
  for (const entry of packed.split(ENTRY)) {
    const cut = entry.indexOf(KV)
    m.set(entry.slice(0, cut), [...new Set([...entry.slice(cut + 1)])])
  }
  return m
}

const s2tChars = charMap(S2T_CHARS)
const s2tWords = wordMap(S2T_WORDS, true)
const polyChars = polyMap(POLY)
const t2sWords = wordMap(T2S_WORDS)
/** 底表是「简→繁字表的反向」，再用 578 条增量覆盖不一致的那些 */
const t2sChars = (() => {
  const m = new Map<string, string>()
  for (const [src, dst] of s2tChars) if (!m.has(dst)) m.set(dst, src)
  for (const [src, dst] of charMap(T2S_CHARS)) m.set(src, dst)
  return m
})()
const twChars = charMap(TW_CHARS)
const twWords = wordMap(TW_WORDS)
const twRevChars = charMap(TW_REV)
const hkChars = charMap(HK_CHARS)
const hkWords = wordMap(HK_WORDS)
const hkRevChars = charMap(HK_REV)


interface ChainResult {
  out: string[]
  hits: number
  spots: Spot[]
}

/** 词优先、字兜底的贪心替换；`flag` 非空时把「按字转换且该字一字多形」的位置记进 spots */
function applyChain(
  cps: string[],
  words: Map<string, string>,
  maxLen: number,
  chars: Map<string, string>,
  flag: Map<string, string[]> | null,
): ChainResult {
  const out: string[] = []
  const spots: Spot[] = []
  let hits = 0
  for (let i = 0; i < cps.length; ) {
    let matched = false
    for (let len = Math.min(maxLen, cps.length - i); len >= 2; len--) {
      const hit = words.get(cps.slice(i, i + len).join(''))
      if (hit === undefined) continue
      const vs = [...hit]
      const start = out.length
      // 一字多形的位置一律交给用户复核：词表改过它是「按词组判定」，没改它是「按词组保留原字」，
      // 两种都可能在更长的词里判错（我们的词表只到二字）。
      if (flag) {
        for (let j = 0; j < len; j++) {
          const src = cps[i + j] as string
          const alts = flag.get(src)
          if (alts) spots.push({ at: start + j, src, def: vs[j] as string, alts: alts.filter((a) => a !== vs[j]), fixed: vs[j] !== src })
        }
      }
      out.push(...vs)
      i += len
      hits++
      matched = true
      break
    }
    if (matched) continue
    const src = cps[i] as string
    const def = chars.get(src) ?? src
    out.push(def)
    const alts = flag?.get(src)
    if (alts) spots.push({ at: out.length - 1, src, def, alts: alts.filter((a) => a !== def), fixed: false })
    i++
  }
  return { out, hits, spots }
}

function maxWordLen(words: Map<string, string>): number {
  let n = 0
  for (const k of words.keys()) n = Math.max(n, [...k].length)
  return n
}

const T2S_MAX = maxWordLen(t2sWords)
const TW_MAX = maxWordLen(twWords)
const HK_MAX = maxWordLen(hkWords)

export const VARIANT_LABELS: Record<Variant, string> = {
  cn: '简体',
  tw: '繁体（台式）',
  hk: '繁体（港式）',
}

export const PRESETS: { label: string; from: Variant; to: Variant }[] = [
  { label: '简 → 繁（台式）', from: 'cn', to: 'tw' },
  { label: '繁（台式） → 简', from: 'tw', to: 'cn' },
  { label: '简 → 繁（港式）', from: 'cn', to: 'hk' },
  { label: '繁（港式） → 简', from: 'hk', to: 'cn' },
]

export function convert(text: string, from: Variant, to: Variant): ConvertResult {
  const cps = [...text]
  if (cps.length === 0 || from === to) return { output: text, spots: [], words: 0, chars: cps.length }
  if (from === 'cn') {
    const run = applyChain(cps, s2tWords, 2, s2tChars, polyChars)
    let out = run.out
    let reg: Map<string, string> | null = null
    if (to === 'tw') {
      out = applyChain(out, twWords, TW_MAX, twChars, null).out
      reg = twChars
    } else if (to === 'hk') {
      out = applyChain(out, hkWords, HK_MAX, hkChars, null).out
      reg = hkChars
    }
    const spots = reg
      ? run.spots.map((s) => {
          const def = reg!.get(s.def) ?? s.def
          // 备选同时给「地区层收成什么」和「地区层之前的写法」：台式层把 樑 记成 梁，
          // 可三字以上的人名（葉步樑）OpenCC 用的正是 樑，我们的二字窗口判不了，两种都得让用户挑得到。
          const alts = [...new Set([...s.alts, ...s.alts.map((a) => reg!.get(a) ?? a)])].filter(
            (a) => a !== def,
          )
          return { ...s, def, alts }
        })
      : run.spots
    return { output: out.join(''), spots, words: run.hits, chars: cps.length }
  }
  let base = cps
  if (from === 'tw') base = cps.map((c) => twRevChars.get(c) ?? c)
  else if (from === 'hk') base = cps.map((c) => hkRevChars.get(c) ?? c)
  const run = applyChain(base, t2sWords, T2S_MAX, t2sChars, null)
  return { output: run.out.join(''), spots: [], words: run.hits, chars: cps.length }
}

/** 把 spots 里的某一处换成用户挑的写法，返回新的输出串（只改那一个码点） */
export function applyChoice(output: string, spot: Spot, choice: string): string {
  const cps = [...output]
  if (cps[spot.at] !== spot.def) return output
  cps[spot.at] = choice
  return cps.join('')
}

/** 表规模，页面用来把「装了什么、没装什么」讲清楚 */
export const TABLE_SIZES = {
  s2tChars: s2tChars.size,
  s2tWords: s2tWords.size,
  poly: polyChars.size,
  t2sChars: t2sChars.size,
  t2sWords: t2sWords.size,
  twChars: twChars.size,
  twWords: twWords.size,
  hkChars: hkChars.size,
  hkWords: hkWords.size,
}
