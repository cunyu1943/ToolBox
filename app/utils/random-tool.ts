/**
 * 随机数/抽签生成纯函数：全部接受可注入 rng（默认 Math.random）便于测试。
 */

export type Rng = () => number

/** [min, max] 闭区间随机整数 */
export function randInt(min: number, max: number, rng: Rng = Math.random): number {
  if (min > max) [min, max] = [max, min]
  return Math.floor(rng() * (max - min + 1)) + min
}

/** 从 items 中不重复抽取 count 个（Fisher-Yates 部分洗牌） */
export function pickUnique<T>(items: readonly T[], count: number, rng: Rng = Math.random): T[] {
  const n = Math.min(count, items.length)
  const pool = [...items]
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}

/** 掷 count 个 sides 面骰子 */
export function rollDice(count: number, sides = 6, rng: Rng = Math.random): number[] {
  return Array.from({ length: Math.max(0, count) }, () => randInt(1, sides, rng))
}

/** 抛 count 次硬币，'正'/'反' */
export function flipCoins(count: number, rng: Rng = Math.random): string[] {
  return Array.from({ length: Math.max(0, count) }, () => (rng() < 0.5 ? '正' : '反'))
}

/** 生成 count 个位于 [min, max] 的不重复整数 */
export function uniqueInts(min: number, max: number, count: number, rng: Rng = Math.random): number[] {
  const lo = Math.min(min, max), hi = Math.max(min, max)
  const span = hi - lo + 1
  if (count > span) throw new Error(`请求 ${count} 个数超出区间容量 ${span}`)
  const pool = Array.from({ length: span }, (_, i) => i + lo)
  return pickUnique(pool, count, rng)
}
