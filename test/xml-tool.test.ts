import { describe, expect, it } from 'vitest'
import { formatXml, minifyXml } from '~/utils/xml-tool'

describe('formatXml', () => {
  it('层级缩进与属性保留', () => {
    const r = formatXml('<a x="1"><b>hi</b><c/></a>')
    expect(r.ok).toBe(true)
    expect(r.output).toBe('<a x="1">\n  <b>hi</b>\n  <c/>\n</a>')
  })

  it('声明/注释/CDATA/DOCTYPE 原样成行', () => {
    const src = '<?xml version="1.0"?><!DOCTYPE note><note><!--c1--><body><![CDATA[a<b>c]]></body></note>'
    const r = formatXml(src)
    expect(r.ok).toBe(true)
    expect(r.output.split('\n')).toEqual([
      '<?xml version="1.0"?>',
      '<!DOCTYPE note>',
      '<note>',
      '  <!--c1-->',
      '  <body>',
      '    <![CDATA[a<b>c]]>',
      '  </body>',
      '</note>'
    ])
  })

  it('标签内多余换行归一并合并为单行元素', () => {
    const r = formatXml('<a\n  x="1"\n  y="2"\n>t</a>')
    expect(r.output).toBe('<a x="1" y="2">t</a>')
  })

  it('配对错误给出行内信息', () => {
    expect(formatXml('<a><b></a>').error).toMatch(/<\/a> 与 <b>/)
    expect(formatXml('<a><b></b>').error).toMatch(/<a> 未闭合/)
    expect(formatXml('</a>').error).toMatch(/没有匹配的开始标签/)
  })

  it('空输入报错', () => {
    expect(formatXml('  ').ok).toBe(false)
  })
})

describe('minifyXml', () => {
  it('压掉标签间空白但保留文本', () => {
    const r = minifyXml('<a>\n  <b>hi</b>\n  <c/>\n</a>')
    expect(r.output).toBe('<a><b>hi</b><c/></a>')
  })

  it('格式化与压缩互为稳定往返', () => {
    const src = '<r><i id="1">甲</i><i id="2">乙</i></r>'
    const fmt = formatXml(src)
    expect(fmt.ok).toBe(true)
    expect(minifyXml(fmt.output).output).toBe(src)
  })

  it('同样校验标签配对', () => {
    expect(minifyXml('<a><b></a>').ok).toBe(false)
  })
})
