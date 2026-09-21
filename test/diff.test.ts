import { describe, expect, it } from 'vitest'
import { diffLines, toUnifiedDiff } from '~/utils/diff'

describe('diffLines', () => {
  it('完全相同：全部 same，无增删', () => {
    const r = diffLines('a\nb\nc', 'a\nb\nc')
    expect(r.added).toBe(0)
    expect(r.removed).toBe(0)
    expect(r.unchanged).toBe(3)
    expect(r.lines.every(l => l.op === 'same')).toBe(true)
  })

  it('中间一行被修改：公共前后缀裁剪后得到 del+add', () => {
    const r = diffLines('a\nb\nc', 'a\nB\nc')
    expect(r.added).toBe(1)
    expect(r.removed).toBe(1)
    expect(r.lines.map(l => `${l.op}:${l.text}:${l.oldNo}/${l.newNo}`)).toEqual([
      'same:a:1/1',
      'del:b:2/null',
      'add:B:null/2',
      'same:c:3/3'
    ])
  })

  it('开头插入与末尾删除的行号正确', () => {
    const r = diffLines('x\ny', 'n1\nn2\nx')
    const same = r.lines.find(l => l.op === 'same')
    expect(same).toMatchObject({ text: 'x', oldNo: 1, newNo: 3 })
    expect(r.added).toBe(2)
    expect(r.removed).toBe(1)
  })

  it('空文本边界', () => {
    expect(diffLines('', '').lines).toEqual([])
    const r = diffLines('', 'a\nb')
    expect(r.added).toBe(2)
    expect(r.lines.map(l => l.op)).toEqual(['add', 'add'])
  })

  it('归一化 CRLF 后对比，行内容一致则视为 same', () => {
    const r = diffLines('a\r\nb', 'a\nb')
    expect(r.added).toBe(0)
    expect(r.removed).toBe(0)
  })

  it('超规模输入退化为全删全增但不崩溃', () => {
    const a = Array.from({ length: 1200 }, (_, i) => `a${i}`).join('\n')
    const b = Array.from({ length: 1200 }, (_, i) => `b${i}`).join('\n')
    const r = diffLines(a, b)
    expect(r.added).toBe(1200)
    expect(r.removed).toBe(1200)
  })

  it('toUnifiedDiff 输出前缀符号', () => {
    const u = toUnifiedDiff(diffLines('a\nb', 'a\nc'))
    expect(u.split('\n')).toEqual(['  a', '- b', '+ c'])
  })
})
