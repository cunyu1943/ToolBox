/**
 * 亲戚称谓推算：把「爸爸的哥哥的儿子」拆成原子关系链，逐级推导。
 *
 * 模型：原子只有 10 个 —— F 父、M 母、S 子、D 女、HB 兄、LB 弟、HS 姐、LS 妹、H 夫、W 妻。
 * 链 = 从「我」出发依次套用这些原子，每步先做**归一化重写**再查称谓表：
 *   · `H W` / `W H` 抵消（默认一夫一妻）
 *   · 父母的异性配偶即父/母本身（`F W` → `M`）
 *   · 手足的父母即自己的父母（`HB F` → `F`）
 *   · 后代的父母即上一环的自己（`S S F` → `S`）
 *   · 手足的手足：父系前缀下等价于换个性别（`F HB LS` → `F LS` = 姑母），空前缀则「自己或兄/弟/姐/妹」
 * 因此表里只需登记规范链，长链也能推。查不到的组合返回 `null` 由界面提示，而不是硬猜。
 *
 * 中文称谓对**长幼**和**性别**敏感，很多推导天生多解（堂哥/堂弟、自己/哥哥），
 * 这里如实返回候选集并用 `ambiguous` 标出，不假装唯一。
 * 也不覆盖再婚、收养、同性婚姻带来的称谓分支。
 */

export type Atom = 'F' | 'M' | 'S' | 'D' | 'HB' | 'LB' | 'HS' | 'LS' | 'H' | 'W'

export const ATOM_LABEL: Record<Atom, string> = {
  F: '爸爸', M: '妈妈', S: '儿子', D: '女儿',
  HB: '哥哥', LB: '弟弟', HS: '姐姐', LS: '妹妹', H: '老公', W: '老婆'
}

/** 输入词 → 原子（含常见同义词与口语写法） */
export const WORD_TO_ATOM: Record<string, Atom> = {
  爸爸: 'F', 父亲: 'F', 爹: 'F', 老爸: 'F', 爸: 'F', 父: 'F',
  妈妈: 'M', 母亲: 'M', 娘: 'M', 老妈: 'M', 妈: 'M', 母: 'M',
  儿子: 'S', 儿: 'S', 子: 'S',
  女儿: 'D', 闺女: 'D', 女: 'D',
  哥哥: 'HB', 兄: 'HB', 大哥: 'HB', 哥: 'HB',
  弟弟: 'LB', 弟: 'LB', 小弟: 'LB',
  姐姐: 'HS', 姐: 'HS', 大姐: 'HS',
  妹妹: 'LS', 妹: 'LS', 小妹: 'LS',
  老公: 'H', 丈夫: 'H', 先生: 'H', 夫: 'H',
  老婆: 'W', 妻子: 'W', 太太: 'W', 妻: 'W'
}

