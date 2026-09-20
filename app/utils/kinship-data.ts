/**
 * 亲戚称谓计算：内置关系图 + 逐级推导。
 *
 * 思路：把「A 的 B 的 C」拆成从 self 出发、逐段应用一个「关系」的链。
 * 每个「人」是一个节点（如 father、guGu…），给定节点 + 关系，映射到下一个节点。
 * 由于中文称谓对性别/长幼敏感，部分推导会得到多个候选（如 表哥/表弟），这里如实返回候选集，
 * 无法在关系图中推导的组合返回 null，由界面给出「未能识别」提示而非报错。
 */

/** 基础关系词 → 规范化关系 token（支持常见同义词） */
export const RELATION_TOKENS: Record<string, string> = {
  爸爸: 'father', 父亲: 'father', 爹: 'father',
  妈妈: 'mother', 母亲: 'mother', 娘: 'mother',
  儿子: 'son', 儿: 'son',
  女儿: 'daughter', 闺女: 'daughter',
  哥哥: 'eBrother', 兄: 'eBrother', 大哥: 'eBrother',
  弟弟: 'yBrother', 弟: 'yBrother', 小弟: 'yBrother',
  姐姐: 'eSister', 姐: 'eSister', 大姐: 'eSister',
  妹妹: 'ySister', 妹: 'ySister', 小妹: 'ySister',
  老公: 'husband', 丈夫: 'husband', 先生: 'husband',
  老婆: 'wife', 妻子: 'wife', 太太: 'wife'
}

/**
 * 派生称谓词 → 人物节点。输入链中的这类词会先展开为该节点相对 self 的原子路径
 * （见 NODE_PATH），再从当前节点逐步套用，从而支持「侄子的爸爸」等以称谓开头的链。
 */
export const DERIVED_TOKENS: Record<string, string> = {
  爷爷: 'grandfatherP', 祖父: 'grandfatherP',
  奶奶: 'grandmotherP', 祖母: 'grandmotherP',
  外公: 'grandfatherM', 姥爷: 'grandfatherM',
  外婆: 'grandmotherM', 姥姥: 'grandmotherM',
  伯伯: 'boBo', 伯父: 'boBo',
  叔叔: 'shuShu', 叔父: 'shuShu',
  姑姑: 'guGu', 姑母: 'guGu',
  舅舅: 'jiuJiu', 舅父: 'jiuJiu',
  阿姨: 'yiYi', 姨母: 'yiYi',
  侄子: 'zhiNan', 侄女: 'zhiNv',
  外甥: 'waiSheng', 外甥女: 'waiShengNv',
  堂哥: 'tangBrother', 堂弟: 'tangBrother', 堂姐: 'tangSister', 堂妹: 'tangSister',
  表哥: 'biaoBrother', 表弟: 'biaoBrother', 表姐: 'biaoSister', 表妹: 'biaoSister',
  孙子: 'sunZi', 孙女: 'sunNv', 外孙: 'waiSun', 外孙女: 'waiSunNv',
  公公: 'gongGong', 婆婆: 'poPo',
  岳父: 'yueFu', 岳母: 'yueMu', 丈人: 'yueFu'
}

export interface PersonNode {
  /** 我如何称呼该人（可能有多个候选，如 表哥/表弟） */
  terms: string[]
  /** 该人如何称呼我（反向） */
  reverse: string[]
  /** 该关系是否按长幼/性别存在歧义，需在界面提示 */
  ambiguous?: boolean
}

