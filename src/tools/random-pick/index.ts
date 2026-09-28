/**
 * 随机数与抽签：区间取数、不重复抽人、掷骰、抛硬币、名单洗牌。
 *
 * 随机源三档，页面可切换并如实标注：
 *   · `crypto` —— `crypto.getRandomValues` 取 32 位无符号整数除以 2³²，密码学级，默认。
 *     用 `floor(u × span)` 而非 `% span`，所以偏差量级是 2⁻³²（对 1–100 取数约 2×10⁻⁸），
 *     比 `Math.floor(Math.random()*n)` 的 53 位精度来源更明确。
 *   · `math` —— `Math.random()`，可复现不了但更快。
 *   · `seed` —— mulberry32 确定性伪随机，同种子同结果，用于「抽签结果可复核」。
 * 所有结果只在内存与 localStorage 里，不上传。
 */

export type Rng = () => number
export type RandomSource = 'crypto' | 'math' | 'seed'

export function cryptoRng(): Rng {
  const buf = new Uint32Array(1)
  return () => {
    globalThis.crypto.getRandomValues(buf)
    return buf[0]! / 4_294_967_296
  }
}

/** mulberry32：32 位状态的确定性伪随机，同种子给出同一序列 */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function makeRng(source: RandomSource, seed: number): Rng {
  if (source === 'crypto') return cryptoRng()
  if (source === 'seed') return seededRng(seed)
  return Math.random
}

/** 字符串 → 32 位种子，便于「同一口令同一结果」 */
export function seedFromText(text: string): number {
  let h = 2166136261
  for (const char of text) {
    h = Math.imul(h ^ char.codePointAt(0)! , 16777619) >>> 0
  }
  return h >>> 0
}

/** 闭区间整数。min > max 时自动交换。 */
export function randInt(min: number, max: number, rng: Rng = Math.random): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return Math.floor(rng() * (hi - lo + 1)) + lo
}

/** 不重复抽取（Fisher-Yates 局部洗牌），count 超过容量时按容量截断 */
export function pickUnique<T>(items: readonly T[], count: number, rng: Rng = Math.random): T[] {
  const pool = [...items]
  const n = Math.max(0, Math.min(count, pool.length))
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(rng() * (pool.length - i))
    const tmp = pool[i]!
    pool[i] = pool[j]!
    pool[j] = tmp
  }
  return pool.slice(0, n)
}

/** 完整洗牌 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  return pickUnique(items, items.length, rng)
}

export function rollDice(count: number, sides: number, rng: Rng = Math.random): number[] {
  const n = Math.max(1, Math.min(20, Math.trunc(count)))
  const s = Math.max(2, Math.min(1000, Math.trunc(sides)))
  return Array.from({ length: n }, () => randInt(1, s, rng))
}

export function flipCoins(count: number, rng: Rng = Math.random): ('正' | '反')[] {
  const n = Math.max(1, Math.min(200, Math.trunc(count)))
  return Array.from({ length: n }, () => (rng() < 0.5 ? '正' : '反'))
}

export type RandomMode = 'int' | 'unique' | 'pick' | 'dice' | 'coin' | 'shuffle'

export interface RandomRequest {
  mode: RandomMode
  min: number
  max: number
  count: number
  /** 名单原文：按换行、逗号、顿号、分号分隔 */
  listText: string
  sides: number
  /** 抽出后是否放回（true = 每次都可能重复） */
  withReplacement: boolean
  rng: Rng
}

export interface RandomResult {
  ok: boolean
  error?: string
  /** 结果项，界面逐条展示 */
  outputs: string[]
  /** 汇总（如骰子点数之和、正反各几次） */
  summary: string
  notes: string[]
}

