/**
 * HTML 实体编解码内核（纯函数，无 DOM 依赖）。
 *
 * 编码方向只输出「会破坏结构」的字符（`& < > "` / 属性下再加 `'`）与可选的数字字符引用；
 * 解码方向覆盖一份 Latin-1 + 常用符号 + 希腊字母 + 数学符号的命名表，并实现 HTML 规范对
 * 数字引用的越界替换规则（NUL、代理区、> U+10FFFF → U+FFFD）。
 */

export type EntityMode = 'text' | 'attribute'

/** 结构必转字符：文本上下文 */
const TEXT_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }
/** 属性上下文追加的两个引号 */
const QUOTE_ESCAPES: Record<string, string> = { '"': '&quot;', "'": '&#39;' }

/**
 * HTML 规范里「可以不带分号继续解析」的历史命名引用。
 * 例如 `&ampx` 在浏览器里解码成 `&x`，而不是未知实体。
 */
const LEGACY_NAMES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0'
}

const LEGACY_KEYS = Object.keys(LEGACY_NAMES).sort((a, b) => b.length - a.length)

/** name → 字符；命名表按「逗号分隔的名字 + 逗号分隔的字符」成对给出，长度不一致会在加载期报错 */
function pairTable(names: string, chars: string): [string, string][] {
  const nameList = names.split(',')
  const charList = chars.split(',')
  if (nameList.length !== charList.length) {
    throw new Error(`实体表名字数 ${nameList.length} 与字符数 ${charList.length} 不一致`)
  }
  return nameList.map((name, index) => [name, charList[index] as string] as [string, string])
}

const ACCENTED_NAMES =
  'Agrave,Aacute,Acirc,Atilde,Auml,Aring,AElig,Ccedil,Egrave,Eacute,Ecirc,Euml,Igrave,Iacute,Icirc,Iuml,ETH,Ntilde,Ograve,Oacute,Ocirc,Otilde,Ouml,Oslash,Ugrave,Uacute,Ucirc,Uuml,Yacute,THORN,szlig,agrave,aacute,acirc,atilde,auml,aring,aelig,ccedil,egrave,eacute,ecirc,euml,igrave,iacute,icirc,iuml,eth,ntilde,ograve,oacute,ocirc,otilde,ouml,oslash,ugrave,uacute,ucirc,uuml,yacute,thorn,yuml'
const ACCENTED_CHARS =
  'À,Á,Â,Ã,Ä,Å,Æ,Ç,È,É,Ê,Ë,Ì,Í,Î,Ï,Ð,Ñ,Ò,Ó,Ô,Õ,Ö,Ø,Ù,Ú,Û,Ü,Ý,Þ,ß,à,á,â,ã,ä,å,æ,ç,è,é,ê,ë,ì,í,î,ï,ð,ñ,ò,ó,ô,õ,ö,ø,ù,ú,û,ü,ý,þ,ÿ'

const GREEK_NAMES =
  'alpha,beta,gamma,delta,epsilon,zeta,eta,theta,iota,kappa,lambda,mu,nu,xi,omicron,pi,rho,sigma,tau,upsilon,phi,chi,psi,omega'
const GREEK_CHARS = 'α,β,γ,δ,ε,ζ,η,θ,ι,κ,λ,μ,ν,ξ,ο,π,ρ,σ,τ,υ,φ,χ,ψ,ω'

/** 零散符号：直接写成字面量，可读性优先 */
const SYMBOLS: [string, string][] = [
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', '\u00a0'],
  ['iexcl', '¡'],
  ['cent', '¢'],
  ['pound', '£'],
  ['curren', '¤'],
  ['yen', '¥'],
  ['brvbar', '¦'],
  ['sect', '§'],
  ['uml', '¨'],
  ['copy', '©'],
  ['ordf', 'ª'],
  ['laquo', '«'],
  ['not', '¬'],
  ['shy', '\u00ad'],
  ['reg', '®'],
  ['macr', '¯'],
  ['deg', '°'],
  ['plusmn', '±'],
  ['sup2', '²'],
  ['sup3', '³'],
  ['acute', '´'],
  ['micro', 'µ'],
  ['para', '¶'],
  ['middot', '·'],
  ['cedil', '¸'],
  ['sup1', '¹'],
  ['ordm', 'º'],
  ['raquo', '»'],
  ['frac14', '¼'],
  ['frac12', '½'],
  ['frac34', '¾'],
  ['iquest', '¿'],
  ['times', '×'],
  ['divide', '÷'],
  ['fnof', 'ƒ'],
  ['bull', '•'],
  ['hellip', '…'],
  ['prime', '′'],
  ['Prime', '″'],
  ['ndash', '–'],
  ['mdash', '—'],
  ['lsquo', '‘'],
  ['rsquo', '’'],
  ['sbquo', '‚'],
  ['ldquo', '“'],
  ['rdquo', '”'],
  ['dagger', '†'],
  ['permil', '‰'],
  ['ldquor', '„'],
  ['trade', '™'],
  ['harrw', '↔'],
  ['larr', '←'],
  ['uarr', '↑'],
  ['rarr', '→'],
  ['darr', '↓'],
  ['harr', '↔'],
  ['euro', '€'],
  ['alefsym', 'ℵ'],
  ['ne', '≠'],
  ['equiv', '≡'],
  ['le', '≤'],
  ['ge', '≥'],
  ['sub', '⊂'],
  ['sup', '⊃'],
  ['infin', '∞'],
  ['radic', '√'],
  ['sum', '∑'],
  ['prod', '∏'],
  ['part', '∂'],
  ['isin', '∈'],
  ['notin', '∉'],
  ['perp', '⊥'],
  ['Delta', 'Δ'],
  ['Omega', 'Ω'],
  ['Mu', 'Μ'],
  ['Sigma', 'Σ']
]

