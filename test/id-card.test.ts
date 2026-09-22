import { describe, it, expect } from 'vitest'
import { parseIdCard, verifyIdCardChecksum } from '~/utils/id-card'

describe('utils/id-card', () => {
  it('校验位核验：正确为 true、篡改末位为 false', () => {
    expect(verifyIdCardChecksum('11010519491231002X')).toBe(true)
    expect(verifyIdCardChecksum('110105194912310020')).toBe(false)
  })
  it('合法女号：出生日期/性别/年龄/归属地', () => {
    const r = parseIdCard('11010519491231002X', new Date(2000, 0, 1))
    expect(r.valid).toBe(true)
    expect(r.error).toBe('')
    expect(r.birthday).toBe('1949-12-31')
    expect(r.gender).toBe('女')
    expect(r.age).toBe(50)
    expect(r.regionCode).toBe('110105')
  })
  it('合法男号（小写末位输入也识别）', () => {
    // 第 17 位为 1（奇数）→ 男
    const male = parseIdCard('110105199001010010', new Date(2023, 0, 1))
    expect(male.valid).toBe(true)
    expect(male.gender).toBe('男')
    expect(male.birthday).toBe('1990-01-01')
    expect(male.age).toBe(33)
  })
  it('长度不对', () => {
    expect(parseIdCard('123').error).toBe('身份证号应为 18 位')
  })
  it('格式不对（含字母）', () => {
    expect(parseIdCard('abcdefghijklmnopqr').error).toContain('格式不正确')
  })
  it('校验位不对', () => {
    expect(parseIdCard('110105194912310021').error).toBe('校验位不正确')
  })
  it('日期越界但校验位正确', () => {
    // 1949-13-32，按权算校验位为 9
    const r = parseIdCard('110105194913320019')
    expect(r.valid).toBe(false)
    expect(r.error).toBe('出生日期不合法')
  })
})
