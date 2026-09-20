/**
 * IPv4 地址进制转换纯函数：点分十进制 ⇄ 32 位整数 ⇄ 十六进制 ⇄ 二进制。
 */

/** 是否为合法点分 IPv4（四段 0-255） */
export function isValidIpv4(ip: string): boolean {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255)
}

/** 点分 IPv4 → 无符号 32 位整数；非法抛错 */
export function ipv4ToInt(ip: string): number {
  if (!isValidIpv4(ip)) throw new Error('非法的 IPv4 地址')
  const [a, b, c, d] = ip.trim().split('.').map(Number)
  return (((a! << 24) | (b! << 16) | (c! << 8) | d!) >>> 0)
}

/** 32 位无符号整数 → 点分 IPv4；越界抛错 */
export function intToIpv4(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) throw new Error('整数需落在 0 ~ 4294967295')
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

/** 点分 IPv4 → 0x 十六进制（8 位） */
export function ipv4ToHex(ip: string): string {
  return '0x' + ipv4ToInt(ip).toString(16).padStart(8, '0')
}

/** 点分 IPv4 → 每段 8 位二进制、以点分隔 */
export function ipv4ToBinary(ip: string): string {
  if (!isValidIpv4(ip)) throw new Error('非法的 IPv4 地址')
  return ip
    .trim()
    .split('.')
    .map((p) => Number(p).toString(2).padStart(8, '0'))
    .join('.')
}
