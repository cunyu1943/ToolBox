/**
 * 哈希摘要纯函数：SHA 系列基于 Web Crypto (SubtleCrypto)，
 * 浏览器与 Node 18+ 均可在单元测试中直接验证；
 * MD5 非 SubtleCrypto 算法，由 js-md5 纯 JS 实现补齐。
 */

import { md5 } from 'js-md5'

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

export const HASH_ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

/** Uint8Array → 小写十六进制字符串 */
export function bufferToHex(bytes: Uint8Array): string {
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

/** 计算文本的哈希摘要（UTF-8 编码后），返回十六进制字符串 */
export async function hashText(algorithm: HashAlgorithm, text: string): Promise<string> {
  if (algorithm === 'MD5') return md5(text)
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest(algorithm, data)
  return bufferToHex(new Uint8Array(digest))
}