/** 人物节点：我 ↔ 对方的称谓映射 */
export const PERSONS: Record<string, PersonNode> = {
  self: { terms: ['我', '自己'], reverse: ['我', '自己'] },

  father: { terms: ['爸爸'], reverse: ['儿子/女儿'] },
  mother: { terms: ['妈妈'], reverse: ['儿子/女儿'] },
  son: { terms: ['儿子'], reverse: ['爸爸/妈妈'] },
  daughter: { terms: ['女儿'], reverse: ['爸爸/妈妈'] },

  eBrother: { terms: ['哥哥'], reverse: ['弟弟/妹妹'] },
  yBrother: { terms: ['弟弟'], reverse: ['哥哥/姐姐'] },
  eSister: { terms: ['姐姐'], reverse: ['弟弟/妹妹'] },
  ySister: { terms: ['妹妹'], reverse: ['哥哥/姐姐'] },

  husband: { terms: ['老公'], reverse: ['老婆'] },
  wife: { terms: ['老婆'], reverse: ['老公'] },

  grandfatherP: { terms: ['爷爷'], reverse: ['孙子/孙女'] },
  grandmotherP: { terms: ['奶奶'], reverse: ['孙子/孙女'] },
  grandfatherM: { terms: ['外公'], reverse: ['外孙/外孙女'] },
  grandmotherM: { terms: ['外婆'], reverse: ['外孙/外孙女'] },

  boBo: { terms: ['伯伯'], reverse: ['侄子/侄女'] },
  shuShu: { terms: ['叔叔'], reverse: ['侄子/侄女'] },
  guGu: { terms: ['姑姑'], reverse: ['侄子/侄女'] },
  jiuJiu: { terms: ['舅舅'], reverse: ['外甥/外甥女'] },
  yiYi: { terms: ['阿姨'], reverse: ['外甥/外甥女'] },

  zhiNan: { terms: ['侄子'], reverse: ['伯伯/叔叔/姑姑'] },
  zhiNv: { terms: ['侄女'], reverse: ['伯伯/叔叔/姑姑'] },
  waiSheng: { terms: ['外甥'], reverse: ['舅舅/阿姨'] },
  waiShengNv: { terms: ['外甥女'], reverse: ['舅舅/阿姨'] },

  // 堂/表兄弟姐妹：父系兄弟的孩子为「堂」，其余（姑/舅/姨）为「表」，存在长幼歧义
  tangBrother: { terms: ['堂哥/堂弟'], reverse: ['堂弟/堂哥'], ambiguous: true },
  tangSister: { terms: ['堂姐/堂妹'], reverse: ['堂妹/堂姐'], ambiguous: true },
  biaoBrother: { terms: ['表哥/表弟'], reverse: ['表弟/表哥'], ambiguous: true },
  biaoSister: { terms: ['表姐/表妹'], reverse: ['表妹/表姐'], ambiguous: true },

  sunZi: { terms: ['孙子'], reverse: ['爷爷/奶奶'] },
  sunNv: { terms: ['孙女'], reverse: ['爷爷/奶奶'] },
  waiSun: { terms: ['外孙'], reverse: ['外公/外婆'] },
  waiSunNv: { terms: ['外孙女'], reverse: ['外公/外婆'] },

  gongGong: { terms: ['公公'], reverse: ['儿媳'] },
  poPo: { terms: ['婆婆'], reverse: ['儿媳'] },
  yueFu: { terms: ['岳父'], reverse: ['女婿'] },
  yueMu: { terms: ['岳母'], reverse: ['女婿'] },

  saoZi: { terms: ['嫂子'], reverse: ['小叔子/小姑子'] },
  diXi: { terms: ['弟媳'], reverse: ['大伯子/大姑子'] },
  jieFu: { terms: ['姐夫'], reverse: ['妻弟/妻妹'] },
  meiFu: { terms: ['妹夫'], reverse: ['妻兄/妻姐'] },
  erXi: { terms: ['儿媳'], reverse: ['公公/婆婆'] },
  nvXu: { terms: ['女婿'], reverse: ['岳父/岳母'] },

  // 配偶的兄弟姐妹（姻亲），按长幼/性别细分；对方对「我」的称呼随我的性别存在歧义
  neiXiong: { terms: ['内兄 / 大舅子'], reverse: ['姐夫/妹夫'] },
  neiDi: { terms: ['内弟 / 小舅子'], reverse: ['姐夫/妹夫'] },
  qiJie: { terms: ['妻姐 / 大姨子'], reverse: ['姐夫/妹夫'] },
  qiMei: { terms: ['妻妹 / 小姨子'], reverse: ['姐夫/妹夫'] },
  daBo: { terms: ['大伯子'], reverse: ['嫂子/弟媳'] },
  xiaoShu: { terms: ['小叔子'], reverse: ['嫂子/弟媳'] },
  daGu: { terms: ['大姑子'], reverse: ['嫂子/弟媳'] },
  xiaoGu: { terms: ['小姑子'], reverse: ['嫂子/弟媳'] }
}

