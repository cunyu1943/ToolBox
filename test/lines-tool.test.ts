import { describe, expect, it } from 'vitest'
import {
  dedupeLines,
  numberLines,
  removeEmptyLines,
  reverseLines,
  shuffleLines,
  sortLines,
  splitLines,
  trimLines
} from '../app/utils/lines-tool'

describe('splitLines', () => {
  it('兼容 \\n、\\r\\n、\\r', () => {
    expect(splitLines('a\r\nb\rc\nd')).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('dedupeLines', () => {
  it('去重并保留首次顺序', () => {
    expect(dedupeLines('b\na\nb\nc\na')).toBe('b\na\nc')
  })
})

describe('removeEmptyLines', () => {
  it('删除空行与纯空白行', () => {
    expect(removeEmptyLines('a\n\n  \nb\n')).toBe('a\nb')
  })
})

describe('trimLines', () => {
  it('去除每行首尾空白', () => {
    expect(trimLines('  a  \n\tb\t')).toBe('a\nb')
  })
})

describe('sortLines', () => {
  it('升序', () => {
    expect(sortLines('c\na\nb')).toBe('a\nb\nc')
  })
  it('降序', () => {
    expect(sortLines('c\na\nb', true)).toBe('c\nb\na')
  })
})

describe('reverseLines', () => {
  it('反转行序', () => {
    expect(reverseLines('a\nb\nc')).toBe('c\nb\na')
  })
})

describe('numberLines', () => {
  it('默认从 1 开始', () => {
    expect(numberLines('a\nb')).toBe('1. a\n2. b')
  })
  it('自定义起始与分隔符', () => {
    expect(numberLines('a\nb', 3, ') ')).toBe('3) a\n4) b')
  })
})

describe('shuffleLines', () => {
  it('确定性 rng 下可复现', () => {
    const half = () => 0.5
    expect(shuffleLines('a\nb\nc', half).split('\n').sort()).toEqual(['a', 'b', 'c'])
  })
  it('rng=0 时结果仍是原集合的排列', () => {
    const out = shuffleLines('a\nb\nc\nd', () => 0)
    expect(out.split('\n').sort().join('')).toBe('abcd')
  })
})
