import { describe, expect, it } from 'vitest'
import { morseDecode, morseEncode } from '~/utils/morse'

describe('摩尔斯电码', () => {
  it('SOS 编码', () => expect(morseEncode('SOS').value).toBe('... --- ...'))
  it('大小写不敏感，词间以 / 分隔', () =>
    expect(morseEncode('hello world').value).toBe('.... . .-.. .-.. --- / .-- --- .-. .-.. -..'))
  it('未知字符（中文）如实上报', () => {
    const r = morseEncode('你好 SOS')
    expect(r.unknown).toEqual(['你', '好'])
    expect(r.value).toBe('... --- ...')
  })
  it('解码含词边界', () =>
    expect(morseDecode('.... . .-.. .-.. --- / .-- --- .-. .-.. -..').value).toBe('HELLO WORLD'))
  it('往返一致', () => {
    const src = 'CODE 123 !?'
    expect(morseDecode(morseEncode(src).value).value).toBe(src)
  })
  it('无法识别的电码上报', () => {
    const r = morseDecode('.- ......')
    expect(r.value).toBe('A')
    expect(r.unknown).toEqual(['......'])
  })
})
