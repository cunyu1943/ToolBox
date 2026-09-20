import { describe, expect, it } from 'vitest'
import {
  applyBitwise, convertBytes, formatRadix, isValidRadixInput, parseRadixInput, toSignedString, truncate
} from '~/utils/programmer'

describe('程序员计算器 programmer', () => {
  it('truncate 按字长截断（8 位：300 → 44）', () => {
    expect(truncate(300n, 8)).toBe(44n)
    expect(truncate(-1n, 8)).toBe(255n)
  })

  it('二进制补码有符号解释', () => {
    expect(toSignedString(255n, 8)).toBe('-1')
    expect(toSignedString(128n, 8)).toBe('-128')
    expect(toSignedString(127n, 8)).toBe('127')
  })

  it('进制输入合法性校验', () => {
    expect(isValidRadixInput('hex', 'ff')).toBe(true)
    expect(isValidRadixInput('hex', 'gz')).toBe(false)
    expect(isValidRadixInput('bin', '101')).toBe(true)
    expect(isValidRadixInput('bin', '2')).toBe(false)
  })

  it('parseRadixInput 解析各进制并截断', () => {
    expect(parseRadixInput('hex', '1F', 32).value).toBe(31n)
    expect(parseRadixInput('bin', '101', 8).value).toBe(5n)
    expect(parseRadixInput('oct', '17', 8).value).toBe(15n)
    expect(parseRadixInput('dec', '-1', 8).value).toBe(255n)
    expect(parseRadixInput('hex', 'zz', 8).error).toContain('非法字符')
  })

  it('formatRadix 展示（hex 大写、dec 走有符号）', () => {
    expect(formatRadix(31n, 'hex', false, 8)).toBe('1F')
    expect(formatRadix(255n, 'dec', true, 8)).toBe('-1')
    expect(formatRadix(255n, 'dec', false, 8)).toBe('255')
    expect(formatRadix(5n, 'bin', false, 8)).toBe('101')
  })

  it('位运算 AND/OR/XOR/NOT', () => {
    expect(applyBitwise(0xFn, 'and', '3', 8).value).toBe(3n)
    expect(applyBitwise(0xFn, 'or', '240', 8).value).toBe(0xFFn)
    expect(applyBitwise(0b1100n, 'xor', '10', 8).value).toBe(0b0110n)
    expect(applyBitwise(0n, 'not', '', 8).value).toBe(255n)
  })

  it('移位并约束 0–64', () => {
    expect(applyBitwise(1n, 'shl', '4', 8).value).toBe(16n)
    expect(applyBitwise(16n, 'shr', '4', 8).value).toBe(1n)
    expect(applyBitwise(1n, 'shl', '65', 8).error).toContain('0–64')
  })

  it('非移位运算的操作数须为十进制整数', () => {
    expect(applyBitwise(3n, 'and', 'ff', 8).error).toContain('十进制整数')
  })

  it('字节单位换算（1 MB）', () => {
    const r = convertBytes(1, 'MB')
    expect(r.MB).toBe('1')
    expect(r.KB).toBe('1,024')
    expect(r.B).toBe('1,048,576')
  })
})
