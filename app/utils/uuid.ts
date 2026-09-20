/**
 * UUID 生成纯函数。浏览器优先用 crypto.randomUUID，否则用可注入的 rng 生成 v4。
 */

type Rng = () => number

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, '0')
}

/** 生成 RFC 4122 v4 UUID（小写，含连字符） */
export function uuidV4(rng: Rng = Math.random): string {
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(rng() * 256)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80 // variant 10xx
  const h = [...bytes].map(toHex)
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h
    .slice(8, 10)
    .join('')}-${h.slice(10, 16).join('')}`
}

/** 生成一个 UUID：有原生 API 用原生，否则回退到 uuidV4 */
export function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return uuidV4()
}
