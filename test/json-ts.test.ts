import { describe, it, expect } from 'vitest'
import { jsonToTs } from '~/utils/json-ts'

describe('utils/json-ts 生成接口', () => {
  it('顶层对象生成 interface，基本类型正确映射', () => {
    const ts = jsonToTs('{"id":1,"name":"a","ok":true,"nil":null}')
    expect(ts).toContain('interface Root {')
    expect(ts).toContain('  id: number;')
    expect(ts).toContain('  name: string;')
    expect(ts).toContain('  ok: boolean;')
    expect(ts).toContain('  nil: null;')
    expect(ts).not.toContain('export type Root =')
  })
  it('嵌套对象生成独立接口并按 父名+键名 命名', () => {
    const ts = jsonToTs('{"user":{"age":1}}')
    expect(ts).toContain('interface Root {')
    expect(ts).toContain('  user: RootUser;')
    expect(ts).toContain('interface RootUser {')
    expect(ts).toContain('  age: number;')
  })
  it('同构数组归并为单一接口类型', () => {
    const ts = jsonToTs('{"tags":[{"k":"a","v":1},{"k":"b","v":2}]}')
    expect(ts).toContain('  tags: RootTag[];')
    expect(ts).toContain('interface RootTag {')
    expect(ts.match(/interface RootTag/g)?.length).toBe(1)
    expect(ts).toContain('  k: string;')
    expect(ts).toContain('  v: number;')
  })
  it('数组样本间缺失的键标记为可选', () => {
    const ts = jsonToTs('[{"a":1},{"a":2,"b":"x"}]')
    expect(ts).toContain('interface RootItem {')
    expect(ts).toContain('  a: number;')
    expect(ts).toContain('  b?: string;')
    expect(ts).toContain('export type Root = RootItem[]')
  })
  it('混合类型数组生成联合元素类型', () => {
    const ts = jsonToTs('{"mix":[1,"a"]}')
    expect(ts).toContain('  mix: (number | string)[];')
  })
  it('空数组为 unknown[]，空对象无字段', () => {
    const ts = jsonToTs('{"arr":[],"obj":{}}')
    expect(ts).toContain('  arr: unknown[];')
    expect(ts).toContain('interface RootObj {\n}')
  })
  it('非法键名加引号，重名接口自动加序号', () => {
    const ts = jsonToTs('{"a-b":{"x":1},"ab":{"x":2}}')
    expect(ts).toContain('  "a-b": RootAb;')
    expect(ts).toContain('interface RootAb {')
    expect(ts).toContain('  ab: RootAb2;')
    expect(ts).toContain('interface RootAb2 {')
  })
  it('非法 JSON 与空输入报错', () => {
    expect(() => jsonToTs('')).toThrow('请输入 JSON 内容')
    expect(() => jsonToTs('{bad}')).toThrow('JSON 解析失败')
  })
  it('顶层标量生成类型别名', () => {
    expect(jsonToTs('42')).toBe('export type Root = number')
  })
})
