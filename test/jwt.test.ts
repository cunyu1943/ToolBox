import { describe, expect, it } from 'vitest'
import { parseJwt, describeJwtTime } from '~/utils/jwt'

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('parseJwt', () => {
  it('解析标准三段', () => {
    const r = parseJwt(TOKEN)
    expect(r.ok).toBe(true)
    expect(r.header).toContain('HS256')
    expect(r.payload).toContain('John Doe')
    expect(r.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
  })
  it('段数不足报错', () => expect(parseJwt('a.b').ok).toBe(false))
  it('非法 base64url 报错', () => expect(parseJwt('!!!.!!!.x').ok).toBe(false))
})

describe('describeJwtTime', () => {
  it('提取 iat 时间', () => {
    const payload = parseJwt(TOKEN).payload!
    const lines = describeJwtTime(payload)
    expect(lines.some((l) => l.includes('签发 (iat)'))).toBe(true)
  })
  it('非法 JSON 返回空', () => expect(describeJwtTime('nope')).toEqual([]))
})