/**
 * 关系转移表：给定「当前人」+「关系」→「下一个关系」。
 * 值为空表示该组合无法在内置关系图中推导。
 * 注：除手动正向边外，模块加载还会自动派生「反向边」（见下方 BACKWARD），
 * 参照 mumuy/relationship 的无向关系网思路：「A 的 rel 是 B」⇔「B 的 rel⁻¹ 是 A」。
 */
const STEP: Record<string, Partial<Record<string, string>>> = {
  self: {
    father: 'father', mother: 'mother', son: 'son', daughter: 'daughter',
    eBrother: 'eBrother', yBrother: 'yBrother', eSister: 'eSister', ySister: 'ySister',
    husband: 'husband', wife: 'wife'
  },
  father: {
    father: 'grandfatherP', mother: 'grandmotherP',
    eBrother: 'boBo', yBrother: 'shuShu', eSister: 'guGu', ySister: 'guGu',
    son: 'self', daughter: 'self'
  },
  mother: {
    father: 'grandfatherM', mother: 'grandmotherM',
    eBrother: 'jiuJiu', yBrother: 'jiuJiu', eSister: 'yiYi', ySister: 'yiYi',
    son: 'self', daughter: 'self'
  },
  eBrother: {
    son: 'zhiNan', daughter: 'zhiNv', wife: 'saoZi',
    father: 'father', mother: 'mother', eBrother: 'eBrother', yBrother: 'yBrother',
    eSister: 'eSister', ySister: 'ySister'
  },
  yBrother: {
    son: 'zhiNan', daughter: 'zhiNv', wife: 'diXi',
    father: 'father', mother: 'mother', eBrother: 'eBrother', yBrother: 'yBrother',
    eSister: 'eSister', ySister: 'ySister'
  },
  eSister: {
    son: 'waiSheng', daughter: 'waiShengNv', husband: 'jieFu',
    father: 'father', mother: 'mother', eBrother: 'eBrother', yBrother: 'yBrother',
    eSister: 'eSister', ySister: 'ySister'
  },
  ySister: {
    son: 'waiSheng', daughter: 'waiShengNv', husband: 'meiFu',
    father: 'father', mother: 'mother', eBrother: 'eBrother', yBrother: 'yBrother',
    eSister: 'eSister', ySister: 'ySister'
  },
  husband: {
    father: 'gongGong', mother: 'poPo', son: 'son', daughter: 'daughter',
    eBrother: 'daBo', yBrother: 'xiaoShu', eSister: 'daGu', ySister: 'xiaoGu'
  },
  wife: {
    father: 'yueFu', mother: 'yueMu', son: 'son', daughter: 'daughter',
    eBrother: 'neiXiong', yBrother: 'neiDi', eSister: 'qiJie', ySister: 'qiMei'
  },
  son: { son: 'sunZi', daughter: 'sunNv', wife: 'erXi', father: 'self', mother: 'self' },
  daughter: { son: 'waiSun', daughter: 'waiSunNv', husband: 'nvXu', father: 'self', mother: 'self' },
  boBo: { son: 'tangBrother', daughter: 'tangSister' },
  shuShu: { son: 'tangBrother', daughter: 'tangSister' },
  guGu: { son: 'biaoBrother', daughter: 'biaoSister' },
  jiuJiu: { son: 'biaoBrother', daughter: 'biaoSister' },
  yiYi: { son: 'biaoBrother', daughter: 'biaoSister' },
  grandfatherP: { eBrother: 'boBo', yBrother: 'shuShu', eSister: 'guGu', ySister: 'guGu' },
  grandmotherP: { eBrother: 'boBo', yBrother: 'shuShu', eSister: 'guGu', ySister: 'guGu' },
  grandfatherM: { eBrother: 'jiuJiu', yBrother: 'jiuJiu', eSister: 'yiYi', ySister: 'yiYi' },
  grandmotherM: { eBrother: 'jiuJiu', yBrother: 'jiuJiu', eSister: 'yiYi', ySister: 'yiYi' }
}

