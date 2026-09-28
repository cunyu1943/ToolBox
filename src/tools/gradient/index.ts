/**
 * CSS 渐变生成内核（纯函数，不碰 DOM）。
 *
 * 与旧站同款工具的差别：旧实现从不校验颜色值，能拼出 `linear-gradient(90deg, )` 这种直接失效
 * 的字符串。这里对齐色标数量、位置递增、颜色格式都做检查，并支持把已有渐变 **反向解析**
 * 回可编辑结构（含 `repeating-` / 角度单位 / 取样色板）。
 */

import { mix, parseColor, rgbToHex } from '../color/index.ts'

export type GradientKind = 'linear' | 'radial' | 'conic'

export interface Stop {
  color: string
  /** 百分比位置；null 表示交给浏览器均匀分布 */
  pos: number | null
}

export interface GradientSpec {
  kind: GradientKind
  repeating: boolean
  /** linear / conic 的角度，单位 deg */
  angle: number
  /** linear 专用：`to top right` 这类关键字，非空时优先于 angle */
  direction: string
  shape: 'circle' | 'ellipse'
  /** radial 的尺寸：4 个关键字之一，或具体长度 */
  size: string
  /** radial / conic 的中心位置 */
  center: string
  stops: Stop[]
}

export const RADIAL_SIZES = ['closest-side', 'closest-corner', 'farthest-side', 'farthest-corner']
export const DIRECTIONS = ['to top', 'to right', 'to bottom', 'to left', 'to top right', 'to top left', 'to bottom right', 'to bottom left']

export const GRADIENT_DEFAULTS: GradientSpec = {
  kind: 'linear',
  repeating: false,
  angle: 90,
  direction: '',
  shape: 'ellipse',
  size: 'farthest-corner',
  center: 'center',
  stops: [
    { color: '#42b883', pos: 0 },
    { color: '#35495e', pos: 100 }
  ]
}

const round = (value: number): number => Math.round(value * 100) / 100
const normalizeAngle = (angle: number): number => ((angle % 360) + 360) % 360
const POSITION_RE = /\s+(-?[\d.]+)(%|px|em|rem|vw|vh)?$/

/** 剥掉尾部位置，剩下的部分应当能当颜色解释 */
function colorPart(text: string): string {
  return text.trim().replace(POSITION_RE, '').trim()
}

/* ----------------------------- 颜色校验 ----------------------------- */

export interface ColorCheck {
  ok: boolean
  /** 浏览器能解释、但内核算不出中间色的写法：命名色、hwb、lab、oklch、CSS 变量等 */
  opaque: boolean
  error?: string
}

