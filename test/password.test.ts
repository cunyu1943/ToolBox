import { describe, expect, it } from 'vitest'
import { generatePassword } from '~/utils/password'

describe('generatePassword', () => {
  it('尊重长度', () => expect(generatePassword({ length: 24 }).length).toBe(24))
  it('最小长度 1', () => expect(generatePassword({ length: 0 }).length).toBe(1))
  it('仅数字', () => {
    const p = generatePassword({ length: 30, lowercase: false, uppercase: false, symbols: false, digits: true })
    expect(p).toMatch(/^[0-9]+$/)
  })
  it('仅小写', () => {
    const p = generatePassword({ length: 30, uppercase: false, digits: false, symbols: false, lowercase: true })
    expect(p).toMatch(/^[a-z]+$/)
  })
  it('排除易混淆字符', () => {
    const p = generatePassword({ length: 300, excludeAmbiguous: true })
    expect(p).not.toMatch(/[Il1O0o|`]/)
  })
  it('无字符集抛错', () =>
    expect(() => generatePassword({ lowercase: false, uppercase: false, digits: false, symbols: false })).toThrow())
  it('固定 rng 结果确定', () => {
    const rng = () => 0.42
    expect(generatePassword({ length: 12 }, rng)).toBe(generatePassword({ length: 12 }, rng))
  })
})
