/**
 * 繁简转换表生成器：从 OpenCC（Apache-2.0）随 opencc-js 1.4.2 发布的原始表裁出 src/tools/chinese-variant/table.ts。
 * 用法：node scripts/gen-chinese-variant-table.mjs（可选 KEEP_N / POLY_T / OPENCC_DIR 环境变量，含义见文件内注释与 README）。
 * 这是 table.ts 的唯一来源，table.ts 不要手改。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

// 需要先有一份本地 opencc-js 解压结果：默认读同仓库旁的 multicalc/node_modules，可用 OPENCC_DIR 覆盖
const dir = (process.env.OPENCC_DIR ?? 'E:/02_个人成长/04_code/multicalc/node_modules/opencc-js/dist/esm-lib/dict')
  .replace(/\\/g, '/')
  .replace(/\/+$/, '')
const base = `file:///${dir.replace(/^\/+/, '')}/`
const load = async (n) => (await import(base + n)).default
const pairs = (s) => s.split('|').map((l) => l.split(' '))
const utf8 = (s) => Buffer.byteLength(s, 'utf8')
const gz = (s) => gzipSync(Buffer.from(s, 'utf8'), { level: 9 }).length

const st = pairs(await load('STCharacters.js'))
const ts = pairs(await load('TSCharacters.js'))
const tsp = pairs(await load('TSPhrases.js'))
const twChars = pairs(await load('TWVariants.js'))
const twWords = pairs(await load('TWVariantsPhrases.js'))
const twRevChars = pairs(await load('TWVariantsRev.js'))
const hkChars = pairs(await load('HKVariants.js'))
const hkWords = pairs(await load('HKVariantsPhrases.js'))
const hkRevChars = pairs(await load('HKVariantsRev.js'))
const stPhraseSrc = [
  ...pairs(await load('STPhrases.js')),
  ...pairs(await load('STPhrases_GeneratedFromRegionalPhrases.js')),
]

const stMap = new Map(st)
const naive = (s) => [...s].map((c) => stMap.get(c) ?? c).join('')
const needed = stPhraseSrc.filter(([k, v]) => naive(k) !== v && [...k].length === [...v].length)

// 例外词表按「这个词里这个位置默认值不成立」的频次排序（只在 needed 上统计）
const occ = new Map()
for (const [k, v] of needed) {
  const ks = [...k]
  const vs = [...v]
  const ns = [...naive(k)]
  const seen = new Set()
  for (let i = 0; i < ks.length; i++) {
    if (vs[i] === ks[i] && ns[i] === vs[i]) continue
    if (!seen.has(ks[i])) {
      occ.set(ks[i], (occ.get(ks[i]) ?? 0) + 1)
      seen.add(ks[i])
    }
  }
}
// 一字多形的判定改用**全词表**（含 OpenCC 那些「键=值」的同形条目）：
// 只用 needed（词表把默认值改了的那些）会让 出 / 了 / 后 这种字看起来「永远要改」，
// 因为它们的常用词（出去、好了）根本不会进词表 —— 语料本身有偏。
const twMap = new Map(twChars)
const defaultOf = (c) => {
  const t = stMap.get(c)
  return t === undefined ? c : twMap.get(t) ?? t
}
const pool = stPhraseSrc.filter(([k, v]) => [...k].length === [...v].length)
const tot = new Map()
const safe = new Map()
const alts = new Map()
for (const [k, v] of pool) {
  const ks = [...k]
  const vs = [...v]
  const perChar = new Map()
  for (let i = 0; i < ks.length; i++) {
    if (!perChar.has(ks[i])) perChar.set(ks[i], new Set())
    perChar.get(ks[i]).add(vs[i])
  }
  for (const [c, out] of perChar) {
    tot.set(c, (tot.get(c) ?? 0) + 1)
    let contested = false
    for (const o of out) {
      if (!alts.has(c)) alts.set(c, new Set())
      alts.get(c).add(o)
      if (o !== defaultOf(c)) contested = true
    }
    if (!contested) safe.set(c, (safe.get(c) ?? 0) + 1)
  }
}
// POLY_T = 1 表示「词表里存在过不同写法就复核」；调小则只标那些默认值明显不可靠的字
const POLY_T = Number(process.env.POLY_T ?? 1)
const polyChars = [...tot.keys()]
  .filter((c) => (safe.get(c) ?? 0) / tot.get(c) < POLY_T)
  .sort((a, b) => (safe.get(a) ?? 0) / tot.get(a) - (safe.get(b) ?? 0) / tot.get(b) || tot.get(b) - tot.get(a))

const ranked = [...occ.keys()].sort(
  (a, b) => occ.get(b) - occ.get(a) || alts.get(b).size - alts.get(a).size || (a < b ? -1 : 1),
)
const KEEP_N = Number(process.env.KEEP_N ?? 300)
const keep = new Set(ranked.slice(0, KEEP_N))
const words = needed
  .filter(([k]) => [...k].length === 2 && [...k].some((c) => keep.has(c)))
  .map(([k, v]) => {
    const ks = [...k]
    const vs = [...v]
    const ns = [...naive(k)]
    // 标记「换成 vs[i]」；若 vs[i] 就是原字但字级默认值会改它，标「i-」表示这里**不要转**
    const d = ks
      .map((c, i) => (vs[i] !== c ? `${i}${vs[i]}` : ns[i] !== vs[i] ? `${i}-` : ''))
      .join('')
    return [k, d]
  })
  .filter(([, d]) => d !== '')
  .sort((a, b) => (a[0] < b[0] ? -1 : 1))

const POLY = polyChars.map((c) => `${c}\u0001${[...alts.get(c)].sort().join('')}`).join('\u0002')

const packPairs = (arr) => {
  const a = []
  const b = []
  for (const [k, v] of arr) {
    a.push(k)
    b.push(v)
  }
  return `${a.join('')}\u0000${b.join('')}`
}
const packWords = (arr) => arr.map(([k, v]) => `${k}\u0001${v}`).join('\u0002')

const inv = new Map()
for (const [s, t] of st) if (!inv.has(t)) inv.set(t, s)
const delta = ts.filter(([t, s]) => inv.get(t) !== s)

const tables = {
  S2T_CHARS: packPairs(st),
  T2S_CHARS: packPairs(delta),
  S2T_WORDS: packWords(words),
  T2S_WORDS: packWords(tsp),
  POLY: POLY,
  TW_CHARS: packPairs(twChars),
  TW_WORDS: packWords(twWords),
  TW_REV: packPairs(twRevChars),
  HK_CHARS: packPairs(hkChars),
  HK_WORDS: packWords(hkWords),
  HK_REV: packPairs(hkRevChars),
}
let total = 0
for (const [n, s] of Object.entries(tables)) {
  console.log(`${n}: ${s.length} chars / ${utf8(s)} B`)
  total += utf8(s)
}
console.log('table total raw', total, 'gz(each summed)', Object.values(tables).reduce((a, s) => a + gz(s), 0))

const counts = {
  st: st.length,
  delta: delta.length,
  words: words.length,
  tsp: tsp.length,
  poly: polyChars.length,
  tw: twChars.length,
  twWords: twWords.length,
  twRev: twRevChars.length,
  hk: hkChars.length,
  hkWords: hkWords.length,
  hkRev: hkRevChars.length,
}
const header = `/**
 * 繁简转换的离线字表与词表。
 *
 * 数据源：OpenCC（Apache-2.0）的 STCharacters / TSCharacters / TSPhrases /
 * STPhrases(+Generated) / TWVariants* / HKVariants*，经 opencc-js ${'"'}1.4.2${'"'} 随包发布的表导出。
 * 生成方式见 README「繁简转换的字表是怎么来的」一节：
 * - 简→繁 = 字级默认值（S2T_CHARS）+ 高频一字多形的二字词例外（S2T_WORDS，按变化位置增量编码）；
 * - 繁→简 = S2T_CHARS 的反向（默认）+ T2S_CHARS（578 条与反向不一致的）+ T2S_WORDS（词级优先）；
 * - POLY 是「同一个简体字有多个常用繁体写法」的字表，只用于把不确定的位置标出来给用户复核；
 * - TW_* / HK_* 是台式 / 港式地区用字追加层。
 * 分隔符：\\u0000 分隔并列的两串；\\u0001 分隔条目的键与值；\\u0002 分隔条目。
 * 这个文件是生成物，不要手改。
 */
`
const body = Object.entries(tables)
  .map(([n, s]) => `export const ${n} = ${JSON.stringify(s)}\n`)
  .join('\n')
const statLine = `/* ${JSON.stringify(counts)} */\n`
mkdirSync('src/tools/chinese-variant', { recursive: true })
writeFileSync('src/tools/chinese-variant/table.ts', header + statLine + body)
console.log('written src/tools/chinese-variant/table.ts', utf8(header + statLine + body), 'B')
console.log('counts', counts)