/** 派生称谓词 → 原子链，支持「爷爷的儿子」这类以称谓开头的链 */
export const WORD_TO_CHAIN: Record<string, Atom[]> = {
  爷爷: ['F', 'F'], 祖父: ['F', 'F'], 太爷爷: ['F', 'F', 'F'],
  奶奶: ['F', 'M'], 祖母: ['F', 'M'], 太奶奶: ['F', 'F', 'M'],
  外公: ['M', 'F'], 姥爷: ['M', 'F'], 外祖父: ['M', 'F'],
  外婆: ['M', 'M'], 姥姥: ['M', 'M'], 外祖母: ['M', 'M'],
  外曾祖父: ['M', 'F', 'F'], 外曾祖母: ['M', 'F', 'M'],
  伯伯: ['F', 'HB'], 伯父: ['F', 'HB'], 大叔: ['F', 'HB'], 大伯: ['F', 'HB'],
  大妈: ['F', 'HB', 'W'], 伯妈: ['F', 'HB', 'W'],
  叔叔: ['F', 'LB'], 叔父: ['F', 'LB'],
  姑姑: ['F', 'HS'], 姑母: ['F', 'HS'], 小姑: ['F', 'LS'],
  舅舅: ['M', 'HB'], 舅父: ['M', 'HB'],
  阿姨: ['M', 'HS'], 姨母: ['M', 'HS'], 小姨: ['M', 'LS'],
  堂哥: ['F', 'HB', 'S'], 堂弟: ['F', 'HB', 'S'], 堂姐: ['F', 'HB', 'D'], 堂妹: ['F', 'HB', 'D'],
  表哥: ['M', 'HB', 'S'], 表弟: ['M', 'HB', 'S'], 表姐: ['M', 'HB', 'D'], 表妹: ['M', 'HB', 'D'],
  侄子: ['HB', 'S'], 侄女: ['HB', 'D'], 外甥: ['HS', 'S'], 外甥女: ['HS', 'D'],
  儿子: ['S'], 女儿: ['D'], 孙子: ['S', 'S'], 孙女: ['S', 'D'],
  外孙: ['D', 'S'], 外孙女: ['D', 'D'],
  嫂子: ['HB', 'W'], 姐夫: ['HS', 'H'], 弟媳: ['LB', 'W'], 妹夫: ['LS', 'H'],
  儿媳: ['S', 'W'], 女婿: ['D', 'H'], 侄媳: ['HB', 'S', 'W'], 孙媳: ['S', 'S', 'W'],
  伯母: ['F', 'HB', 'W'], 婶婶: ['F', 'LB', 'W'], 姑父: ['F', 'HS', 'H'], 舅妈: ['M', 'HB', 'H'], 姨父: ['M', 'HS', 'H'],
  大伯子: ['H', 'HB'], 小叔子: ['H', 'LB'], 大姑子: ['H', 'HS'], 小姑子: ['H', 'LS'],
  妯娌: ['H', 'HB', 'W'], 连襟: ['W', 'HS', 'H'],
  大舅子: ['W', 'HB'], 小舅子: ['W', 'LB'], 大姨子: ['W', 'HS'], 小姨子: ['W', 'LS'],
  曾孙: ['S', 'S', 'S'], 侄孙: ['HB', 'S', 'S'],
  岳父: ['W', 'F'], 岳母: ['W', 'M'], 丈人: ['W', 'F'],
  公公: ['H', 'F'], 婆婆: ['H', 'M'],
  自己: [], 我: []
}

export interface KinEntry {
  /** 我称呼对方 */
  terms: string[]
  /** 对方称呼我（多解时全部列出） */
  reverse: string[]
  /** 长幼/性别导致的多解，界面需要提示「按长幼再分」 */
  ambiguous?: boolean
  note?: string
}

