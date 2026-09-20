import { describe, expect, it } from 'vitest'
import { formatJson, minifyJson, validateJson } from '~/utils/json-tool'

describe('formatJson', () => {
  it('美化缩进', () => expect(formatJson('{"a":1,"b":[1,2]}').output).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}'))
  it('自定义缩进 4', () => expect(formatJson('{"a":1}', 4).output).toBe('{\n    "a": 1\n}'))
  it('合法数组', () => expect(formatJson('[1,2]').ok).toBe(true))
  it('非法给出行列提示', () => {
    const r = formatJson('{"a":1,,}')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('第 1 行')
  })
  it('空输入', () => expect(formatJson('   ').error).toBe('输入为空'))
})

describe('minifyJson', () => {
  it('去除空白', () => expect(minifyJson('{ "a" : 1 }').output).toBe('{"a":1}'))
  it('非法报错', () => expect(minifyJson('{a:1}').ok).toBe(false))
})

describe('validateJson', () => {
  it('合法', () => expect(validateJson('{"a":1}').ok).toBe(true))
  it('非法', () => expect(validateJson('nope').ok).toBe(false))
})
