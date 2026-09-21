import { describe, expect, it } from 'vitest'
import { buildUrl, parseUrl } from '~/utils/url-tool'

describe('URL 解析与重建', () => {
  it('完整拆解各部分', () => {
    const r = parseUrl('https://example.com:8443/a/b?x=1&y=你好&x=2#sec')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parts.protocol).toBe('https:')
    expect(r.parts.hostname).toBe('example.com')
    expect(r.parts.port).toBe('8443')
    expect(r.parts.path).toBe('/a/b')
    expect(r.parts.params).toEqual([
      { key: 'x', value: '1' },
      { key: 'y', value: '你好' },
      { key: 'x', value: '2' }
    ])
    expect(r.parts.hash).toBe('sec')
  })
  it('无协议时自动按 https 补全', () => {
    const r = parseUrl('tool.lu/search?q=cron')
    expect(r.ok && r.parts.protocol).toBe('https:')
  })
  it('编辑参数后重建', () => {
    const r = parseUrl('https://a.cn/p?id=7')
    if (!r.ok) throw new Error('unreachable')
    r.parts.params = [{ key: 'id', value: '8' }, { key: 'debug', value: '1' }]
    expect(buildUrl(r.parts)).toBe('https://a.cn/p?id=8&debug=1')
  })
  it('往返一致（含编码字符）', () => {
    const raw = 'https://ex.com/path%20a?q=%E4%BD%A0#top'
    const r = parseUrl(raw)
    if (!r.ok) throw new Error('unreachable')
    expect(buildUrl(r.parts)).toBe(raw)
  })
  it('非法输入报错而非抛异常', () => {
    expect(parseUrl('http://').ok).toBe(false)
    expect(parseUrl('   ').ok).toBe(false)
  })
  it('根路径补斜杠', () => {
    const r = parseUrl('https://x.dev')
    expect(r.ok && r.parts.path).toBe('/')
    expect(r.ok && buildUrl({ ...r.parts, params: [], hash: '' })).toBe('https://x.dev/')
  })
})
