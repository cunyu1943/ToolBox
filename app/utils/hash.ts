/**
 * 哈希摘要纯函数：基于 Web Crypto (SubtleCrypto)。
 * 浏览器与 Node 18+ 均提供全局 crypto.subtle，可在单元测试中直接验证。
 * MD5 非原生算法，故不提供（如需请引入专用实现）。
 */

export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

export const HASH_ALGORITHMS: HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

/** Uint8Array → 小写十六进制字符串 */
export function bufferToHex(bytes: Uint8Array): string {
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

/** 计算文本的哈希摘要（UTF-8 编码后），返回十六进制字符串 */
export async function hashText(algorithm: HashAlgorithm, text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest(algorithm, data)
  return bufferToHex(new Uint8Array(digest))
}
