import { describe, expect, it } from 'vitest'
import { jsonToYaml, yamlToJson } from '~/utils/yaml-tool'

describe('yamlToJson', () => {
  it('解析嵌套结构', () => {
    const r = yamlToJson('name: toolbox\nitems:\n  - a\n  - b\nnested:\n  k: 1')
    expect(r.ok).toBe(true)
    expect(JSON.parse(r.output)).toEqual({ name: 'toolbox', items: ['a', 'b'], nested: { k: 1 } })
  })

  it('语法错误给出行列信息', () => {
    const r = yamlToJson('a: [1, 2\nb: 3')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/行第 \d+ 列/)
  })

  it('空输入与空文档', () => {
    expect(yamlToJson('').ok).toBe(false)
    expect(yamlToJson('   ').error).toContain('请输入')
  })
})

describe('jsonToYaml', () => {
  it('输出 YAML 且可往返', () => {
    const src = '{"a":1,"b":["x","y"]}'
    const y = jsonToYaml(src)
    expect(y.ok).toBe(true)
    expect(y.output).toBe("a: 1\nb:\n  - x\n  - 'y'")
    expect(JSON.parse(yamlToJson(y.output).output)).toEqual(JSON.parse(src))
  })

  it('非法 JSON 报错', () => {
    const r = jsonToYaml('{bad json}')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('JSON 不合法')
  })
})
