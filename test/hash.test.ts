import { describe, expect, it } from 'vitest'
import { bufferToHex, hashText } from '~/utils/hash'

describe('bufferToHex', () => {
  it('逐字节小写补零', () => expect(bufferToHex(new Uint8Array([0, 15, 255]))).toBe('000fff'))
  it('空数组', () => expect(bufferToHex(new Uint8Array([]))).toBe(''))
})

describe('hashText（Web Crypto 已知向量）', () => {
  it('SHA-256 "abc"', async () => {
    expect(await hashText('SHA-256', 'abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })
  it('SHA-1 空串', async () => {
    expect(await hashText('SHA-1', '')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  })
  it('SHA-512 空串', async () => {
    expect(await hashText('SHA-512', '')).toBe(
      'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
    )
  })
  it('中文 UTF-8 编码影响结果', async () => {
    expect(await hashText('SHA-256', '中')).not.toBe(await hashText('SHA-256', 'a'))
  })
  it('MD5 "abc" 与空串已知向量', async () => {
    expect(await hashText('MD5', 'abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(await hashText('MD5', '')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
  it('MD5 中文按 UTF-8', async () => {
    expect(await hashText('MD5', '中')).not.toBe(await hashText('MD5', 'a'))
  })
})
