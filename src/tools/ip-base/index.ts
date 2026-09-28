/**
 * IP 地址互转内核：IPv4 / IPv6 解析 + 各种进制的等价写法 + 反向解析域 + 归属分类。
 *
 * 三处容易写错的地方：
 * - **`inet_aton` 的简写形式是真的存在**：`127.1` 合法（第一段 /8 + 余下 24 位），`10.1.1` 也合法。
 *   很多工具只会拒绝它们，这里按 C 库的规则展开，同时给一条提示说明这是简写。
 * - **IPv6 的 `::` 只能出现一次**，而且 `0:0:0:0:0:0:0:1` 与 `::1` 之外还有
 *   `::ffff:1.2.3.4` 这种尾巴塞 IPv4 的混合写法。压缩一律按 RFC 5952：
 *   只压最长的一段、长度必须 ≥ 2 组、并列时压最前面那段、字母小写。
 * - **前导 0 在点分十进制里是八进制**（`inet_aton` 约定，`010` 是 8）。这里按八进制解释但一定给警告：
 *   直接拒绝的话，本工具自己产出的「逐段八进制」写法就回读不回来了。
 */

export type IpFamily = 4 | 6

export interface ParsedIp {
  ok: true
  family: IpFamily
  /** 4 或 16 段字节 */
  bytes: number[]
  /** 整数形式（IPv4 是 32 位、IPv6 是 128 位） */
  int: bigint
  /** 规范写法：IPv4 点分十进制，IPv6 按 RFC 5952 压缩 */
  normalized: string
  /** 全展开的 IPv6（8 组 4 位十六进制）；IPv4 为 undefined */
  expanded?: string
  warnings: string[]
}

export interface IpFailure {
  ok: false
  error: string
  hints: string[]
}

export type ParseIpResult = ParsedIp | IpFailure

export interface IpFormat {
  label: string
  value: string
  /** 复制时给的说明 */
  note?: string
}

export interface IpClass {
  label: string
  detail: string
  scope: 'private' | 'loopback' | 'link-local' | 'multicast' | 'reserved' | 'public'
}

const fail = (error: string, hints: string[] = []): IpFailure => ({ ok: false, error, hints })

/** 八进制 / 十六进制 / 十进制都认（`0x`、`0`前缀），但拒绝带符号与小数 */
function parseOctetToken(text: string, allowWide: boolean): number | bigint | undefined {
  const clean = text.trim()
  if (!clean) return undefined
  if (/^0[xX][0-9a-fA-F]+$/.test(clean)) return allowWide ? BigInt(clean) : Number(clean)
  if (/^0[0-7]+$/.test(clean)) {
    const value = Number.parseInt(clean.slice(1), 8)
    return allowWide ? BigInt(value) : value
  }
  if (!/^\d+$/.test(clean)) return undefined
  return allowWide ? BigInt(clean) : Number(clean)
}

function bytesToInt(bytes: number[]): bigint {
  let value = 0n
  for (const byte of bytes) value = (value << 8n) | BigInt(byte)
  return value
}

function intToBytes(value: bigint, length: number): number[] {
  const out: number[] = []
  let rest = value
  for (let i = 0; i < length; i += 1) {
    out.unshift(Number(rest & 0xffn))
    rest >>= 8n
  }
  return out
}

const hex = (value: number, width = 2): string => value.toString(16).padStart(width, '0')

/** RFC 5952：小写、前导零省略、最长且最靠前的连续全零段（≥ 2 组）压成 `::` */
export function compressIpv6(groups: number[]): string {
  let bestStart = -1
  let bestLength = 0
  let cursor = 0
  while (cursor < groups.length) {
    if (groups[cursor] === 0) {
      let end = cursor
      while (end < groups.length && groups[end] === 0) end += 1
      const length = end - cursor
      if (length >= 2 && length > bestLength) {
        bestLength = length
        bestStart = cursor
      }
      cursor = end
      continue
    }
    cursor += 1
  }
  const text = (start: number, end: number): string =>
    groups.slice(start, end).map((group) => group.toString(16)).join(':')
  if (bestStart < 0) return text(0, groups.length)
  const head = text(0, bestStart)
  const tail = text(bestStart + bestLength, groups.length)
  if (!head && !tail) return '::'
  if (!head) return `::${tail}`
  if (!tail) return `${head}::`
  return `${head}::${tail}`
}

