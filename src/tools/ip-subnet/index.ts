export const MIN_PREFIX = 0
export const MAX_PREFIX = 32

const ADDRESS_SPACE = 2 ** 32

export interface Ipv4Parse {
  ok: boolean
  value?: number
  canonical?: string
  error?: string
  warnings: string[]
}

const octetOf = (value: number, shift: number): number => Math.floor(value / 2 ** shift) % 256

export function intToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => octetOf(value, shift)).join('.')
}

/** 严格解析点分十进制：必须 4 段、每段 0–255 且为纯数字 */
export function parseIpv4(text: string): Ipv4Parse {
  const warnings: string[] = []
  const trimmed = (text ?? '').trim()
  if (!trimmed) return { ok: false, error: '请输入 IPv4 地址', warnings }

  const parts = trimmed.split('.')
  if (parts.length !== 4) {
    return { ok: false, error: 'IPv4 需要 4 段点分十进制，例如 192.168.1.0', warnings }
  }
  const numbers: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return { ok: false, error: `「${part}」不是 0–255 的数字段`, warnings }
    }
    const value = Number(part)
    if (value > 255) return { ok: false, error: `「${part}」超过 255`, warnings }
    if (part.length > 1 && part.startsWith('0')) {
      warnings.push(`「${part}」有前导零，部分系统会按八进制解释，这里按十进制 ${value} 处理`)
    }
    numbers.push(value)
  }
  const [a = 0, b = 0, c = 0, d = 0] = numbers
  const value = a * 2 ** 24 + b * 2 ** 16 + c * 2 ** 8 + d
  return { ok: true, value, canonical: numbers.join('.'), warnings }
}

/** 前缀长度 → 子网掩码整数；用 2 的幂而不是 32 位移位，避开 JS 的 32 位有符号截断 */
export function maskOf(prefix: number): number {
  if (prefix <= 0) return 0
  return ADDRESS_SPACE - 2 ** (32 - prefix)
}

export function totalAddressesOf(prefix: number): number {
  return 2 ** (32 - prefix)
}

export function usableHostsOf(prefix: number): number {
  if (prefix === 32) return 1
  if (prefix === 31) return 2
  return totalAddressesOf(prefix) - 2
}

export function prefixOfMask(mask: number): number | null {
  for (let prefix = 0; prefix <= MAX_PREFIX; prefix++) {
    if (maskOf(prefix) === mask) return prefix
  }
  return null
}

export interface TargetParse {
  ok: boolean
  ip?: number
  prefix?: number
  error?: string
  warnings: string[]
}