/** 规范链（`join(',')`）→ 称谓 */
export const KIN_TABLE: Record<string, KinEntry> = {
  '': { terms: ['自己'], reverse: ['自己'] },
  F: { terms: ['爸爸', '父亲'], reverse: ['儿子', '女儿'] },
  M: { terms: ['妈妈', '母亲'], reverse: ['儿子', '女儿'] },
  S: { terms: ['儿子'], reverse: ['爸爸', '妈妈'] },
  D: { terms: ['女儿'], reverse: ['爸爸', '妈妈'] },
  H: { terms: ['老公', '丈夫'], reverse: ['老婆', '妻子'] },
  W: { terms: ['老婆', '妻子'], reverse: ['老公', '丈夫'] },
  HB: { terms: ['哥哥'], reverse: ['弟弟', '妹妹'] },
  LB: { terms: ['弟弟'], reverse: ['哥哥', '姐姐'] },
  HS: { terms: ['姐姐'], reverse: ['弟弟', '妹妹'] },
  LS: { terms: ['妹妹'], reverse: ['哥哥', '姐姐'] },
  'F,S': { terms: ['自己', '哥哥', '弟弟'], reverse: ['爸爸', '妈妈'], ambiguous: true, note: '父母所生的男孩：可能是自己，也可能是自己的兄弟。' },
  'F,D': { terms: ['自己', '姐姐', '妹妹'], reverse: ['爸爸', '妈妈'], ambiguous: true, note: '父母所生的女孩：可能是自己，也可能是自己的姐妹。' },
  'M,S': { terms: ['自己', '哥哥', '弟弟'], reverse: ['爸爸', '妈妈'], ambiguous: true },
  'M,D': { terms: ['自己', '姐姐', '妹妹'], reverse: ['爸爸', '妈妈'], ambiguous: true },

  'F,F': { terms: ['爷爷', '祖父'], reverse: ['孙子', '孙女'] },
  'F,M': { terms: ['奶奶', '祖母'], reverse: ['孙子', '孙女'] },
  'M,F': { terms: ['外公', '外祖父', '姥爷'], reverse: ['外孙', '外孙女'] },
  'M,M': { terms: ['外婆', '外祖母', '姥姥'], reverse: ['外孙', '外孙女'] },
  'F,F,F': { terms: ['曾祖父', '太爷爷'], reverse: ['曾孙', '曾孙女'] },
  'F,F,M': { terms: ['曾祖母', '太奶奶'], reverse: ['曾孙', '曾孙女'] },
  'M,F,F': { terms: ['外曾祖父'], reverse: ['外曾孙', '外曾孙女'], note: '外祖父的父亲：与外祖母的父亲同称外曾祖父（母系曾祖辈）。' },
  'M,F,M': { terms: ['外曾祖母'], reverse: ['外曾孙', '外曾孙女'] },
  'M,M,F': { terms: ['外曾祖父'], reverse: ['外曾孙', '外曾孙女'] },
  'M,M,M': { terms: ['外曾祖母'], reverse: ['外曾孙', '外曾孙女'] },
  'F,F,S': { terms: ['自己', '伯伯', '叔叔', '姑姑'], reverse: ['自己', '侄子', '侄女'], ambiguous: true, note: '祖父的儿子/女儿：可能是自己（若父为独子则不可能），也可能是伯叔姑。' },

  'F,HB': { terms: ['伯父', '伯伯'], reverse: ['侄子', '侄女'] },
  'F,LB': { terms: ['叔叔', '叔父'], reverse: ['侄子', '侄女'] },
  'F,HS': { terms: ['姑母', '姑姑'], reverse: ['侄子', '侄女'] },
  'F,LS': { terms: ['姑母', '姑姑', '小姑'], reverse: ['侄子', '侄女'], ambiguous: true, note: '父亲的妹妹仍是「姑」，只是口语称小姑。' },
  'M,HB': { terms: ['舅舅', '舅父'], reverse: ['外甥', '外甥女'] },
  'M,LB': { terms: ['舅舅', '舅父', '小舅'], reverse: ['外甥', '外甥女'], ambiguous: true },
  'M,HS': { terms: ['姨母', '姨妈', '大姨'], reverse: ['外甥', '外甥女'] },
  'M,LS': { terms: ['姨母', '姨妈', '小姨'], reverse: ['外甥', '外甥女'] },
  'F,HB,W': { terms: ['伯母', '大妈'], reverse: ['侄子', '侄女'] },
  'F,LB,W': { terms: ['婶母', '婶婶'], reverse: ['侄子', '侄女'] },
  'F,HS,H': { terms: ['姑父', '姑丈'], reverse: ['侄子', '侄女'] },
  'F,LS,H': { terms: ['姑父', '姑丈'], reverse: ['侄子', '侄女'] },
  'M,HB,H': { terms: ['舅妈'], reverse: ['外甥', '外甥女'] },
  'M,HS,H': { terms: ['姨父', '姨丈'], reverse: ['外甥', '外甥女'] },
  'M,LS,H': { terms: ['姨父', '姨丈'], reverse: ['外甥', '外甥女'] },

  'HB,W': { terms: ['嫂子', '嫂'], reverse: ['小叔子', '小姑子'] },
  'LB,W': { terms: ['弟媳', '弟妹'], reverse: ['大伯子', '大姑子'] },
  'HS,H': { terms: ['姐夫'], reverse: ['内弟', '内妹'] },
  'LS,H': { terms: ['妹夫'], reverse: ['内兄', '内姐'] },
  'HB,S': { terms: ['侄子'], reverse: ['伯伯', '伯母'] },
  'HB,D': { terms: ['侄女'], reverse: ['伯伯', '伯母'] },
  'LB,S': { terms: ['侄子'], reverse: ['叔叔', '婶婶'] },
  'LB,D': { terms: ['侄女'], reverse: ['叔叔', '婶婶'] },
  'HS,S': { terms: ['外甥'], reverse: ['舅舅', '舅妈', '姨', '姐夫', '妹夫'] },
  'HS,D': { terms: ['外甥女'], reverse: ['舅舅', '舅妈', '姨'] },
  'LS,S': { terms: ['外甥'], reverse: ['舅舅', '舅妈', '姨'] },
  'LS,D': { terms: ['外甥女'], reverse: ['舅舅', '舅妈', '姨'] },

  'F,HB,S': { terms: ['堂兄', '堂弟'], reverse: ['堂弟', '堂兄'], ambiguous: true, note: '伯父/叔父的儿子属父系同辈，同姓，按长幼称堂兄或堂弟。' },
  'F,LB,S': { terms: ['堂兄', '堂弟'], reverse: ['堂弟', '堂兄'], ambiguous: true },
  'F,HB,S,S': { terms: ['堂侄'], reverse: ['堂伯父', '堂叔父'] },
  'F,HB,S,D': { terms: ['堂侄女'], reverse: ['堂伯父', '堂叔父'] },
  'F,LB,S,S': { terms: ['堂侄'], reverse: ['堂伯父', '堂叔父'] },
  'F,LB,S,D': { terms: ['堂侄女'], reverse: ['堂伯父', '堂叔父'] },
  'F,HB,D': { terms: ['堂姐', '堂妹'], reverse: ['堂妹', '堂姐'], ambiguous: true },
  'F,LB,D': { terms: ['堂姐', '堂妹'], reverse: ['堂妹', '堂姐'], ambiguous: true },
  'F,HS,S': { terms: ['表哥', '表弟'], reverse: ['表弟', '表哥'], ambiguous: true, note: '姑姑的儿子是「姑表」，与父系堂亲不同。' },
  'F,HS,D': { terms: ['表姐', '表妹'], reverse: ['表妹', '表姐'], ambiguous: true },
  'M,HB,S': { terms: ['表哥', '表弟'], reverse: ['表弟', '表哥'], ambiguous: true },
  'M,HB,D': { terms: ['表姐', '表妹'], reverse: ['表妹', '表姐'], ambiguous: true },
  'M,HS,S': { terms: ['表哥', '表弟'], reverse: ['表弟', '表哥'], ambiguous: true },
  'M,HS,D': { terms: ['表姐', '表妹'], reverse: ['表妹', '表姐'], ambiguous: true },

  'S,W': { terms: ['儿媳', '儿媳妇'], reverse: ['公公', '婆婆'] },
  'D,H': { terms: ['女婿'], reverse: ['岳父', '岳母'] },
  'S,S': { terms: ['孙子'], reverse: ['爷爷', '奶奶'] },
  'S,D': { terms: ['孙女'], reverse: ['爷爷', '奶奶'] },
  'D,S': { terms: ['外孙'], reverse: ['外公', '外婆'] },
  'D,D': { terms: ['外孙女'], reverse: ['外公', '外婆'] },
  'S,HB': { terms: ['儿子'], reverse: ['爸爸', '妈妈'], ambiguous: true, note: '儿子的哥哥同样是自己的孩子（年长的那一个）。' },
  'S,LB': { terms: ['儿子'], reverse: ['爸爸', '妈妈'], ambiguous: true },
  'S,HS': { terms: ['女儿'], reverse: ['爸爸', '妈妈'], ambiguous: true },
  'S,LS': { terms: ['女儿'], reverse: ['爸爸', '妈妈'], ambiguous: true },
  'D,HB': { terms: ['儿子'], reverse: ['爸爸', '妈妈'], ambiguous: true },
  'D,LB': { terms: ['儿子'], reverse: ['爸爸', '妈妈'], ambiguous: true },
  'D,HS': { terms: ['女儿'], reverse: ['爸爸', '妈妈'], ambiguous: true },
  'D,LS': { terms: ['女儿'], reverse: ['爸爸', '妈妈'], ambiguous: true },
  'S,S,S': { terms: ['曾孙'], reverse: ['曾祖父', '曾祖母'] },
  'HB,S,S': { terms: ['侄孙'], reverse: ['叔祖父', '叔祖母'] },
  'HB,S,W': { terms: ['侄媳'], reverse: ['伯父', '叔叔'] },
  'S,S,W': { terms: ['孙媳'], reverse: ['爷爷', '奶奶'] },

  'H,F': { terms: ['公公'], reverse: ['儿媳'] },
  'H,M': { terms: ['婆婆'], reverse: ['儿媳'] },
  'W,F': { terms: ['岳父', '丈人'], reverse: ['女婿'] },
  'W,M': { terms: ['岳母', '丈母娘'], reverse: ['女婿'] },
  'H,HB': { terms: ['大伯子'], reverse: ['弟媳'] },
  'H,LB': { terms: ['小叔子'], reverse: ['嫂子'] },
  'H,HS': { terms: ['大姑子'], reverse: ['弟媳'] },
  'H,LS': { terms: ['小姑子'], reverse: ['嫂子'] },
  'H,HB,W': { terms: ['妯娌'], reverse: ['妯娌'], note: '丈夫的兄弟的妻子之间互称妯娌。' },
  'H,LB,W': { terms: ['妯娌'], reverse: ['妯娌'] },
  'W,HB': { terms: ['内兄', '大舅子'], reverse: ['妹夫'] },
  'W,LB': { terms: ['妻弟', '小舅子'], reverse: ['姐夫'] },
  'W,HS': { terms: ['内姐', '大姨子'], reverse: ['妹夫'] },
  'W,LS': { terms: ['妻妹', '小姨子'], reverse: ['姐夫'] },
  'W,HS,H': { terms: ['连襟'], reverse: ['连襟'], note: '妻子的姐妹的丈夫之间互称连襟（也就是「一担挑」），自己也是对方的连襟。' },
  'W,LS,H': { terms: ['连襟'], reverse: ['连襟'] }
}

