import { describe, expect, it } from 'vitest'
import { asciiTable, searchAscii } from '../app/utils/ascii-table'

describe('asciiTable', () => {
  it('共 128 项且码号连续', () => {
    expect(asciiTable.length).toBe(128)
    asciiTable.forEach((e, i) => expect(e.code).toBe(i))
  })
  it('控制字符无 char、可打印字符有 char', () => {
    expect(asciiTable[0].kind).toBe('control')
    expect(asciiTable[0].char).toBe('')
    expect(asciiTable[0].name).toBe('NUL')
    expect(asciiTable[65].char).toBe('A')
    expect(asciiTable[127].kind).toBe('control')
  })
  it('空格归为 space', () => {
    expect(asciiTable[32].kind).toBe('space')
    expect(asciiTable[32].name).toBe('Space')
  })
  it('数字/字母中文说明', () => {
    expect(asciiTable[48].zh).toBe('数字')
    expect(asciiTable[97].zh).toBe('小写拉丁字母')
  })
})

describe('searchAscii', () => {
  it('空查询返回全部', () => {
    expect(searchAscii('')).toBe(asciiTable)
  })
  it('按十进制码', () => {
    expect(searchAscii('65').map((e) => e.char)).toEqual(['A'])
  })
  it('按字符', () => {
    expect(searchAscii('a').map((e) => e.code)).toContain(97)
  })
  it('按十六进制', () => {
    expect(searchAscii('0x41').map((e) => e.char)).toEqual(['A'])
  })
  it('按控制字符说明', () => {
    expect(searchAscii('制表').map((e) => e.code)).toEqual([9, 11])
  })
  it('按中文说明', () => {
    expect(searchAscii('回车').map((e) => e.code)).toEqual([13])
  })
})
