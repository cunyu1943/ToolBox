import { describe, expect, it } from 'vitest'
import { parseCidr, subnetInfo } from '~/utils/subnet'

describe('parseCidr', () => {
  it('解析前缀写法', () => {
    expect(parseCidr('192.168.1.5/24')).toEqual({ ok: true, ip: '192.168.1.5', prefix: 24 })
  })

  it('解析点分掩码写法', () => {
    expect(parseCidr('10.0.0.1/255.255.240.0')).toEqual({ ok: true, ip: '10.0.0.1', prefix: 20 })
  })

  it('空格分隔也接受', () => {
    expect(parseCidr('172.16.0.9 255.255.0.0')).toEqual({ ok: true, ip: '172.16.0.9', prefix: 16 })
  })

  it('非法掩码（非连续位）报错', () => {
    const r = parseCidr('1.1.1.1/255.0.255.0')
    expect(r.ok).toBe(false)
  })

  it('前缀越界 / 缺前缀 / 非法 IP 报错', () => {
    expect(parseCidr('1.1.1.1/33').ok).toBe(false)
    expect(parseCidr('1.1.1.1').ok).toBe(false)
    expect(parseCidr('300.1.1.1/24').ok).toBe(false)
    expect(parseCidr('').ok).toBe(false)
  })
})

describe('subnetInfo', () => {
  it('192.168.1.5/24 常规网段', () => {
    const s = subnetInfo('192.168.1.5', 24)
    expect(s).toMatchObject({
      cidr: '192.168.1.0/24',
      mask: '255.255.255.0',
      wildcard: '0.0.0.255',
      network: '192.168.1.0',
      broadcast: '192.168.1.255',
      hostMin: '192.168.1.1',
      hostMax: '192.168.1.254',
      usableHosts: 254,
      totalAddresses: 256,
      networkBinary: '11000000.10101000.00000001.00000000'
    })
  })

  it('/26 借位划分第二块', () => {
    const s = subnetInfo('10.0.0.80', 26)
    expect(s.network).toBe('10.0.0.64')
    expect(s.broadcast).toBe('10.0.0.127')
    expect(s.usableHosts).toBe(62)
  })

  it('/31 点对点链路两主机可用（RFC 3021）', () => {
    const s = subnetInfo('10.0.0.3', 31)
    expect(s.hostMin).toBe('10.0.0.2')
    expect(s.hostMax).toBe('10.0.0.3')
    expect(s.usableHosts).toBe(2)
  })

  it('/32 单主机', () => {
    const s = subnetInfo('8.8.8.8', 32)
    expect(s.network).toBe('8.8.8.8')
    expect(s.broadcast).toBe('8.8.8.8')
    expect(s.usableHosts).toBe(1)
  })

  it('/0 全网段不溢出', () => {
    const s = subnetInfo('1.2.3.4', 0)
    expect(s.mask).toBe('0.0.0.0')
    expect(s.totalAddresses).toBe(4294967296)
    expect(s.usableHosts).toBe(4294967294)
  })
})