export const NAMED_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
  ...Object.fromEntries(pairTable(ACCENTED_NAMES, ACCENTED_CHARS)),
  ...Object.fromEntries(pairTable(GREEK_NAMES, GREEK_CHARS)),
  ...Object.fromEntries(SYMBOLS)
})

/** 文本上下文转 `& < >`，属性上下文额外转 `"` `'` */
export function escapeHtml(text: string, mode: EntityMode = 'text'): string {
  const table = mode === 'attribute' ? { ...TEXT_ESCAPES, ...QUOTE_ESCAPES } : TEXT_ESCAPES
  return text.replace(/[&<>"']/g, (ch) => table[ch] ?? ch)
}

/** 把非 ASCII 字符转成十六进制数字引用，供只能承载 ASCII 的通道使用（邮件源码、模板注入等） */
export function encodeNonAscii(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    out += code > 0x7f ? `&#x${code.toString(16)};` : ch
  }
  return out
}

/** 结构字符转命名实体 + 其余非 ASCII 转数字引用，中文与 emoji 也会被转义 */
export function encodeEntities(text: string, mode: EntityMode = 'text'): string {
  return encodeNonAscii(escapeHtml(text, mode))
}

export interface DecodeResult {
  text: string
  /** 无法识别的引用，原样保留在结果里，供页面列出 */
  unknown: string[]
  /** 数字引用越界 / 被规范替换为 U+FFFD 的说明 */
  warnings: string[]
  /** 成功替换的引用个数 */
  count: number
}

function refToChar(value: number, raw: string, warnings: string[]): string {
  if (value === 0 || (value >= 0xd800 && value <= 0xdfff) || value > 0x10ffff) {
    const reason =
      value === 0
        ? '是空字符'
        : value > 0x10ffff
          ? '超出 U+10FFFF'
          : '落在 UTF-16 代理区'
    warnings.push(`${raw} ${reason}，按规范替换为 U+FFFD`)
    return '\ufffd'
  }
  return String.fromCodePoint(value)
}

/** 分号必须一起吃掉，否则替换后会在文本里留下孤立的 `;` */
const REF_RE = /&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);?/g

/** 解码：数字引用（含越界替换）+ 命名引用（带分号；amp/lt/gt/quot/apos/nbsp 允许无分号） */
export function decodeHtml(input: string): DecodeResult {
  const unknown = new Set<string>()
  const warnings: string[] = []
  let count = 0

  const text = input.replace(REF_RE, (match, body: string) => {
    const hasSemicolon = match.endsWith(';')
    const raw = match

    if (body.startsWith('#')) {
      const hex = body[1] === 'x' || body[1] === 'X'
      const value = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10)
      if (!Number.isFinite(value)) return match
      count += 1
      return refToChar(value, raw, warnings)
    }

    if (hasSemicolon && Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)) {
      count += 1
      return NAMED_ENTITIES[body] as string
    }

    if (!hasSemicolon) {
      // 无分号：按规范的「最长历史前缀」匹配，前缀之后的字符留在原地继续当普通文本
      const hit = LEGACY_KEYS.find((key) => body.startsWith(key))
      if (hit) {
        count += 1
        return `${LEGACY_NAMES[hit]}${body.slice(hit.length)}`
      }
    }

    unknown.add(raw)
    return match
  })

  return { text, unknown: [...unknown], warnings, count }
}

/** 粗判是否已含实体，用于「看起来已经编码过了」的提示（不是严格校验） */
export function looksEncoded(text: string): boolean {
  return /&(?:#[xX][0-9a-fA-F]{1,8};?|#[0-9]{1,7};?|[a-zA-Z][a-zA-Z0-9]{1,31};?)/.test(text)
}

/** 页面用来展示「本段里有多少个待转字符」 */
export function countStructural(text: string): number {
  return (text.match(/[&<>"']/g) ?? []).length
}

export function countNonAscii(text: string): number {
  let n = 0
  for (const ch of text) if ((ch.codePointAt(0) ?? 0) > 0x7f) n += 1
  return n
}

/** 常用示例，供页面一键填入 */
export const ENTITY_SAMPLES: { label: string; value: string }[] = [
  { label: '脚本片段', value: '<script>alert("xss")</script>' },
  { label: '带引号属性', value: '<a href="/a?x=1&y=2" title="它\'来了">链接</a>' },
  { label: '中英混排', value: '价格：￥100 & 折扣 50% < 原价 © 2026' },
  { label: '已编码文本', value: '&lt;p&gt;&amp;nbsp;&nbsp;caf&eacute;&nbsp;&copy;&nbsp;&#10034; 1&nbsp;&amp; 2' }
]
