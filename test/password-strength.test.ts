import { describe, it, expect } from 'vitest'
import { analyzePassword } from '~/utils/password-strength'

describe('utils/password-strength 密码强度', () => {
  it('空输入：得分 0 并提示', () => {
    const r = analyzePassword('')
    expect(r.score).toBe(0)
    expect(r.warnings).toContain('尚未输入密码')
  })
  it('常见弱口令：123456 / password / qwertyuiop 判为很弱或弱', () => {
    for (const p of ['123456', 'password', 'qwertyuiop']) {
      const r = analyzePassword(p)
      expect(r.score).toBeLessThanOrEqual(1)
      expect(r.warnings).toContain('属于常见弱口令')
    }
  })
  it('短密码（<8 位）最多评为弱', () => {
    const r = analyzePassword('aA1!aA')
    expect(r.score).toBeLessThanOrEqual(1)
  })
  it('纯数字 16 位因字符集单一被降级', () => {
    const r = analyzePassword('8237492837465201')
    expect(r.score).toBeLessThanOrEqual(1)
    expect(r.charsetSize).toBe(10)
  })
  it('键盘序列 abcdefgh 被识别并降级', () => {
    const r = analyzePassword('abcdefgh')
    expect(r.warnings).toContain('包含连续字符或键盘序列')
    expect(r.score).toBeLessThanOrEqual(1)
  })
  it('qwer 键盘行序列被识别', () => {
    expect(analyzePassword('xqwerz').warnings).toContain('包含连续字符或键盘序列')
  })
  it('重复段 aaa 被识别', () => {
    const r = analyzePassword('xyZaaa12!')
    expect(r.warnings).toContain('包含重复字符段')
  })
  it('混合四类字符的 12 位密码达到强/很强', () => {
    const r = analyzePassword('Xk9#mQ2$vrL!')
    expect(r.score).toBeGreaterThanOrEqual(3)
    expect(r.entropy).toBeGreaterThan(60)
    expect(r.charsetSize).toBe(95)
  })
  it('熵 = 长度 × log2(字符集)，8 位纯小写 ≈ 37.6', () => {
    const r = analyzePassword('abcdefgh')
    // 命中序列惩罚后熵被收敛显示
    expect(r.entropy).toBeLessThanOrEqual(36)
  })
  it('label 与 score 对应、percent 与 score 一致', () => {
    const r = analyzePassword('Corr3ct-Horse!Battery9')
    expect(r.label).toBe(['很弱', '弱', '中等', '强', '很强'][r.score])
    expect(r.percent).toBe(r.score / 4 * 100)
    expect(r.score).toBe(4)
  })
  it('无输入时有建议文案', () => {
    expect(analyzePassword('hello world').suggestion).toBeTruthy()
  })
})