const FUNCTIONAL_RE = /^(hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|image|filter)\(/i

/**
 * CSS 关键字颜色名。只用来判断「是不是个颜色名」，不参与混色（内核算不出命名色的 RGB），
 * 所以只存名字、不存值。少了这一步，`turn 0.5` 里的 `turn`、拼错的 `zzz` 都会被当成合法颜色。
 */
const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood
   cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan currentcolor darkblue darkcyan
   darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred
   darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue
   dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray
   green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon
   lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon
   lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta
   maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
   mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab
   orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
   powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna
   silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato transparent
   turquoise violet wheat white whitesmoke yellow yellowgreen`
    .split(/\s+/)
    .filter(Boolean)
)

export function checkColor(input: string): ColorCheck {
  const text = input.trim()
  const bad = (detail: string): ColorCheck => ({
    ok: false,
    opaque: false,
    error: `「${text}」不是可用的颜色：${detail}`
  })
  if (!text) return { ok: false, opaque: false, error: '颜色为空' }
  if (parseColor(text).ok) return { ok: true, opaque: false }
  if (/^[a-zA-Z]+$/.test(text)) {
    return NAMED_COLORS.has(text.toLowerCase())
      ? { ok: true, opaque: true }
      : bad('CSS 没有这个名字，检查是否拼错')
  }
  if ((FUNCTIONAL_RE.test(text) || text.startsWith('var(')) && text.endsWith(')')) return { ok: true, opaque: true }
  return bad('请用 hex、rgb()、hsl()、CSS 命名色或函数式写法')
}

/** 未指定位置的色标按均匀分布展开，页面画色标条也用它 */
export function resolvedStops(stops: Stop[]): Stop[] {
  const last = stops.length - 1
  return stops.map((stop, index) => ({
    color: stop.color,
    pos: stop.pos ?? (last <= 0 ? 0 : round((index / last) * 100))
  }))
}

function stopText(stop: Stop): string {
  return `${stop.color.trim()} ${stop.pos as number}%`
}

/* ----------------------------- 生成 CSS ----------------------------- */

export interface GradientOutput {
  ok: boolean
  /** 渐变函数本体 */
  body: string
  /** `background-image: …` */
  css: string
  /** 先铺纯色再叠渐变：不支持渐变的老浏览器至少有个底色 */
  fallback: string
  stops: Stop[]
  notes: string[]
  warnings: string[]
  error?: string
}

export function buildGradient(spec: Partial<GradientSpec> = {}): GradientOutput {
  const merged: GradientSpec = {
    ...GRADIENT_DEFAULTS,
    ...spec,
    stops: (spec.stops ?? GRADIENT_DEFAULTS.stops).map((stop) => ({ ...stop }))
  }
  const notes: string[] = []
  const warnings: string[] = []
  const invalid: GradientOutput = { ok: false, body: '', css: '', fallback: '', stops: merged.stops, notes, warnings }

  const stops = merged.stops.filter((stop) => stop.color.trim())
  if (stops.length !== merged.stops.length) warnings.push(`${merged.stops.length - stops.length} 个空色标已忽略`)
  if (stops.length < 2) return { ...invalid, error: '至少需要 2 个颜色才能形成渐变' }

  const bad: string[] = []
  let opaque = 0
  for (const stop of stops) {
    const check = checkColor(stop.color)
    if (!check.ok) bad.push(check.error as string)
    else if (check.opaque) opaque += 1
  }
  if (bad.length) return { ...invalid, error: bad.join('；') }
  if (opaque) notes.push(`${opaque} 个色标用了命名色或函数式写法：浏览器能渲染，但「取样色板」算不出中间色`)

  if (stops.some((stop) => stop.pos === null)) notes.push('未指定位置的色标已按均匀分布补成明确百分比')
  const list = resolvedStops(stops)
  for (let i = 1; i < list.length; i += 1) {
    if ((list[i] as Stop).pos! < (list[i - 1] as Stop).pos!) {
      return {
        ...invalid,
        stops: list,
        error: `第 ${i + 1} 个色标的位置 ${list[i]?.pos}% 比前一个 ${list[i - 1]?.pos}% 更小：CSS 要求位置递增，否则整条声明失效`
      }
    }
  }
  if (new Set(list.map((stop) => stop.color.trim().toLowerCase())).size === 1) warnings.push('所有色标颜色相同，看起来会是一片纯色')
  if (list.length === 2 && list[0]?.pos === 0 && list[1]?.pos === 100) notes.push('两个色标 + 首尾位置 = 最简单的两段渐变')

  const inner = list.map(stopText).join(', ')
  const prefix = merged.repeating ? 'repeating-' : ''
  let head = ''

  if (merged.kind === 'linear') {
    const direction = merged.direction.trim()
    if (direction && !DIRECTIONS.includes(direction)) {
      return { ...invalid, stops: list, error: `方向关键字「${direction}」无效，可选：${DIRECTIONS.join(' / ')}` }
    }
    if (direction) notes.push('用了方向关键字，角度设置被忽略')
    else if (merged.angle < 0 || merged.angle >= 360) notes.push('角度已归一化到 0–360 deg')
    head = `${direction || `${round(normalizeAngle(merged.angle))}deg`}, ${inner}`
  } else if (merged.kind === 'radial') {
    const size = merged.size.trim() || 'farthest-corner'
    const keyword = RADIAL_SIZES.includes(size)
    if (!keyword && !/^[\d.]+(%|[a-z]{2,4})?(\s+[\d.]+(%|[a-z]{2,4})?)?$/.test(size)) {
      return { ...invalid, stops: list, error: `尺寸写法「${size}」不认识，可用 ${RADIAL_SIZES.join(' / ')} 或具体长度（如 80px、50% 30%）` }
    }
    if (!keyword) notes.push('尺寸用了具体长度，请确认和形状搭配合法（ellipse 需要两个长度）')
    const center = merged.center.trim() || 'center'
    const descriptor = [merged.shape, size, center === 'center' ? '' : `at ${center}`].filter(Boolean).join(' ')
    head = `${descriptor}, ${inner}`
  } else {
    const angle = round(normalizeAngle(merged.angle))
    const center = merged.center.trim() || 'center'
    const descriptor = [angle ? `from ${angle}deg` : '', center === 'center' ? '' : `at ${center}`]
      .filter(Boolean)
      .join(' ')
    head = [descriptor, inner].filter(Boolean).join(', ')
  }

  const body = `${prefix}${merged.kind}-gradient(${head})`
  return {
    ok: true,
    body,
    css: `background-image: ${body};`,
    fallback: `background-color: ${list[0]?.color.trim()};\nbackground-image: ${body};`,
    stops: list,
    notes,
    warnings
  }
}

/* ----------------------------- 反向解析 ----------------------------- */

export type ParseGradientResult =
  | { ok: true; spec: GradientSpec; notes: string[]; warnings: string[] }
  | { ok: false; error: string; notes: string[]; warnings: string[] }

/** 只在顶层逗号处切分，`rgba(0,0,0,.5)` 里的逗号不算 */
function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth += 1
    else if (ch === ')' || ch === ']') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function toStop(text: string): Stop {
  const raw = text.trim()
  const match = POSITION_RE.exec(raw)
  const color = colorPart(raw)
  if (!match) return { color, pos: null }
  const value = Number.parseFloat(match[1] as string)
  if (match[2] && match[2] !== '%') return { color, pos: null }
  return { color, pos: Number.isFinite(value) ? value : null }
}

const toUnit = (value: number, unit: string): number => {
  const lower = unit.toLowerCase()
  if (lower === 'turn') return value * 360
  if (lower === 'rad') return (value * 180) / Math.PI
  if (lower === 'grad') return value * 0.9
  return value
}

/** 接受 `linear-gradient(…)`、带 `background:` 前缀、`-webkit-` / `repeating-` 前缀的写法 */
export function parseGradient(source: string): ParseGradientResult {
  const notes: string[] = []
  const warnings: string[] = []
  const fail = (error: string): ParseGradientResult => ({ ok: false, error, notes, warnings })

  const text = source.trim().replace(/^background(?:-image)?\s*:\s*/i, '').replace(/;+\s*$/, '').trim()
  if (!text) return fail('输入为空')
  const match = /((?:-webkit-|repeating-|)\s*(linear|radial|conic)-gradient)\(([\s\S]*)\)\s*$/.exec(text)
  if (!match) return fail('没找到 linear-gradient() / radial-gradient() / conic-gradient()')

  const head = (match[1] as string).replace(/\s+/g, '')
  const spec: GradientSpec = { ...GRADIENT_DEFAULTS, kind: match[2] as GradientKind, repeating: head.includes('repeating-'), stops: [] }
  if (head.includes('-webkit-')) notes.push('-webkit- 前缀已去掉（Chrome 60+/Safari 12.1+ 支持标准写法）')
  if (spec.repeating) notes.push('识别为 repeating- 重复渐变')

  const args = splitTopLevel(match[3] as string)
  let split = 0
  while (split < args.length && !checkColor(colorPart(args[split] as string)).ok) split += 1

  const config = args.slice(0, split)
  const stopTexts = args.slice(split)
  if (stopTexts.length < 2) return fail(`只解析到 ${stopTexts.length} 个颜色，至少需要 2 个`)

  for (const raw of config) {
    let piece = raw.trim()
    const at = /\bat\s+([\s\S]+)$/i.exec(piece)
    if (at) {
      spec.center = (at[1] as string).trim()
      piece = piece.slice(0, at.index).trim()
    }
    const angle = /^(-?[\d.]+)(deg|turn|rad|grad)$/i.exec(piece)
    if (angle) {
      spec.angle = normalizeAngle(toUnit(Number.parseFloat(angle[1] as string), angle[2] as string))
      if ((angle[2] as string).toLowerCase() !== 'deg') notes.push(`角度单位 ${angle[2]} 已换算成 deg`)
      continue
    }
    const reversed = /^(deg|turn|rad|grad)[ \t]+(-?[\d.]+)$/i.exec(piece)
    if (reversed) return fail(`角度要写成「数字 + 单位」：${piece} → ${reversed[2]}${reversed[1]}`)
    const from = /^from\s+(-?[\d.]+)(deg|turn|rad|grad)?$/i.exec(piece)
    if (from) {
      spec.angle = normalizeAngle(toUnit(Number.parseFloat(from[1] as string), (from[2] ?? 'deg') as string))
      continue
    }
    if (/^to\s/i.test(piece)) {
      spec.direction = piece.replace(/\s+/g, ' ').trim().toLowerCase()
      if (!DIRECTIONS.includes(spec.direction)) warnings.push(`方向「${spec.direction}」不在常用写法里，已原样保留`)
      continue
    }
    const shape = /^(circle|ellipse)\b/i.exec(piece)
    if (shape) {
      spec.shape = (shape[1] as string).toLowerCase() as 'circle' | 'ellipse'
      const rest = piece.slice(shape[0].length).trim()
      const keyword = new RegExp(`(?:${RADIAL_SIZES.join('|')})`, 'i').exec(rest)
      if (keyword) spec.size = keyword[0].toLowerCase()
      else if (rest) {
        spec.size = rest
        warnings.push(`尺寸「${rest}」不是关键字写法，已原样保留`)
      }
      continue
    }
    if (!piece) continue
    warnings.push(`忽略不认识的参数「${raw}」`)
  }

  if (spec.shape === 'circle' && spec.kind !== 'radial') spec.shape = 'ellipse'
  spec.stops = stopTexts.map(toStop)
  if (spec.kind === 'linear' && spec.direction) notes.push('方向关键字优先于角度')
  return { ok: true, spec, notes, warnings }
}

/* ----------------------------- 取样色板 ----------------------------- */

export interface Sampled {
  hex: string
  pos: number
}

export type SampleResult = { ok: true; samples: Sampled[]; notes: string[] } | { ok: false; error: string }

/** 在渐变曲线上等距取样，把渐变变成一组可用的色板 */
export function sampleGradient(stops: Stop[], count: number): SampleResult {
  const clean = stops.filter((stop) => stop.color.trim())
  if (clean.length < 2) return { ok: false, error: '至少需要 2 个颜色才能取样' }
  if (count < 2) return { ok: false, error: '取样数量至少 2 个' }
  if (count > 32) return { ok: false, error: '取样数量最多 32 个' }

  const parsed = clean.map((stop) => ({ stop, result: parseColor(stop.color) }))
  const bad = parsed.find((item) => !item.result.ok)
  if (bad) return { ok: false, error: `色标「${bad.stop.color}」算不出 RGB（命名色、hwb、oklch 等不支持），取样请改用 hex / rgb() / hsl()` }

  const list = resolvedStops(clean)
  const samples: Sampled[] = []
  for (let i = 0; i < count; i += 1) {
    const pos = round((i / (count - 1)) * 100)
    let segment = 0
    for (let s = 0; s < list.length - 1; s += 1) {
      if (pos >= (list[s] as Stop).pos! && pos <= (list[s + 1] as Stop).pos!) segment = s
    }
    const from = list[segment] as Stop
    const to = list[segment + 1] as Stop
    const span = (to.pos as number) - (from.pos as number)
    const ratio = span <= 0 ? 0 : (pos - (from.pos as number)) / span
    const left = (parsed[segment] as { result: { ok: true; color: { r: number; g: number; b: number } } }).result.color
    const right = (parsed[segment + 1] as { result: { ok: true; color: { r: number; g: number; b: number } } }).result.color
    const blended = mix(left, right, ratio)
    samples.push({ hex: `#${rgbToHex({ ...blended, alpha: 1 }, { alpha: false })}`, pos })
  }

  const notes: string[] = []
  if (list.some((stop) => (stop.pos as number) > 100)) notes.push('有色标位置超过 100%，取样只覆盖 0–100% 的可见区间')
  if (parsed.some((item) => item.result.ok && (item.result as { color: { alpha: number } }).color.alpha < 1)) {
    notes.push('带透明度的色标按不透明取样（hex 结果不含 alpha）')
  }
  return { ok: true, samples, notes }
}