export function expandIpv6(groups: number[]): string {
  return groups.map((group) => hex(group, 4)).join(':')
}

function ipv6ToBytes(groups: number[]): number[] {
  const bytes: number[] = []
  for (const group of groups) bytes.push((group >> 8) & 0xff, group & 0xff)
  return bytes
}

/** IPv6 的 `::ffff:1.2.3.4` 尾巴：最后一组可以是 IPv4 点分形式，占两组 */
function parseIpv6(input: string): ParseIpResult {
  const text = input.trim()
  const warnings: string[] = []
  const zone = text.indexOf('%')
  let body = text
  if (zone >= 0) {
    warnings.push(`已剥掉 zone/scope id「${text.slice(zone)}」：它只在链路本地地址上有意义，不属于地址本身`)
    body = text.slice(0, zone)
  }
  if (body.startsWith('[') && body.endsWith(']')) body = body.slice(1, -1)
  if (body.includes('.')) {
    const tail = body.slice(body.lastIndexOf(':') + 1)
    const mapped = parseIpv4(tail)
    if (!mapped.ok) return fail(`IPv6 里点分的那段「${tail}」不是合法 IPv4`)
    if (mapped.warnings.length) warnings.push(...mapped.warnings)
    const words = mapped.bytes.reduce<number[]>((acc, byte, index) => {
      if (index % 2 === 0) acc.push(0)
      acc[acc.length - 1] = (acc[acc.length - 1] ?? 0) * 256 + byte
      return acc
    }, [])
    body = `${body.slice(0, body.lastIndexOf(':') + 1)}${hex(words[0] ?? 0, 4)}:${hex(words[1] ?? 0, 4)}`
    warnings.push('点分写法已按 IPv4 映射展开为两组十六进制')
  }

  const halves = body.split('::')
  if (halves.length > 2) return fail('「::」最多只能出现一次', ['`::` 表示一段连续的全零组，写两次就不知道各段多长了'])
  const groups: number[] = []
  const push = (chunk: string): IpFailure | undefined => {
    if (!chunk) return undefined
    for (const part of chunk.split(':')) {
      if (!part) return fail('出现空的分组，冒号数量不对')
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
        return fail(`分组「${part}」不合法`, ['每组是 1–4 位十六进制数字，多了要拆组，非法字符要检查是否混进了空格或全角冒号'])
      }
      groups.push(Number.parseInt(part, 16))
    }
    return undefined
  }

  if (halves.length === 1) {
    const bad = push(halves[0] ?? '')
    if (bad) return bad
    if (groups.length !== 8) return fail(`分组数量是 ${groups.length}，IPv6 必须是 8 组`, ['少写的零组要用 `::` 表示，例如 2001:db8::1'])
  } else {
    const badHead = push(halves[0] ?? '')
    if (badHead) return badHead
    const head = [...groups]
    groups.length = 0
    const badTail = push(halves[1] ?? '')
    if (badTail) return badTail
    const tail = [...groups]
    const missing = 8 - head.length - tail.length
    if (missing < 0) return fail(`两段合计 ${head.length + tail.length} 组，超过 8 组`)
    if (missing === 1) warnings.push('`::` 只代替了 1 组零，按 RFC 5952 这种省略不该出现，已照常解析')
    const full = [...head, ...new Array<number>(missing).fill(0), ...tail]
    groups.length = 0
    groups.push(...full)
  }

  const bytes = ipv6ToBytes(groups)
  const full = expandIpv6(groups)
  return {
    ok: true,
    family: 6,
    bytes,
    int: bytesToInt(bytes),
    normalized: compressIpv6(groups),
    expanded: full,
    warnings
  }
}