export interface KinHit extends KinEntry {
  /** 归一化后的规范链 */
  key: string
  /** 规范链对应的原子，便于展示「= 爸爸 的 哥哥」 */
  atoms: Atom[]
}

const isSibling = (a: Atom): boolean => a === 'HB' || a === 'LB' || a === 'HS' || a === 'LS'
const isDescent = (a: Atom): boolean => a === 'S' || a === 'D'
const isParent = (a: Atom): boolean => a === 'F' || a === 'M'
const isSpouse = (a: Atom): boolean => a === 'H' || a === 'W'

const keyOf = (atoms: Atom[]): string => atoms.join(',')
const ALL_ATOMS: Atom[] = ['F', 'M', 'S', 'D', 'HB', 'LB', 'HS', 'LS', 'H', 'W']

/** 归一化：只在链尾两原子之间做重写，循环到不动。返回 null 表示模型不覆盖。 */
function normalize(path: Atom[]): Atom[] | null {
  const p = [...path]
  for (let guard = 0; guard < 64; guard += 1) {
    const last = p[p.length - 1]
    const prev = p[p.length - 2]
    if (last === undefined || prev === undefined) return p
    if (isSpouse(prev) && isSpouse(last) && prev !== last) {
      p.length -= 2
      continue
    }
    if (isParent(prev) && isSpouse(last)) {
      if ((prev === 'F' && last === 'H') || (prev === 'M' && last === 'W')) return null
      p[p.length - 2] = prev === 'F' ? 'M' : 'F'
      p.length -= 1
      continue
    }
    if (isSibling(prev) && isParent(last)) {
      p[p.length - 2] = last
      p.length -= 1
      continue
    }
    if (isDescent(prev) && isParent(last)) {
      p.length -= 2
      continue
    }
    if (isSibling(prev) && isSibling(last)) {
      // 父系前缀下的「手足的手足」等价于换个性别（伯父的妹妹 = 姑母）；
      // 空前缀（自己的手足的手足）保留两原子，由 resolveChain 给出「自己 / 兄弟姐妹」的多解。
      if (p.length === 2) return p
      p.length -= 1
      continue
    }
    // 后代的同辈（儿子的哥哥）交给称谓表，不在这里重写
    return p
  }
  return null
}

