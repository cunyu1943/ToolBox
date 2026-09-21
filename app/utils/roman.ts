/**
 * 罗马数字 ⇄ 阿拉伯数字（1 ~ 3999，标准减记法）。
 */

const SYMBOLS: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
]

/** 阿拉伯数字 → 罗马数字。超出 1~3999 抛错。 */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) {
    throw new RangeError('罗马数字仅支持 1 ~ 3999 的整数')
  }
  let out = ''
  let rest = n
  for (const [v, s] of SYMBOLS) {
    while (rest >= v) {
      out += s
      rest -= v
    }
  }
  return out
}

/** 罗马数字 → 阿拉伯数字。接受小写；拒绝非规范写法（如 IIII、IL）。 */
export function fromRoman(s: string): number {
  const str = s.trim().toUpperCase()
  if (!str || !/^[MDCLXVI]+$/.test(str)) {
    throw new Error('非法罗马数字')
  }
  let total = 0
  let i = 0
  outer: for (const [v, sym] of SYMBOLS) {
    while (str.startsWith(sym, i)) {
      total += v
      i += sym.length
    }
    if (i === str.length) break outer
  }
  if (i !== str.length) throw new Error('非法罗马数字')
  // 往返校验排除非规范形式（IIII 会被解析失败，因为贪心后剩 I 无法成组）
  if (toRoman(total) !== str) throw new Error('非规范写法')
  return total
}
