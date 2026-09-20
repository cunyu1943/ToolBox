import { describe, expect, it } from 'vitest'
import { isValidIpv4, ipv4ToInt, intToIpv4, ipv4ToHex, ipv4ToBinary } from '~/utils/ip'

describe('isValidIpv4', () => {
  it('合法', () => expect(isValidIpv4('192.168.1.1')).toBe(true))
  it('段越界', () => expect(isValidIpv4('256.1.1.1')).toBe(false))
  it('段数不对', () => expect(isValidIpv4('1.2.3')).toBe(false))
  it('非数字', () => expect(isValidIpv4('a.b.c.d')).toBe(false))
})

describe('IPv4 进制转换', () => {
  it('点分 → 整数', () => expect(ipv4ToInt('192.168.0.1')).toBe(3232235521))
  it('整数 → 点分', () => expect(intToIpv4(3232235521)).toBe('192.168.0.1'))
  it('往返', () => expect(intToIpv4(ipv4ToInt('10.0.0.255'))).toBe('10.0.0.255'))
  it('最大地址十六进制', () => expect(ipv4ToHex('255.255.255.255')).toBe('0xffffffff'))
  it('二进制分组', () => expect(ipv4ToBinary('1.2.3.4')).toBe('00000001.00000010.00000011.00000100'))
  it('最小地址', () => expect(ipv4ToInt('0.0.0.0')).toBe(0))
  it('非法整数抛错', () => expect(() => intToIpv4(4294967296)).toThrow())
  it('非法地址抛错', () => expect(() => ipv4ToInt('999.1.1.1')).toThrow())
})
