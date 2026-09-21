import { describe, it, expect } from 'vitest'
import { detectDelimiter, parseTableInput, buildMarkdownTable, generateMarkdownTable } from '~/utils/markdown-table'

describe('utils/markdown-table 分隔符与解析', () => {
  it('自动探测 Tab / 逗号 / 分号 / 竖线，回退连续空格', () => {
    expect(detectDelimiter('a\tb\nc\td')).toBe('\t')
    expect(detectDelimiter('a,b\nc,d')).toBe(',')
    expect(detectDelimiter('a;b\nc;d')).toBe(';')
    expect(detectDelimiter('a|b\nc|d')).toBe('|')
    expect(detectDelimiter('a  b\nc  d')).toBe('  ')
  })
  it('连续空格模式按两空格以上切列并去首尾空白', () => {
    expect(parseTableInput(' 名称   数量 \n苹果  3', '  ')).toEqual([['名称', '数量'], ['苹果', '3']])
  })
  it('忽略空行与全空行', () => {
    const rows = parseTableInput('a,b\n\n  \nc,d\n', ',')
    expect(rows).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('逗号模式支持引号包裹字段', () => {
    expect(parseTableInput('a,"b,c"\n1,2', ',')[0]).toEqual(['a', 'b,c'])
  })
})

describe('utils/markdown-table 生成', () => {
  it('基础表格：表头 + 分隔行 + 数据行，按列宽补白', () => {
    const md = buildMarkdownTable([['Name', 'Qty'], ['apple', '3']])
    expect(md).toBe('| Name  | Qty |\n| ----- | --- |\n| apple | 3   |')
  })
  it('对齐分隔行：居左 ---、居中 :---:、居右 --:', () => {
    const md = buildMarkdownTable([['a', 'b', 'c'], ['1', '2', '3']], {
      alignments: ['left', 'center', 'right']
    })
    const sep = md.split('\n')[1]
    expect(sep).toBe('| --- | :-: | --: |')
  })
  it('单元格内竖线转义、换行转 <br>、反斜杠先转义', () => {
    const md = buildMarkdownTable([['x'], ['a|b'], ['l1\nl2'], ['c\\d']])
    const lines = md.split('\n').map((l) => l.replace(/ +\|/, ' |'))
    expect(lines.some((l) => l.includes('a\\|b'))).toBe(true)
    expect(md).toContain('l1<br>l2')
    expect(md).toContain('c\\\\d')
  })
  it('缺列的行自动补空单元格', () => {
    const md = buildMarkdownTable([['a', 'b', 'c'], ['1']])
    expect(md.split('\n')[2]).toBe('| 1   |     |     |')
  })
  it('pad=false 时不补白', () => {
    const md = buildMarkdownTable([['Name', 'Q'], ['apple', '3']], { pad: false })
    expect(md).toBe('| Name | Q |\n| ----- | --- |\n| apple | 3 |')
  })
})

describe('utils/markdown-table 一步生成', () => {
  it('Tab 文本自动转表格', () => {
    const md = generateMarkdownTable('城市\t人口\n杭州\t1200')
    expect(md.split('\n')).toHaveLength(3)
    expect(md.split('\n')[0].replace(/\s+/g, ' ')).toBe('| 城市 | 人口 |')
  })
  it('指定分隔符覆盖自动探测', () => {
    const md = generateMarkdownTable('a;b\nc;d', { delimiter: ';', pad: false })
    expect(md).toContain('| a | b |')
  })
  it('空输入与无数据行报错', () => {
    expect(() => generateMarkdownTable('')).toThrow('请输入表格数据')
    expect(() => generateMarkdownTable(' ,  ')).toThrow('未解析到任何数据行')
  })
})