/* ----------------------------- 随机渐变 ----------------------------- */

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 同一个 seed 永远得到同一组颜色，方便复现截图里的配色 */
export function randomStops(count: number, seed: number): Stop[] {
  const rand = mulberry(seed)
  const total = Math.min(Math.max(Math.trunc(count) || 2, 2), 8)
  const hue = Math.floor(rand() * 360)
  const scheme = ['类似色', '互补色', '三角色'][Math.floor(rand() * 3)] as string
  return Array.from({ length: total }, (_, index) => {
    const step = total === 1 ? 0 : index / (total - 1)
    const offset = scheme === '互补色' ? (index % 2 ? 180 : 0) : scheme === '三角色' ? (index % 3) * 120 : index % 2 ? 30 : 0
    return {
      color: `hsl(${Math.round((hue + offset + step * 40) % 360)}, ${Math.round(62 + rand() * 26)}%, ${Math.round(38 + step * 34)}%)`,
      pos: round(step * 100)
    }
  })
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000)
}

export const GRADIENT_SAMPLES: { label: string; value: Partial<GradientSpec> }[] = [
  {
    label: '品牌色对角线性',
    value: {
      kind: 'linear',
      angle: 135,
      stops: [
        { color: '#42b883', pos: 0 },
        { color: '#35495e', pos: 100 }
      ]
    }
  },
  {
    label: '柔光径向（含透明）',
    value: {
      kind: 'radial',
      shape: 'circle',
      size: 'closest-side',
      center: '30% 30%',
      stops: [
        { color: '#ffffff', pos: 0 },
        { color: 'rgba(255,255,255,0)', pos: 60 },
        { color: '#42b883', pos: 100 }
      ]
    }
  },
  {
    label: '锥形色轮',
    value: {
      kind: 'conic',
      angle: 90,
      stops: [
        { color: 'hsl(0,80%,55%)', pos: 0 },
        { color: 'hsl(120,80%,55%)', pos: 33 },
        { color: 'hsl(240,80%,55%)', pos: 66 },
        { color: 'hsl(360,80%,55%)', pos: 100 }
      ]
    }
  },
  {
    label: '硬条纹（重复渐变）',
    value: {
      kind: 'linear',
      repeating: true,
      angle: 45,
      stops: [
        { color: '#35495e', pos: 0 },
        { color: '#35495e', pos: 12 },
        { color: '#42b883', pos: 12 },
        { color: '#42b883', pos: 24 }
      ]
    }
  },
  {
    label: '写坏了的（会被拦下）',
    value: {
      kind: 'linear',
      angle: 90,
      stops: [
        { color: '#42b883', pos: 80 },
        { color: 'not a color', pos: 20 }
      ]
    }
  }
]
