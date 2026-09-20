import { describe, expect, it } from 'vitest'
import { toChineseLower, toChineseUpper } from '~/utils/chinese-number'

describe('人民币财务大写', () => {
  it('零元整', () => expect(toChineseUpper(0)).toBe('零元整'))
  it('整数壹拾', () => expect(toChineseUpper(10)).toBe('壹拾元整'))
  it('内部补零 1005', () => expect(toChineseUpper(1005)).toBe('壹仟零伍元整'))
  it('万 10000', () => expect(toChineseUpper(10000)).toBe('壹万元整'))
  it('亿 100000000', () => expect(toChineseUpper(100000000)).toBe('壹亿元整'))
  it('亿级补零 100000001', () => expect(toChineseUpper(100000001)).toBe('壹亿零壹元整'))
  it('亿级补零 100000010', () => expect(toChineseUpper(100000010)).toBe('壹亿零壹拾元整'))
  it('混合 123456789', () =>
    expect(toChineseUpper(123456789)).toBe('壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元整'))
  it('角整 1234.5', () => expect(toChineseUpper(1234.5)).toBe('壹仟贰佰叁拾肆元伍角整'))
  it('角分 0.05', () => expect(toChineseUpper(0.05)).toBe('伍分'))
  it('元零分 1.01', () => expect(toChineseUpper(1.01)).toBe('壹元零壹分'))
  it('负数', () => expect(toChineseUpper(-8.88)).toBe('负捌元捌角捌分'))
})

describe('普通中文读法', () => {
  it('一千二百三十四', () => expect(toChineseLower(1234)).toBe('一千二百三十四'))
  it('带小数点', () => expect(toChineseLower(12.5)).toBe('一十二点五'))
  it('零', () => expect(toChineseLower(0)).toBe('零'))
})
