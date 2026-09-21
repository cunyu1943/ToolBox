import { describe, expect, it } from 'vitest'
import { fromRoman, toRoman } from '~/utils/roman'

describe('罗马数字', () => {
  it('基本映射', () => {
    expect(toRoman(1)).toBe('I')
    expect(toRoman(4)).toBe('IV')
    expect(toRoman(9)).toBe('IX')
    expect(toRoman(14)).toBe('XIV')
    expect(toRoman(40)).toBe('XL')
    expect(toRoman(90)).toBe('XC')
    expect(toRoman(400)).toBe('CD')
    expect(toRoman(900)).toBe('CM')
  })
  it('3999 上界', () => expect(toRoman(3999)).toBe('MMMCMXCIX'))
  it('1994 经典用例', () => expect(toRoman(1994)).toBe('MCMXCIV'))
  it('越界与小数抛错', () => {
    expect(() => toRoman(0)).toThrow(RangeError)
    expect(() => toRoman(4000)).toThrow(RangeError)
    expect(() => toRoman(2.5)).toThrow(RangeError)
  })
  it('解码与往返', () => {
    expect(fromRoman('mcmxciv')).toBe(1994)
    for (const n of [1, 9, 14, 40, 990, 3999]) expect(fromRoman(toRoman(n))).toBe(n)
  })
  it('非法与非规范写法抛错', () => {
    expect(() => fromRoman('IIII')).toThrow()
    expect(() => fromRoman('IL')).toThrow()
    expect(() => fromRoman('VX')).toThrow()
    expect(() => fromRoman('ABC')).toThrow()
    expect(() => fromRoman('')).toThrow()
  })
})