/**
 * 反向关系词：A 的 `rel` 是 B，则 B 的 `反(rel)` 是 A。
 * 父/母的反向是「儿子或女儿」（性别未知，两者都算候选）；兄/姐的反向按长幼对调。
 */
const INVERSE_REL: Record<string, string[]> = {
  father: ['son', 'daughter'],
  mother: ['son', 'daughter'],
  son: ['father', 'mother'],
  daughter: ['father', 'mother'],
  eBrother: ['yBrother', 'ySister'],
  yBrother: ['eBrother', 'eSister'],
  eSister: ['yBrother', 'ySister'],
  ySister: ['eBrother', 'eSister'],
  husband: ['wife'],
  wife: ['husband']
}

/** 某关系词要求目标人物的性别（'m' 男 / 'f' 女），用于剔除反向推导中的性别矛盾候选。 */
const REL_GENDER: Record<string, 'm' | 'f'> = {
  father: 'm', husband: 'm', son: 'm', eBrother: 'm', yBrother: 'm',
  mother: 'f', wife: 'f', daughter: 'f', eSister: 'f', ySister: 'f'
}

/** 人物节点的性别。'u' 表示随使用者而定（self 及血亲晚辈），反向推导时按关系词性别约束处理。 */
const PERSON_GENDER: Record<string, 'm' | 'f' | 'u'> = {
  self: 'u',
  father: 'm', mother: 'f', son: 'm', daughter: 'f',
  eBrother: 'm', yBrother: 'm', eSister: 'f', ySister: 'f',
  husband: 'm', wife: 'f',
  grandfatherP: 'm', grandmotherP: 'f', grandfatherM: 'm', grandmotherM: 'f',
  boBo: 'm', shuShu: 'm', guGu: 'f', jiuJiu: 'm', yiYi: 'f',
  zhiNan: 'm', zhiNv: 'f', waiSheng: 'm', waiShengNv: 'f',
  tangBrother: 'm', tangSister: 'f', biaoBrother: 'm', biaoSister: 'f',
  sunZi: 'm', sunNv: 'f', waiSun: 'm', waiSunNv: 'f',
  gongGong: 'm', poPo: 'f', yueFu: 'm', yueMu: 'f',
  saoZi: 'f', diXi: 'f', jieFu: 'm', meiFu: 'm', erXi: 'f', nvXu: 'm',
  neiXiong: 'm', neiDi: 'm', qiJie: 'f', qiMei: 'f',
  daBo: 'm', xiaoShu: 'm', daGu: 'f', xiaoGu: 'f'
}

/**
 * 反向转移表：`BACKWARD[to][invRel]` = 满足「from 的某直系关系恰好是 to」的所有 from。
 * 由 STEP 单向表自动求逆得到，从而支持「侄子的爸爸」「爷爷的儿子」等回溯链。
 */
const BACKWARD: Record<string, Record<string, Set<string>>> = {}
for (const [from, edges] of Object.entries(STEP)) {
  for (const [rel, to] of Object.entries(edges)) {
    if (!to) continue
    for (const invRel of INVERSE_REL[rel] ?? []) {
      // 目标 from 的性别必须符合 invRel 的性别要求（'u' 由后续按链路上下文处理，此处放行）
      const g = PERSON_GENDER[from]
      const want = REL_GENDER[invRel]
      if (g && want && g !== 'u' && g !== want) continue
      const set = ((BACKWARD[to] ??= {})[invRel] ??= new Set<string>())
      set.add(from)
    }
  }
}

