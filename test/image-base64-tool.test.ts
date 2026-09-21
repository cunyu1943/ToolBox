import { describe, expect, it } from 'vitest'
import { base64ByteLength, formatBytes, parseDataUrl } from '../app/utils/image-base64-tool'

describe('parseDataUrl', () => {
  it('解析图片 dataURL', () => {
    const r = parseDataUrl('data:image/png;base64,iVBORw0KGgo=')!
    expect(r.mime).toBe('image/png')
    expect(r.isBase64).toBe(true)
    expect(r.data).toBe('iVBORw0KGgo=')
    expect(r.bytes).toBe(8)
  })
  it('非法输入返回 null', () => {
    expect(parseDataUrl('http://a.com/b.png')).toBeNull()
    expect(parseDataUrl('')).toBeNull()
  })
})

describe('base64ByteLength', () => {
  it('无填充', () => {
    expect(base64ByteLength('QUJD')).toBe(3) // "ABC"
  })
  it('单等号填充', () => {
    expect(base64ByteLength('QUI=')).toBe(2)
  })
  it('等号填充（1 个或 2 个）', () => {
    expect(base64ByteLength('U0g=')).toBe(2)
    expect(base64ByteLength('AB==')).toBe(1)
  })
  it('忽略换行空白', () => {
    expect(base64ByteLength('QUJ\nD')).toBe(3)
  })
  it('非法字符返回 0', () => {
    expect(base64ByteLength('ab!d')).toBe(0)
  })
})

describe('formatBytes', () => {
  it('三档单位', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB')
  })
})
