import { describe, expect, it } from 'vitest'
import {
  splitWords,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  toConstantCase,
  toTitleCase,
  toSentenceCase
} from '~/utils/naming'

describe('splitWords', () => {
  it('camel 拆分', () => expect(splitWords('getUserHTMLText')).toEqual(['get', 'user', 'html', 'text']))
  it('snake/kebab/空格混合', () => expect(splitWords('foo_bar-baz qux')).toEqual(['foo', 'bar', 'baz', 'qux']))
  it('含数字', () => expect(splitWords('v2Api')).toEqual(['v2', 'api']))
})

describe('命名风格转换', () => {
  const src = 'the quick brown fox'
  it('camelCase', () => expect(toCamelCase(src)).toBe('theQuickBrownFox'))
  it('PascalCase', () => expect(toPascalCase(src)).toBe('TheQuickBrownFox'))
  it('snake_case', () => expect(toSnakeCase(src)).toBe('the_quick_brown_fox'))
  it('kebab-case', () => expect(toKebabCase(src)).toBe('the-quick-brown-fox'))
  it('CONSTANT_CASE', () => expect(toConstantCase(src)).toBe('THE_QUICK_BROWN_FOX'))
  it('Title Case', () => expect(toTitleCase(src)).toBe('The Quick Brown Fox'))
  it('Sentence case', () => expect(toSentenceCase(src)).toBe('The quick brown fox'))
  it('跨风格往返一致', () => expect(toSnakeCase(toCamelCase('hello_world'))).toBe('hello_world'))
})