/** 逐步套用原子；返回 null 表示该组合超出内置模型 */
export function resolveChain(atoms: Atom[]): KinHit | null {
  let path: Atom[] = []
  for (const atom of atoms) {
    if (!ALL_ATOMS.includes(atom)) return null
    const next = normalize([...path, atom])
    if (next === null) return null
    path = next
    if (path.length > 6) return null
  }
  const key = keyOf(path)
  const entry = KIN_TABLE[key]
  if (entry) return { ...entry, key, atoms: path }
  if (path.length === 2 && isSibling(path[0]!) && isSibling(path[1]!)) {
    return {
      key,
      atoms: path,
      terms: ['自己', ATOM_LABEL[path[1]!]],
      reverse: ['自己', ATOM_LABEL[path[0]!]],
      ambiguous: true,
      note: '自己的手足的手足：可能是自己，也可能是自己的兄弟或姐妹（长幼未知）。'
    }
  }
  return null
}

export interface ChainParseResult {
  ok: boolean
  error?: string
  atoms: Atom[]
  /** 未能识别的词 */
  unknown: string[]
  /** 归一化说明 */
  segments: string[]
}

/** 全部可识别的词，长词优先，供无分隔符的压缩写法做最长匹配切分 */
const WORD_ENTRIES: { word: string; atoms: Atom[] }[] = [
  ...Object.entries(WORD_TO_CHAIN).map(([word, atoms]) => ({ word, atoms })),
  ...Object.entries(WORD_TO_ATOM).map(([word, atom]) => ({ word, atoms: [atom] }))
].sort((a, b) => b.word.length - a.word.length)

