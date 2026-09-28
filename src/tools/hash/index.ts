export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

export const hashAlgorithms: { id: HashAlgorithm; label: string; note: string; webcrypto: boolean }[] = [
  { id: 'MD5', label: 'MD5', note: '128 位，本地实现；仅用于校验和，勿用于安全场景', webcrypto: false },
  { id: 'SHA-1', label: 'SHA-1', note: '160 位，已不推荐用于签名', webcrypto: true },
  { id: 'SHA-256', label: 'SHA-256', note: '256 位，JWT / Git 常用', webcrypto: true },
  { id: 'SHA-384', label: 'SHA-384', note: '384 位', webcrypto: true },
  { id: 'SHA-512', label: 'SHA-512', note: '512 位', webcrypto: true }
]

const SHIFT = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
  14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21, 6, 10, 15, 21
]

const K = Array.from({ length: 64 }, (_, i) => Math.floor(2 ** 32 * Math.abs(Math.sin(i + 1))) >>> 0)

const rotl = (value: number, count: number): number => (value << count) | (value >>> (32 - count))

const hexLittleEndian = (word: number): string => {
  let out = ''
  for (let i = 0; i < 4; i += 1) out += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')
  return out
}

/** 紧凑 MD5（RFC 1321）：Web Crypto 不提供 MD5，故本地实现。 */
export function md5(text: string): string {
  const bytes = Array.from(new TextEncoder().encode(text))
  const bitLength = bytes.length * 8

  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0x00)
  const tail = new DataView(new ArrayBuffer(8))
  tail.setUint32(0, bitLength >>> 0, true)
  tail.setUint32(4, Math.floor(bitLength / 2 ** 32), true)
  for (let i = 0; i < 8; i += 1) bytes.push(tail.getUint8(i))

  let a0 = 0x67452301 >>> 0
  let b0 = 0xefcdab89 >>> 0
  let c0 = 0x98badcfe >>> 0
  let d0 = 0x10325476 >>> 0
  const m = new Uint32Array(16)

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      const p = offset + i * 4
      m[i] = (bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24)) >>> 0
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let i = 0; i < 64; i += 1) {
      let f = 0
      let g = 0
      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }
      f = (f + a + K[i] + m[g]) >>> 0
      a = d
      d = c
      c = b
      b = (b + rotl(f, SHIFT[i])) >>> 0
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  return hexLittleEndian(a0) + hexLittleEndian(b0) + hexLittleEndian(c0) + hexLittleEndian(d0)
}

async function webDigest(algorithm: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buffer = await crypto.subtle.digest(algorithm, data)
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export interface DigestResult {
  algorithm: HashAlgorithm
  ok: boolean
  hex: string
  error?: string
}

export async function digestAll(text: string): Promise<DigestResult[]> {
  const results = await Promise.all(
    hashAlgorithms.map(async (algorithm): Promise<DigestResult> => {
      try {
        const hex = algorithm.webcrypto
          ? await webDigest(algorithm.id, text)
          : md5(text)
        return { algorithm: algorithm.id, ok: true, hex }
      } catch (cause) {
        return {
          algorithm: algorithm.id,
          ok: false,
          hex: '',
          error: cause instanceof Error ? cause.message : String(cause)
        }
      }
    })
  )
  return results
}

/** 摘要位数，用于展示「N bit / M 个十六进制字符」。 */
export const bitLengthOf = (algorithm: HashAlgorithm): number =>
  algorithm === 'MD5' ? 128 : Number(algorithm.split('-')[1])
