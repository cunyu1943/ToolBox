import { describe, expect, it } from 'vitest'
import { parseCsv, csvToJson, jsonToCsv } from '~/utils/csv'

describe('parseCsv', () => {
  it('基础', () => expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]))
  it('引号内逗号不分列', () => expect(parseCsv('x,"a,b",c')).toEqual([['x', 'a,b', 'c']]))
  it('转义双引号', () => expect(parseCsv('"say ""hi"""')).toEqual([['say "hi"']]))
  it('引号内换行', () => expect(parseCsv('"l1\nl2",b')).toEqual([['l1\nl2', 'b']]))
  it('CRLF', () => expect(parseCsv('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]))
  it('Tab 分隔', () => expect(parseCsv('a\tb\n1\t2', '\t')).toEqual([['a', 'b'], ['1', '2']]))
})

describe('csvToJson', () => {
  it('表头生成对象数组', () =>
    expect(csvToJson('name,age\nTom,20')).toBe('[\n  {\n    "name": "Tom",\n    "age": "20"\n  }\n]'))
  it('无表头生成二维数组', () =>
    expect(csvToJson('a,b\n1,2', { header: false })).toBe('[\n  [\n    "a",\n    "b"\n  ],\n  [\n    "1",\n    "2"\n  ]\n]'))
})

describe('jsonToCsv', () => {
  it('对象数组带表头', () =>
    expect(jsonToCsv('[{"a":1,"b":2},{"a":3,"b":4}]')).toBe('a,b\n1,2\n3,4'))
  it('缺字段补空', () =>
    expect(jsonToCsv('[{"a":1},{"b":2}]')).toBe('a,b\n1,\n,2'))
  it('含逗号/引号字段加引号', () =>
    expect(jsonToCsv('[{"x":"a,b"}]')).toBe('x\n"a,b"'))
  it('二维数组', () => expect(jsonToCsv('[["h1","h2"],["v1","v2"]]')).toBe('h1,h2\nv1,v2'))
  it('往返', () => expect(jsonToCsv(csvToJson('a,b\n1,2', { header: true }))).toBe('a,b\n1,2'))
  it('非数组抛错', () => expect(() => jsonToCsv('{"a":1}')).toThrow())
})
