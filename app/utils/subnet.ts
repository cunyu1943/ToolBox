import { isValidIpv4, ipv4ToInt, intToIpv4 } from '~/utils/ip'

/**
 * CIDR 子网计算：输入 IP + 前缀长度（或点分掩码），输出网络地址、
 * 广播地址、掩码、通配符、可用主机区间与数量。
 */

export interface SubnetInfo {
  cidr: string
  ip: string
  prefix: number
  mask: string
  wildcard: string
  network: string
  broadcast: string
  hostMin: string | null
  hostMax: string | null
  /** 可分配主机数：/32 为 1，/31 为 2（RFC 3021），其余 2^(32-p)-2 */
  usableHosts: number
  /** 地址总数 */
  totalAddresses: number
  networkBinary: string
}

export type CidrParseResult =
  | { ok: true; ip: string; prefix: number }
  | { ok: false; error: string }

/** 支持 `192.168.1.5/24`、`192.168.1.5 255.255.255.0`、单独 IP（默认 /24 不猜，报错提示） */
export function parseCidr(input: string): CidrParseResult {
  const s = input.trim().replace(/\s+/g, '/')
  if (!s) return { ok: false, error: '' }
  const parts = s.split('/')
  if (parts.length === 1) {
    return { ok: false, error: '请输入前缀（如 /24）或点分子网掩码（如 255.255.255.0）' }
  }
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, error: '格式应为 IP/前缀，如 192.168.1.5/24' }
  }
  const ip = parts[0]!
  if (!isValidIpv4(ip)) return { ok: false, error: 'IPv4 地址不合法' }
  const suffix = parts[1]!
  let prefix: number
  if (/^\d{1,2}$/.test(suffix)) {
    prefix = Number(suffix)
    if (prefix > 32) return { ok: false, error: '前缀长度需在 0 ~ 32 之间' }
  } else if (isValidIpv4(suffix)) {
    const m = ipv4ToInt(suffix)
    // 掩码必须是连续 1 开头（CIDR 合法掩码）
    const inverted = (~m) >>> 0
    if ((inverted & (inverted + 1)) !== 0) {
      return { ok: false, error: '子网掩码不是连续位，无法转成前缀长度' }
    }
    prefix = 32 - countTrailingOnes(inverted)
  } else {
    return { ok: false, error: '斜杠后需是 0~32 的前缀或点分掩码' }
  }
  return { ok: true, ip, prefix }
}

function countTrailingOnes(n: number): number {
  let c = 0
  while (n & 1) {
    c++
    n >>>= 1
  }
  return c
}

export function subnetInfo(ip: string, prefix: number): SubnetInfo {
  const n = ipv4ToInt(ip)
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const wildcard = (~mask) >>> 0
  const network = (n & mask) >>> 0
  const broadcast = (network | wildcard) >>> 0
  const total = wildcard + 1

  let hostMin: number | null
  let hostMax: number | null
  let usableHosts: number
  if (prefix === 32) {
    hostMin = network
    hostMax = network
    usableHosts = 1
  } else if (prefix === 31) {
    hostMin = network
    hostMax = broadcast
    usableHosts = 2
  } else {
    hostMin = network + 1
    hostMax = broadcast - 1
    usableHosts = total - 2
  }

  return {
    cidr: `${intToIpv4(network)}/${prefix}`,
    ip,
    prefix,
    mask: intToIpv4(mask),
    wildcard: intToIpv4(wildcard),
    network: intToIpv4(network),
    broadcast: intToIpv4(broadcast),
    hostMin: hostMin === null ? null : intToIpv4(hostMin),
    hostMax: hostMax === null ? null : intToIpv4(hostMax),
    usableHosts,
    totalAddresses: total,
    networkBinary: ipv4BinaryPadded(network)
  }
}

function ipv4BinaryPadded(n: number): string {
  return Array.from({ length: 4 }, (_, i) =>
    ((n >>> (24 - i * 8)) & 0xff).toString(2).padStart(8, '0')
  ).join('.')
}