export function parseIpv4(input: string): ParseIpResult {
  const text = input.trim()
  if (text.includes(':')) return parseIpv6(text)
  const octets = text.split('.')
  if (octets.length === 0 || octets.length > 4) return fail('IPv4 只能是 1–4 段点分数字')
  const warnings: string[] = []
  const values: number[] = []
  const octal: string[] = []
  for (const octet of octets) {
    const token = octet.trim()
    if (!token) return fail('出现空段，检查是否多写了点号')
    if (/^0\d+$/.test(token) && !/^0[0-7]+$/.test(token)) {
      return fail(`「${token}」以 0 开头但不是合法八进制`, [
        '前导 0 表示八进制，只允许 0–7；要写十进制就去掉前导 0（`0192` → `192`）'
      ])
    }
    if (/^0[0-7]+$/.test(token)) octal.push(`${token}=${parseOctetToken(token, false) ?? '?'}`)
    const parsed = parseOctetToken(token, false)
    if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return fail(`「${token}」不是可识别的十进制/十六进制/八进制数`)
    values.push(parsed)
  }
  if (octal.length) {
    warnings.push(`前导 0 按八进制解释（inet_aton 约定）：${octal.join('、')}。这是 SSRF 绕过里常见的写法，配置文件里最好别用`)
  }
  const wide = values.some((value) => value > 255)
  let bytes: number[]
  if (values.length === 4) {
    if (values.some((value) => value > 255)) return fail('每段必须在 0–255 之间')
    bytes = values
  } else {
    if (values.slice(0, -1).some((value) => value > 255)) return fail('除最后一段外每段都必须在 0–255 之间')
    const last = values[values.length - 1] as number
    const tailBytes = 5 - values.length
    if (last >= 256 ** tailBytes) return fail(`最后一段要装 ${tailBytes} 字节，超出范围`)
    bytes = [...values.slice(0, -1), ...intToBytes(BigInt(last), tailBytes)]
    warnings.push(`已按 inet_aton 的简写展开：${values.join('.')} → ${bytes.join('.')}`)
    if (wide) warnings.push('注意这是 C 库的简写形式，多数应用与配置文件不接受')
  }
  return {
    ok: true,
    family: 4,
    bytes,
    int: bytesToInt(bytes),
    normalized: bytes.join('.'),
    warnings
  }
}

export function parseIp(input: string): ParseIpResult {
  const text = input.trim()
  if (!text) return fail('地址为空')
  if (/[^\x00-\x7f]/.test(text)) return fail('地址里有非 ASCII 字符', ['常见原因是输入法把 `:` 或 `.` 打成了全角'])
  return parseIpv4(text)
}

/** 从整数形式还原：不带前缀按十进制，`0x` 前缀按十六进制 */
export function fromInteger(input: string): ParseIpResult {
  const text = input.trim().replace(/_/g, '')
  if (!/^\d+$/.test(text) && !/^0[xX][0-9a-fA-F]+$/.test(text)) {
    return fail('只能是十进制整数，或 0x 前缀的十六进制整数')
  }
  const value = BigInt(text)
  if (value > (1n << 128n) - 1n) return fail('整数超过 128 位，不是 IP 地址')
  const family: IpFamily = value <= 0xffffffffn ? 4 : 6
  return finishFromBytes(intToBytes(value, family === 4 ? 4 : 16), family, [`已按 ${family === 4 ? '32' : '128'} 位整数还原`])
}

export function fromBytes(bytes: number[], family: IpFamily): ParsedIp {
  return finishFromBytes(bytes, family, [])
}

function finishFromBytes(input: number[], family: IpFamily, warnings: string[]): ParsedIp {
  const size = family === 4 ? 4 : 16
  // 字节数不对时补齐/截断而不是报错：调用方都是从已校验的地址切片来的
  const bytes = Array.from({ length: size }, (_, index) => (input[index] ?? 0) & 0xff)
  const int = bytesToInt(bytes)
  if (family === 4) return { ok: true, family, bytes, int, normalized: bytes.join('.'), warnings }
  const groups: number[] = []
  for (let i = 0; i < 16; i += 2) groups.push(((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0))
  return { ok: true, family, bytes, int, normalized: compressIpv6(groups), expanded: expandIpv6(groups), warnings }
}

function dottedHex(bytes: number[]): string {
  return bytes.map((byte) => `0x${hex(byte)}`).join('.')
}

function dottedOctal(bytes: number[]): string {
  return bytes.map((byte) => `0${byte.toString(8)}`).join('.')
}

function dottedBinary(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(2).padStart(8, '0')).join('.')
}

/** 反向解析域：IPv4 用 in-addr.arpa，IPv6 按 RFC 5952 用半字节反写的 ip6.arpa */
export function reverseDns(bytes: number[], family: IpFamily): string {
  if (family === 4) return `${[...bytes].reverse().join('.')}.in-addr.arpa`
  const nibbles: string[] = []
  for (const byte of bytes) {
    const text = hex(byte)
    nibbles.push(text[0] ?? '0', text[1] ?? '0')
  }
  return `${nibbles.reverse().join('.')}.ip6.arpa`
}

