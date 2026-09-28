/** 对比度专页的纯计算部分：复用颜色内核做 WCAG 判定，并给出「最小改动达标」的建议色。 */

import {
  contrastRatio,
  mix,
  parseColor,
  rgbToHex,
  wcagChecks,
  type Color,
  type Rgb
} from '../color/index.ts'

const WHITE: Rgb = { r: 255, g: 255, b: 255 }
const BLACK: Rgb = { r: 0, g: 0, b: 0 }

/** 正文 AA：这一条达标，普通字号文字就算满足 WCAG 2.1 */
export const BODY_AA_THRESHOLD = 4.5

export interface ContrastRow {
  key: string
  label: string
  /** WCAG 要求的最小比值 */
  threshold: number
  pass: boolean
  hint: string
}

export interface ContrastSuggestion {
  hex: string
  ratio: number
  /** 建议色相对原色的调整方向 */
  direction: 'lighten' | 'darken'
  /** false 表示两个方向都到不了阈值，此时 hex 是能达到的最高对比度 */
  reached: boolean
  /** 相对原色的改动幅度 0–1，越小越接近原色 */
  moved: number
}

export interface ContrastResult {
  ratio: number
  rows: ContrastRow[]
  /** 参与计算的前景：带透明度时已按 alpha 合成到背景上 */
  composited: Rgb
  /** 任一侧带透明度 */
  hasAlpha: boolean
  suggestion: ContrastSuggestion | null
}

export type ContrastEval =
  | { ok: true; result: ContrastResult }
  | { ok: false; field: 'fg' | 'bg'; error: string }

/** sRGB 通道直接按 alpha 合成到不透明背景上，与浏览器渲染一致 */
export function compositeOver(fg: Color, bg: Rgb): Rgb {
  if (fg.alpha >= 1) return { r: fg.r, g: fg.g, b: fg.b }
  const a = fg.alpha
  const blend = (source: number, back: number): number => Math.round(source * a + back * (1 - a))
  return { r: blend(fg.r, bg.r), g: blend(fg.g, bg.g), b: blend(fg.b, bg.b) }
}

const STEPS = 40

/** 沿一个方向逐步插值：返回最早达标的那一步；不到阈值则返回途中对比度最高的一步 */
function scanDirection(
  fg: Rgb,
  bg: Rgb,
  target: Rgb,
  threshold: number,
  direction: ContrastSuggestion['direction']
): ContrastSuggestion {
  let best: ContrastSuggestion | null = null
  for (let i = 1; i <= STEPS; i++) {
    const moved = i / STEPS
    const rgb = mix(fg, target, moved)
    const ratio = contrastRatio(rgb, bg)
    const step: ContrastSuggestion = {
      hex: `#${rgbToHex({ ...rgb, alpha: 1 })}`,
      ratio,
      direction,
      moved,
      reached: ratio >= threshold
    }
    if (step.reached) return step
    if (!best || ratio > best.ratio) best = step
  }
  return best!
}

/**
 * 把前景向白或黑插值，找改动最小、能把对比度抬到 threshold 的颜色。
 * 两个方向都到不了阈值时返回对比度更高的那个，reached 为 false。
 */
export function suggestReadable(fg: Rgb, bg: Rgb, threshold: number): ContrastSuggestion | null {
  if (contrastRatio(fg, bg) >= threshold) return null

  const light = scanDirection(fg, bg, WHITE, threshold, 'lighten')
  const dark = scanDirection(fg, bg, BLACK, threshold, 'darken')
  // 只有一侧可达标时必须选那一侧：未达标侧的 moved 是最优中间步，拿来比大小会挑错
  if (light.reached && dark.reached) return light.moved <= dark.moved ? light : dark
  if (light.reached) return light
  if (dark.reached) return dark
  return light.ratio >= dark.ratio ? light : dark
}

function buildRows(ratio: number): ContrastRow[] {
  const checks = wcagChecks(ratio)
  return [
    { key: 'body-aa', label: '正文 AA', threshold: 4.5, pass: checks.aaNormal, hint: '普通字号正文的上线要求' },
    { key: 'body-aaa', label: '正文 AAA', threshold: 7, pass: checks.aaaNormal, hint: '最严格档，长时间阅读更省力' },
    { key: 'large-aa', label: '大字 AA', threshold: 3, pass: checks.aaLarge, hint: '≥ 24 px，或 ≥ 18.66 px 粗体' },
    { key: 'large-aaa', label: '大字 AAA', threshold: 4.5, pass: checks.aaaLarge, hint: '同上字号，要求升到 AAA 档' },
    { key: 'ui-aa', label: '非文本 AA', threshold: 3, pass: ratio >= 3, hint: '图标、输入框边框、图形元素' }
  ]
}

export function evaluateContrast(fgText: string, bgText: string): ContrastEval {
  const fg = parseColor(fgText)
  if (!fg.ok) return { ok: false, field: 'fg', error: fg.error }
  const bg = parseColor(bgText)
  if (!bg.ok) return { ok: false, field: 'bg', error: bg.error }

  const composited = compositeOver(fg.color, bg.color)
  const ratio = contrastRatio(composited, bg.color)

  return {
    ok: true,
    result: {
      ratio,
      rows: buildRows(ratio),
      composited,
      hasAlpha: fg.color.alpha < 1 || bg.color.alpha < 1,
      suggestion:
        ratio >= BODY_AA_THRESHOLD
          ? null
          : suggestReadable(composited, bg.color, BODY_AA_THRESHOLD)
    }
  }
}

/** 比值配色：正文 AA 达标记绿，只有大字 / 非文本达标记黄 */
export function contrastTone(ratio: number): 'success' | 'warning' | 'error' {
  if (ratio >= BODY_AA_THRESHOLD) return 'success'
  if (ratio >= 3) return 'warning'
  return 'error'
}