export const splitList = (text: string): string[] =>
  (text ?? '')
    .split(/[\n,，、;；|]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

export function runRandom(req: RandomRequest): RandomResult {
  const empty: RandomResult = { ok: false, error: '', outputs: [], summary: '', notes: [] }
  const { mode, rng } = req

  if (mode === 'dice') {
    const rolls = rollDice(req.count, req.sides, rng)
    const total = rolls.reduce((sum, value) => sum + value, 0)
    return {
      ok: true,
      outputs: rolls.map((value, index) => `第 ${index + 1} 枚：${value}`),
      summary: `${rolls.length} 枚 ${req.sides} 面骰，合计 ${total} 点，均值 ${(total / rolls.length).toFixed(2)}`,
      notes: []
    }
  }

  if (mode === 'coin') {
    const flips = flipCoins(req.count, rng)
    const heads = flips.filter((face) => face === '正').length
    return {
      ok: true,
      outputs: flips.map((face, index) => `第 ${index + 1} 次：${face}`),
      summary: `正 ${heads} 次 / 反 ${flips.length - heads} 次`,
      notes: []
    }
  }

  const count = Math.trunc(req.count)
  if (!Number.isFinite(count) || count < 1) return { ...empty, error: '个数至少为 1' }

  if (mode === 'int') {
    const lo = Math.trunc(Math.min(req.min, req.max))
    const hi = Math.trunc(Math.max(req.min, req.max))
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { ...empty, error: '区间不是整数' }
    if (hi - lo + 1 > 1_000_000) return { ...empty, error: '区间跨度上限 100 万' }
    const values = Array.from({ length: Math.min(count, 100) }, () => randInt(lo, hi, rng))
    return {
      ok: true,
      outputs: values.map((value) => String(value)),
      summary: `${lo}–${hi} 之间取 ${values.length} 个（可能重复）`,
      notes: count > 100 ? ['一次最多 100 个，多余部分已忽略。'] : []
    }
  }

  const items = splitList(req.listText)
  if ((mode === 'pick' || mode === 'shuffle') && !items.length) {
    return { ...empty, error: '请先填写名单（每行一个，或用逗号分隔）' }
  }

  if (mode === 'shuffle') {
    return {
      ok: true,
      outputs: shuffle(items, rng),
      summary: `${items.length} 人完整洗牌`,
      notes: []
    }
  }

  if (mode === 'unique') {
    const lo = Math.trunc(Math.min(req.min, req.max))
    const hi = Math.trunc(Math.max(req.min, req.max))
    const span = hi - lo + 1
    if (span < 1) return { ...empty, error: '区间无效' }
    if (count > span) return { ...empty, error: `要 ${count} 个不重复的数，但区间 ${lo}–${hi} 只有 ${span} 个` }
    const pool = Array.from({ length: span }, (_, index) => lo + index)
    const picked = pickUnique(pool, count, rng)
    return {
      ok: true,
      outputs: picked.map((value) => String(value)),
      summary: `${lo}–${hi} 中取出 ${picked.length} 个互不相同的数`,
      notes: []
    }
  }

  // mode === 'pick'
  if (req.withReplacement) {
    const picked = Array.from({ length: Math.min(count, items.length * 4) }, () => items[Math.floor(rng() * items.length)]!)
    return {
      ok: true,
      outputs: picked,
      summary: `从 ${items.length} 人中有放回抽 ${picked.length} 次（同一人可能中多次）`,
      notes: ['有放回抽取时结果可能重复，适合「多次独立抽奖」。']
    }
  }
  if (count > items.length) return { ...empty, error: `名单只有 ${items.length} 人，无法不重复抽出 ${count} 人` }
  const picked = pickUnique(items, count, rng)
  return {
    ok: true,
    outputs: picked,
    summary: `从 ${items.length} 人中抽出 ${picked.length} 人（不重复）`,
    notes: []
  }
}

export const RANDOM_MODES: { label: string; value: RandomMode; hint: string }[] = [
  { label: '区间随机数', value: 'int', hint: '在 [min, max] 内取若干个整数，可重复' },
  { label: '不重复取数', value: 'unique', hint: '在区间内取若干个互不相同的整数，如双色球号码' },
  { label: '名单抽签', value: 'pick', hint: '从名单里抽出若干人，可选有放回/无放回' },
  { label: '名单洗牌', value: 'shuffle', hint: '把整份名单随机排序，用于决定出场顺序' },
  { label: '掷骰子', value: 'dice', hint: '1–20 枚、2–1000 面' },
  { label: '抛硬币', value: 'coin', hint: '1–200 次' }
]

/** 演示名单，点一下填好 */
export const RANDOM_DEMO_LIST = ['张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵磊', '黄敏']
