import { describe, expect, it } from 'vitest'
import { decryptText, encryptText } from '~/utils/aes-tool'

describe('AES-GCM 加解密', () => {
  it('正确口令往返（含中文）', async () => {
    const ct = await encryptText('你好，ToolBox！', 'p@ssw0rd')
    expect(ct.startsWith('AES-GCM:')).toBe(true)
    const r = await decryptText(ct, 'p@ssw0rd')
    expect(r.ok).toBe(true)
    expect(r.output).toBe('你好，ToolBox！')
  })

  it('随机盐/IV：同一输入两次密文不同，都能解密', async () => {
    const a = await encryptText('same', 'k')
    const b = await encryptText('same', 'k')
    expect(a).not.toBe(b)
    expect((await decryptText(a, 'k')).output).toBe('same')
    expect((await decryptText(b, 'k')).output).toBe('same')
  })

  it('错误口令：GCM 认证失败且报可读错误', async () => {
    const ct = await encryptText('secret', 'right')
    const r = await decryptText(ct, 'wrong')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('口令')
  })

  it('密文被篡改可检测', async () => {
    const ct = await encryptText('data', 'k')
    const tampered = ct.slice(0, -6) + (ct.endsWith('AAAAAA') ? 'BBBBBB' : 'AAAAAA')
    const r = await decryptText(tampered, 'k')
    expect(r.ok).toBe(false)
  })

  it('格式错误分类', async () => {
    expect((await decryptText('plain text', 'k')).error).toContain('AES-GCM:')
    expect((await decryptText('AES-GCM:!!!notbase64!!!', 'k')).ok).toBe(false)
    expect((await decryptText('AES-GCM:' + btoa('short'), 'k')).error).toContain('长度不足')
    const ct = await encryptText('x', 'k')
    expect((await decryptText(ct, '')).error).toContain('口令')
  })
})
