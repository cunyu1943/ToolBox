/**
 * 随机密码生成纯函数：可注入 rng 以便单元测试。
 */

export interface PasswordOptions {
  length?: number
  lowercase?: boolean
  uppercase?: boolean
  digits?: boolean
  symbols?: boolean
  /** 排除易混淆字符 I l 1 O 0 | ` 等 */
  excludeAmbiguous?: boolean
}

const SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~'
} as const

const AMBIGUOUS = 'Il1O0o|`'

/** 生成密码；未选择任何字符集时抛错 */
export function generatePassword(opts: PasswordOptions = {}, rng: () => number = Math.random): string {
  const length = Math.max(1, Math.floor(opts.length ?? 16))
  const chosen: string[] = []
  if (opts.lowercase ?? true) chosen.push(SETS.lowercase)
  if (opts.uppercase ?? true) chosen.push(SETS.uppercase)
  if (opts.digits ?? true) chosen.push(SETS.digits)
  if (opts.symbols ?? false) chosen.push(SETS.symbols)
  if (chosen.length === 0) throw new Error('至少需要选择一种字符类型')

  const filter = (set: string): string =>
    opts.excludeAmbiguous ? [...set].filter((c) => !AMBIGUOUS.includes(c)).join('') : set
  const pools = chosen.map(filter).filter((s) => s.length > 0)
  if (pools.length === 0) throw new Error('过滤后可用字符为空')
  const all = pools.join('')

  const pick = (set: string): string => set[Math.floor(rng() * set.length) % set.length]

  const chars: string[] = []
  // 保证每种选中的字符集至少出现一次（长度足够时）
  for (const pool of pools) {
    if (chars.length < length) chars.push(pick(pool))
  }
  while (chars.length < length) chars.push(pick(all))

  // Fisher-Yates 洗牌
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join('')
}