export function classify(ip: ParsedIp): IpClass {
  const [a = 0, b = 0, c = 0] = ip.bytes
  if (ip.family === 4) {
    if (a === 127) return { label: '回环', detail: '127.0.0.0/8，只有 127.0.0.1 最常用', scope: 'loopback' }
    if (a === 10) return { label: '私有（A 类）', detail: '10.0.0.0/8', scope: 'private' }
    if (a === 192 && b === 168) return { label: '私有（C 类）', detail: '192.168.0.0/16', scope: 'private' }
    if (a === 172 && b >= 16 && b <= 31) return { label: '私有（B 类）', detail: '172.16.0.0/12', scope: 'private' }
    if (a === 169 && b === 254) return { label: '链路本地', detail: '169.254.0.0/16，DHCP 失败时的自动配置地址', scope: 'link-local' }
    if (a === 169) return { label: '保留', detail: '169.0.0.0/8 归 IANA', scope: 'reserved' }
    if (a === 100 && b >= 64 && b <= 127) return { label: '运营商 NAT', detail: '100.64.0.0/10（CGNAT，RFC 6598）', scope: 'reserved' }
    if (a === 198 && (b === 18 || b === 19)) return { label: '设备基准测试', detail: '198.18.0.0/15（RFC 2544）', scope: 'reserved' }
    if (a === 192 && b === 0 && c === 2) return { label: '文档地址', detail: '192.0.2.0/24（TEST-NET-1，写示例用）', scope: 'reserved' }
    if (a === 192 && b === 0 && c === 0) return { label: '保留', detail: '192.0.0.0/24，含 192.0.0.1 的 IETF 协议分配', scope: 'reserved' }
    if (a === 198 && b === 51) return { label: '文档地址', detail: '198.51.100.0/24（TEST-NET-2）', scope: 'reserved' }
    if (a === 203 && b === 0 && c === 113) return { label: '文档地址', detail: '203.0.113.0/24（TEST-NET-3）', scope: 'reserved' }
    if (a === 0) return { label: '本网络', detail: '0.0.0.0/8，「本机」或默认路由', scope: 'reserved' }
    if (a >= 224 && a < 240) return { label: '组播', detail: '224.0.0.0/4', scope: 'multicast' }
    if (a >= 240) return { label: '保留（将来用）', detail: '240.0.0.0/4，含 255.255.255.255 广播', scope: 'reserved' }
    const clazz = a < 128 ? 'A' : a < 192 ? 'B' : 'C'
    return { label: `公网（${clazz} 类）`, detail: `首段 ${a}，默认掩码 /${clazz === 'A' ? 8 : clazz === 'B' ? 16 : 24}`, scope: 'public' }
  }
  const head = ip.expanded ?? ip.normalized
  const first = ((ip.bytes[0] ?? 0) << 8) | (ip.bytes[1] ?? 0)
  if (head === '0000:0000:0000:0000:0000:0000:0000:0001') return { label: '回环', detail: '::1，相当于 IPv4 的 127.0.0.1', scope: 'loopback' }
  if (head === '0000:0000:0000:0000:0000:0000:0000:0000') return { label: '未指定', detail: '::，只能作源地址占位', scope: 'reserved' }
  if (head.startsWith('0000:0000:0000:0000:0000:ffff:')) {
    const inner = finishFromBytes(ip.bytes.slice(12), 4, [])
    return { label: 'IPv4 映射', detail: `::ffff:${inner.normalized}，双栈栈上常见`, scope: 'reserved' }
  }
  if (head.startsWith('0000:0000:0000:0000:0000:0000:')) {
    const inner = finishFromBytes(ip.bytes.slice(12), 4, [])
    return { label: 'IPv4 兼容（已废弃）', detail: `::${inner.normalized}，RFC 4291 已作废，别在新系统里用`, scope: 'reserved' }
  }
  if ((first & 0xffc0) === 0xfe80) return { label: '链路本地', detail: 'fe80::/10，路由器只在这个段里做邻居发现，必须带 zone', scope: 'link-local' }
  if ((first & 0xfe00) === 0xfc00) return { label: '唯一本地地址', detail: 'fc00::/7（ULA，RFC 4193），相当于 IPv4 的私有段', scope: 'private' }
  if ((first & 0xff00) === 0xff00) return { label: '组播', detail: 'ff00::/8，第二字节末 4 位是范围（0x0e=全网 …）', scope: 'multicast' }
  if (head.startsWith('2001:0000:')) return { label: 'Teredo', detail: '2001:0000::/32（RFC 4364，UDP 打洞过渡用）', scope: 'reserved' }
  if (head.startsWith('2001:0db8:')) return { label: '文档地址', detail: '2001:db8::/32，写示例与文档专用', scope: 'reserved' }
  if (head.startsWith('3ffe:')) return { label: '旧示例段', detail: '3ffe::/16（6bone，已停用）', scope: 'reserved' }
  if (head.startsWith('2002:')) return { label: '6to4', detail: '2002::/16，内嵌 IPv4 可用 ipv4Inside6to4 取出', scope: 'reserved' }
  return { label: '全球单播', detail: '2000::/3，公网可路由', scope: 'public' }
}