function greedySplit(part: string): { atoms: Atom[]; segments: string[] } | null {
  const atoms: Atom[] = []
  const segments: string[] = []
  let rest = part
  while (rest.length > 0) {
    const entry = WORD_ENTRIES.find((candidate) => rest.startsWith(candidate.word))
    if (!entry) return null
    atoms.push(...entry.atoms)
    segments.push(`${entry.word}（${entry.atoms.map((a) => ATOM_LABEL[a]).join('·')}）`)
    rest = rest.slice(entry.word.length)
  }
  return { atoms, segments }
}

/** 解析「爸爸的哥哥的儿子」「爸 哥 子」「姑妈的儿子」等写法；分隔符可为空格、的、>、, */
export function parseChain(input: string): ChainParseResult {
  const raw = (input ?? '').trim()
  if (!raw) return { ok: false, error: '请输入关系链，例如「爸爸的哥哥的儿子」', atoms: [], unknown: [], segments: [] }
  const parts = raw
    .replace(/的/g, ' ')
    .split(/[\s,，、>｜|]+/)
    .filter((piece) => piece.length > 0)

  const atoms: Atom[] = []
  const unknown: string[] = []
  const segments: string[] = []
  for (const part of parts) {
    const direct = WORD_TO_ATOM[part]
    if (direct) {
      atoms.push(direct)
      segments.push(`${part}（${direct}）`)
      continue
    }
    const chain = WORD_TO_CHAIN[part]
    if (chain) {
      atoms.push(...chain)
      segments.push(`${part}（${chain.map((a) => ATOM_LABEL[a]).join('·')}）`)
      continue
    }
    const greedy = greedySplit(part)
    if (greedy) {
      atoms.push(...greedy.atoms)
      segments.push(...greedy.segments)
    } else {
      unknown.push(part)
    }
  }

  if (unknown.length) {
    return {
      ok: false,
      error: `无法识别「${unknown.join('、')}」。可用「爸爸/妈妈/哥哥/弟弟/姐姐/妹妹/儿子/女儿/老公/老婆」，以及爷爷、叔叔、姑姑、舅舅、表哥、侄子、岳父等常见称谓词（也可点下面的按钮逐个添加）。`,
      atoms,
      unknown,
      segments
    }
  }
  return { ok: true, atoms, unknown, segments }
}

/** 关系链的中文读法，如「爸爸 的 哥哥 的 儿子」 */
export const renderChain = (atoms: Atom[]): string => atoms.map((a) => ATOM_LABEL[a]).join(' 的 ')

/** 界面上的关系按钮：按「长辈 / 平辈 / 晚辈 / 配偶」分组 */
export const ATOM_GROUPS: { title: string; atoms: Atom[] }[] = [
  { title: '长辈', atoms: ['F', 'M'] },
  { title: '平辈', atoms: ['HB', 'LB', 'HS', 'LS'] },
  { title: '晚辈', atoms: ['S', 'D'] },
  { title: '配偶', atoms: ['H', 'W'] }
]

/** 预设链，点一下直接填好 */
export const KIN_PRESETS: { label: string; chain: string }[] = [
  { label: '爸爸的哥哥', chain: '爸爸的哥哥' },
  { label: '妈妈的姐姐', chain: '妈妈的姐姐' },
  { label: '姑姑的儿子', chain: '姑姑的儿子' },
  { label: '舅舅的儿子', chain: '舅舅的儿子' },
  { label: '老公的姐姐', chain: '老公的姐姐' },
  { label: '孙子的儿子', chain: '孙子的儿子' }
]