// 兄弟姐妹共享父母：若「A 的兄/弟/姐/妹是 B」且「A 的父亲/母亲是 P」，则 B 的父母同为 P，P 的子女也含 B。
// 由此「叔叔的爸爸→爷爷」「大伯子的爸爸→公公」等链路无需逐条手写。
for (const [a, edges] of Object.entries(STEP)) {
  for (const sibRel of ['eBrother', 'yBrother', 'eSister', 'ySister']) {
    const b = edges[sibRel]
    if (!b) continue
    for (const parentRel of ['father', 'mother']) {
      const p = edges[parentRel]
      if (!p) continue
      ;((BACKWARD[b] ??= {})[parentRel] ??= new Set<string>()).add(p)
      const childRel = PERSON_GENDER[b] === 'f' ? 'daughter' : 'son'
      ;((BACKWARD[p] ??= {})[childRel] ??= new Set<string>()).add(b)
    }
  }
}

/**
 * 每个人物节点相对 self 的「原子关系路径」（对 STEP 正向边做 BFS 求最短路径）。
 * STEP 的每条边都是「对当前人作用」的函数，因此该路径可从任意中间节点套用：
 * 如 「侄子」= [eBrother, son]，「X 的侄子」即从 X 出发依次应用这两个原子关系。
 */
const NODE_PATH: Record<string, string[]> = (() => {
  const prev = new Map<string, { from: string; rel: string }>()
  const queue = ['self']
  const seen = new Set(queue)
  while (queue.length) {
    const n = queue.shift() as string
    for (const [rel, to] of Object.entries(STEP[n] ?? {})) {
      if (to && !seen.has(to)) {
        seen.add(to)
        prev.set(to, { from: n, rel })
        queue.push(to)
      }
    }
  }
  const out: Record<string, string[]> = {}
  for (const node of seen) {
    const path: string[] = []
    let cur = prev.get(node)
    while (cur) {
      path.unshift(cur.rel)
      cur = prev.get(cur.from)
    }
    out[node] = path
  }
  return out
})()

export interface KinshipResult {
  /** 我称呼对方 */
  terms: string[]
  /** 对方称呼我 */
  reverse: string[]
  ambiguous: boolean
  /** 命中的节点 id */
  person: string
}

/** 解析并推导关系链。输入如「爸爸的姐姐的儿子」。失败返回 null。 */
export function resolveKinship(input: string, reverse = false): KinshipResult | null {
  const chain = input
    .split(/的|之/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!chain.length) return null

  // 参照 mumuy/relationship：节点集在双向图上逐级扩展，
  // 优先用手动正向边（语义更精确），缺失时回退到自动派生的反向边；多候选即歧义。
  let nodes = new Set<string>(['self'])
  for (const token of chain) {
    let atomic: string[] | null = null
    const basic = RELATION_TOKENS[token]
    if (basic) {
      atomic = [basic]
    } else {
      const person = DERIVED_TOKENS[token]
      if (person) atomic = NODE_PATH[person] ?? null
    }
    if (!atomic?.length) return null // 未知称谓词
    for (const rel of atomic) {
      const next = new Set<string>()
      for (const n of nodes) {
        const fwd = STEP[n]?.[rel]
        if (fwd) {
          next.add(fwd)
          continue
        }
        for (const b of BACKWARD[n]?.[rel] ?? []) next.add(b)
      }
      if (!next.size) return null // 该组合无法推导
      nodes = next
    }
  }

  const persons: PersonNode[] = []
  for (const n of nodes) {
    const p = PERSONS[n]
    if (p) persons.push(p)
  }
  if (!persons.length) return null

  const uniq = (xs: string[]) => [...new Set(xs)]
  const terms = uniq(persons.flatMap((p) => p.terms))
  const rev = uniq(persons.flatMap((p) => p.reverse))
  return {
    terms: reverse ? rev : terms,
    reverse: reverse ? terms : rev,
    ambiguous: nodes.size > 1 || persons.some((p) => p.ambiguous),
    person: [...nodes].join('/')
  }
}

/** 首页/页面的常见关系快捷示例 */
export const KINSHIP_EXAMPLES = [
  '爸爸的姐姐的儿子',
  '妈妈的弟弟',
  '老婆的弟弟',
  '哥哥的儿子',
  '爷爷的哥哥',
  '侄子的爸爸',
  '叔叔的爸爸'
]