/** 6to4 地址里内嵌的 IPv4：取第 2、3 段 */
export function ipv4Inside6to4(ip: ParsedIp): string | undefined {
  if (ip.family !== 6 || !ip.expanded?.startsWith('2002:')) return undefined
  return finishFromBytes(ip.bytes.slice(2, 6), 4, []).normalized
}

export function formatsOf(ip: ParsedIp): IpFormat[] {
  const out: IpFormat[] = []
  if (ip.family === 4) {
    out.push({ label: '点分十进制', value: ip.normalized })
    out.push({ label: '整数（32 位无符号）', value: ip.int.toString(10) })
    out.push({ label: '十六进制', value: `0x${ip.bytes.map((byte) => hex(byte)).join('')}` })
    out.push({ label: '逐段十六进制', value: dottedHex(ip.bytes), note: '某些解析器只认这种写法' })
    out.push({ label: '逐段八进制', value: dottedOctal(ip.bytes), note: '前导 0 会让整段按八进制解释' })
    out.push({ label: '逐段二进制', value: dottedBinary(ip.bytes) })
    out.push({ label: '反向解析域', value: reverseDns(ip.bytes, 4) })
    out.push({ label: 'CIDR 主机写法', value: `${ip.normalized}/32` })
    return out
  }
  out.push({ label: '压缩形式（RFC 5952）', value: ip.normalized, note: '只压最长最靠前的全零段，字母小写' })
  out.push({ label: '完整展开', value: ip.expanded ?? ip.normalized })
  out.push({ label: '整数（128 位）', value: ip.int.toString(10) })
  out.push({ label: '十六进制', value: `0x${ip.bytes.map((byte) => hex(byte)).join('')}` })
  out.push({ label: 'URL 写法', value: `[${ip.normalized}]`, note: 'IPv6 进 URL 必须加方括号，否则端口冒号会分不清' })
  out.push({ label: '反向解析域', value: reverseDns(ip.bytes, 6) })
  out.push({ label: '内嵌 IPv4', value: (() => {
    const inner = ipv4Inside6to4(ip)
    if (inner) return `2002:${inner}`
    if (ip.expanded?.startsWith('0000:0000:0000:0000:0000:ffff:')) return finishFromBytes(ip.bytes.slice(12), 4, []).normalized
    if (ip.expanded?.startsWith('0000:0000:0000:0000:0000:0000:')) return finishFromBytes(ip.bytes.slice(12), 4, []).normalized
    return ''
  })(), note: '只在 6to4 / 双栈映射场景下有值' })
  return out.filter((item) => item.value !== '')
}

export const IP_SAMPLES: { label: string; value: string }[] = [
  { label: '本机回环', value: '127.0.0.1' },
  { label: '私有段', value: '192.168.1.100' },
  { label: 'inet_aton 简写', value: '10.1' },
  { label: '公网示例', value: '8.8.8.8' },
  { label: 'IPv6 回环', value: '::1' },
  { label: '文档段', value: '2001:DB8::ABCD:1' },
  { label: 'IPv4 映射', value: '::ffff:192.0.2.145' },
  { label: '整数形式', value: '134744072' }
]