/** 接受 `192.168.1.0/24`、`192.168.1.0/255.255.255.0`、`192.168.1.0 255.255.255.0` 与裸 IP */
export function parseTarget(text: string): TargetParse {
  const trimmed = (text ?? '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return { ok: false, error: '请输入 IP 或 CIDR，例如 192.168.1.0/24', warnings: [] }

  const tokens = trimmed.split(/[/\s]+/).filter(Boolean)
  const ip = parseIpv4(tokens[0] ?? '')
  if (!ip.ok) return { ok: false, error: ip.error, warnings: ip.warnings }
  if (tokens.length > 2) {
    return { ok: false, error: '只支持「IP/前缀」或「IP 掩码」两种写法', warnings: ip.warnings }
  }

  const suffix = tokens[1]
  if (suffix === undefined) {
    return {
      ok: true,
      ip: ip.value,
      prefix: 32,
      warnings: [...ip.warnings, '未写前缀长度，按 /32 单主机处理']
    }
  }
  if (/^\d{1,2}$/.test(suffix)) {
    const prefix = Number(suffix)
    if (prefix > MAX_PREFIX) return { ok: false, error: '前缀长度不能超过 32', warnings: ip.warnings }
    return { ok: true, ip: ip.value, prefix, warnings: ip.warnings }
  }
  if (suffix.includes('.')) {
    const mask = parseIpv4(suffix)
    if (!mask.ok) {
      return { ok: false, error: `子网掩码无效：${mask.error}`, warnings: [...ip.warnings, ...mask.warnings] }
    }
    const prefix = prefixOfMask(mask.value ?? 0)
    if (prefix === null) {
      return { ok: false, error: `掩码 ${suffix} 的 1 不连续，不是合法子网掩码`, warnings: ip.warnings }
    }
    return {
      ok: true,
      ip: ip.value,
      prefix,
      warnings: [...ip.warnings, `已把掩码 ${suffix} 转换为 /${prefix}`]
    }
  }
  return { ok: false, error: `前缀长度「${suffix}」无效（应为 0–32）`, warnings: ip.warnings }
}

export function binaryDotted(value: number): string {
  return [24, 16, 8, 0]
    .map((shift) => octetOf(value, shift).toString(2).padStart(8, '0'))
    .join('.')
}

function inBlock(ip: number, base: number, bits: number): boolean {
  const size = totalAddressesOf(bits)
  return ip >= base && ip < base + size
}

const SPECIAL_BLOCKS: { base: string; bits: number; label: string }[] = [
  { base: '0.0.0.0', bits: 8, label: '本网络（0/8）' },
  { base: '10.0.0.0', bits: 8, label: '私有网络（RFC 1918）' },
  { base: '100.64.0.0', bits: 10, label: '运营商级 NAT 共享段（RFC 6598）' },
  { base: '127.0.0.0', bits: 8, label: '环回地址（RFC 1122）' },
  { base: '169.254.0.0', bits: 16, label: '链路本地 / APIPA（RFC 3927）' },
  { base: '172.16.0.0', bits: 12, label: '私有网络（RFC 1918）' },
  { base: '192.0.0.0', bits: 24, label: 'IETF 协议保留（RFC 6890）' },
  { base: '192.0.2.0', bits: 24, label: '文档示例段（RFC 5737）' },
  { base: '192.168.0.0', bits: 16, label: '私有网络（RFC 1918）' },
  { base: '198.18.0.0', bits: 15, label: '设备互联基准测试（RFC 2544）' },
  { base: '198.51.100.0', bits: 24, label: '文档示例段（RFC 5737）' },
  { base: '203.0.113.0', bits: 24, label: '文档示例段（RFC 5737）' },
  { base: '224.0.0.0', bits: 4, label: '组播（RFC 5771）' },
  { base: '240.0.0.0', bits: 4, label: '保留 for 未来使用（RFC 1112）' }
]

export function specialUseOf(ip: number): string {
  for (const block of SPECIAL_BLOCKS) {
    const parsed = parseIpv4(block.base)
    if (!parsed.ok) continue
    if (inBlock(ip, parsed.value ?? 0, block.bits)) return block.label
  }
  return '公网可路由单播'
}

export function isPrivateAddress(ip: number): boolean {
  return (
    inBlock(ip, 10 * 2 ** 24, 8) ||
    inBlock(ip, (172 * 2 ** 24 + 16 * 2 ** 16), 12) ||
    inBlock(ip, 192 * 2 ** 24 + 168 * 2 ** 16, 16)
  )
}

/** 有类别时代按首段归类（已被 CIDR 取代，仅作历史参考） */
function classfulOf(ip: number): string {
  const first = octetOf(ip, 24)
  if (first < 128) return 'A 类（默认 /8）'
  if (first < 192) return 'B 类（默认 /16）'
  if (first < 224) return 'C 类（默认 /24）'
  if (first < 240) return 'D 类（组播）'
  return 'E 类（保留）'
}

function reverseArpaOf(network: number, prefix: number): string {
  const octets = [24, 16, 8, 0].map((shift) => octetOf(network, shift))
  if (prefix < 8) return '/8 及更粗的段由 IANA 直接分配，不做反向 delegation'
  if (prefix === 32) return `${[...octets].reverse().join('.')}.in-addr.arpa（主机记录）`
  if (prefix <= 24 && prefix % 8 === 0) {
    return `${octets.slice(0, prefix / 8).reverse().join('.')}.in-addr.arpa`
  }
  const firstThree = octets.slice(0, 3).reverse().join('.')
  if (prefix > 24) return `${octets[3] ?? 0}/${prefix}.${firstThree}.in-addr.arpa`
  return `${firstThree}.in-addr.arpa（/${prefix} 需按 RFC 2317 做子网 delegation）`
}

export interface SubnetSummary {
  cidr: string
  inputAddress: string
  network: string
  mask: string
  maskBinary: string
  wildcard: string
  broadcast: string
  firstHost: string
  lastHost: string
  prefix: number
  hostBits: number
  totalAddresses: number
  usableHosts: number
  networkBinary: string
  classful: string
  specialUse: string
  private: boolean
  reverseDns: string
}

export interface SummarizeResult {
  ok: boolean
  error?: string
  warnings: string[]
  summary?: SubnetSummary
}

export function summarize(text: string): SummarizeResult {
  const parsed = parseTarget(text)
  if (!parsed.ok || parsed.ip === undefined || parsed.prefix === undefined) {
    return { ok: false, error: parsed.error ?? '无法解析', warnings: parsed.warnings }
  }
  const ip = parsed.ip
  const prefix = parsed.prefix
  const total = totalAddressesOf(prefix)
  const network = Math.floor(ip / total) * total
  const broadcast = network + total - 1
  const mask = maskOf(prefix)
  const wildcard = total - 1
  const hostBits = 32 - prefix
  const [first, last] = hostRange(network, broadcast, prefix)

  return {
    ok: true,
    warnings: parsed.warnings,
    summary: {
      cidr: `${intToIpv4(network)}/${prefix}`,
      inputAddress: intToIpv4(ip),
      network: intToIpv4(network),
      mask: intToIpv4(mask),
      maskBinary: binaryDotted(mask),
      wildcard: intToIpv4(wildcard),
      broadcast: intToIpv4(broadcast),
      firstHost: intToIpv4(first),
      lastHost: intToIpv4(last),
      prefix,
      hostBits,
      totalAddresses: total,
      usableHosts: usableHostsOf(prefix),
      networkBinary: binaryDotted(network),
      classful: classfulOf(ip),
      specialUse: specialUseOf(ip),
      private: isPrivateAddress(ip),
      reverseDns: reverseArpaOf(network, prefix)
    }
  }
}

/** /32 只有自身，/31 点对点两两可用（RFC 3021），其余要留出网络地址与广播地址 */
function hostRange(network: number, broadcast: number, prefix: number): [number, number] {
  if (prefix === 32) return [network, network]
  if (prefix === 31) return [network, broadcast]
  return [network + 1, broadcast - 1]
}

export interface PrefixSuggestion {
  ok: boolean
  error?: string
  prefix?: number
  mask?: string
  usableHosts?: number
  slackHosts?: number
}

/**
 * 需要容纳 N 台主机 → 能装下的最小前缀。
 * 2 台时给 /30 而不是 /31：`/31` 按 RFC 3021 只用于点对点链路，做网段规划时不宜推荐。
 */
export function suggestPrefix(hostsNeeded: number): PrefixSuggestion {
  const needed = Math.trunc(Number(hostsNeeded))
  if (!Number.isFinite(needed) || needed < 1) {
    return { ok: false, error: '主机数至少为 1' }
  }
  if (needed > usableHostsOf(MIN_PREFIX)) {
    return { ok: false, error: `单个 IPv4 网段最多 ${usableHostsOf(MIN_PREFIX).toLocaleString('en-US')} 台主机` }
  }
  let prefix = needed === 1 ? 32 : Math.max(MIN_PREFIX, 32 - Math.ceil(Math.log2(needed + 2)))
  while (usableHostsOf(prefix) < needed && prefix > MIN_PREFIX) prefix -= 1
  return {
    ok: true,
    prefix,
    mask: intToIpv4(maskOf(prefix)),
    usableHosts: usableHostsOf(prefix),
    slackHosts: usableHostsOf(prefix) - needed
  }
}

export interface SplitResult {
  ok: boolean
  error?: string
  newPrefix?: number
  blocks?: number
  perSubnet?: number
  usablePerSubnet?: number
}

/** 把 `prefix` 再切成 2^factor 块（例如 /24 切 2 位 → 4 个 /26） */
export function splitPrefix(prefix: number, factor: number): SplitResult {
  const newPrefix = prefix + factor
  if (factor < 0) return { ok: false, error: '拆分位数不能为负' }
  if (newPrefix > MAX_PREFIX) {
    return { ok: false, error: `/${newPrefix} 已超过 32 位上限` }
  }
  return {
    ok: true,
    newPrefix,
    blocks: 2 ** factor,
    perSubnet: totalAddressesOf(newPrefix),
    usablePerSubnet: usableHostsOf(newPrefix)
  }
}

export interface SubnetRow {
  index: number
  cidr: string
  network: string
  firstHost: string
  lastHost: string
  broadcast: string
  usableHosts: number
}

export const MAX_LISTED_SUBNETS = 32

/** 列出拆分后的子网边界，最多 32 条，超出时返回 truncated 让页面提示 */
export function enumerateSubnets(
  baseText: string,
  newPrefix: number,
  limit = MAX_LISTED_SUBNETS
): { rows: SubnetRow[]; truncated: boolean; total: number; error?: string } {
  const parsed = parseTarget(baseText)
  if (!parsed.ok || parsed.ip === undefined || parsed.prefix === undefined) {
    return { rows: [], truncated: false, total: 0, error: parsed.error ?? '无法解析' }
  }
  if (newPrefix < parsed.prefix) {
    return {
      rows: [],
      truncated: false,
      total: 0,
      error: `目标 /${newPrefix} 比原前缀 /${parsed.prefix} 更粗，无法拆分`
    }
  }
  const parentSize = totalAddressesOf(parsed.prefix)
  const parentStart = Math.floor(parsed.ip / parentSize) * parentSize
  const size = totalAddressesOf(newPrefix)
  const total = Math.floor(parentSize / size)
  const rows: SubnetRow[] = []
  for (let i = 0; i < Math.min(total, limit); i++) {
    const network = parentStart + i * size
    const broadcast = network + size - 1
    const [first, last] = hostRange(network, broadcast, newPrefix)
    rows.push({
      index: i + 1,
      cidr: `${intToIpv4(network)}/${newPrefix}`,
      network: intToIpv4(network),
      firstHost: intToIpv4(first),
      lastHost: intToIpv4(last),
      broadcast: intToIpv4(broadcast),
      usableHosts: usableHostsOf(newPrefix)
    })
  }
  return { rows, truncated: total > limit, total }
}
