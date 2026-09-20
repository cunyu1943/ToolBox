import { describe, expect, it } from 'vitest'
import {
  base64Encode,
  base64Decode,
  base32Encode,
  base32Decode,
  urlEncode,
  urlDecode,
  htmlEscape,
  htmlUnescape,
  unicodeEscape,
  unicodeUnescape
} from '~/utils/encoding'

describe('Base64', () => {
  it('ASCII 往返', () => expect(base64Decode(base64Encode('Hello, World!'))).toBe('Hello, World!'))
  it('中文 UTF-8 往返', () => expect(base64Decode(base64Encode('你好，世界'))).toBe('你好，世界'))
  it('空串', () => expect(base64Encode('')).toBe(''))
  it('已知向量', () => expect(base64Encode('Man')).toBe('TWFu'))
  it('中文已知向量', () => expect(base64Encode('你好')).toBe('5L2g5aW9'))
  it('非法输入抛错', () => expect(() => base64Decode('not base64!!')).toThrow())
})

describe('Base32', () => {
  it('RFC4648 已知向量 foo', () => expect(base32Encode('foo')).toBe('MZXW6==='))
  it('RFC4648 已知向量 Hello World', () =>
    expect(base32Encode('Hello World')).toBe('JBSWY3DPEBLW64TMMQ======'))
  it('往返', () => expect(base32Decode(base32Encode('你好，Base32'))).toBe('你好，Base32'))
  it('忽略大小写与填充', () => expect(base32Decode('mzxw6===')).toBe('foo'))
  it('非法字符抛错', () => expect(() => base32Decode('0189')).toThrow())
})

describe('URL 组件', () => {
  it('编码空格与中文', () => expect(urlEncode('a b中')).toBe('a%20b%E4%B8%AD'))
  it('往返', () => expect(urlDecode(urlEncode('?x=1&y=中文'))).toBe('?x=1&y=中文'))
})

describe('HTML 实体', () => {
  it('转义特殊字符', () =>
    expect(htmlEscape('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;'))
  it('反转命名实体', () => expect(htmlUnescape('&lt;&amp;&gt;&quot;&#39;')).toBe('<&>"\''))
  it('反转数字实体', () => expect(htmlUnescape('&#65;&#x42;')).toBe('AB'))
  it('往返', () => expect(htmlUnescape(htmlEscape(`<div class="a">Tom & Jerry's</div>`))).toBe(`<div class="a">Tom & Jerry's</div>`))
})

describe('Unicode 转义', () => {
  it('非 ASCII 转义', () => expect(unicodeEscape('中A文')).toBe('\\u4e2dA\\u6587'))
  it('ASCII 保持不变', () => expect(unicodeEscape('abc')).toBe('abc'))
  it('往返', () => expect(unicodeUnescape(unicodeEscape('中文 hello'))).toBe('中文 hello'))
  it('代理对往返', () => expect(unicodeUnescape(unicodeEscape('😀'))).toBe('😀'))
})
