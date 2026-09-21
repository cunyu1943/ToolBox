/**
 * AES-GCM 文本加解密（口令加密）。
 * 密文格式：AES-GCM:base64(salt[16] + iv[12] + ciphertext)，
 * 密钥由 PBKDF2-SHA256(100000 次迭代) 从口令派生。
 * 依赖全局 crypto.subtle：浏览器与 Node 18+ 均可在单测中验证。
 */

const PREFIX = 'AES-GCM:'
const SALT_LEN = 16
const IV_LEN = 12
const ITERATIONS = 100_000

function toB64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/** 加密：口令必填；同一明文每次输出不同（随机 salt+iv） */
export async function encryptText(plain: string, password: string): Promise<string> {
  if (!password) throw new Error('请输入口令')
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN))
  const key = await deriveKey(password, salt)
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plain)
  )
  const ctBytes = new Uint8Array(ct)
  const packed = new Uint8Array(salt.length + iv.length + ctBytes.length)
  packed.set(salt, 0)
  packed.set(iv, salt.length)
  packed.set(ctBytes, salt.length + iv.length)
  return PREFIX + toB64(packed)
}

export interface DecryptResult {
  ok: boolean
  output: string
  error: string
}

/** 解密：区分格式错误与口令错误（GCM 认证标签校验失败） */
export async function decryptText(cipher: string, password: string): Promise<DecryptResult> {
  const s = cipher.trim()
  if (!s.startsWith(PREFIX))
    return { ok: false, output: '', error: `密文应以 ${PREFIX} 开头` }
  let packed: Uint8Array
  try {
    packed = fromB64(s.slice(PREFIX.length))
  } catch {
    return { ok: false, output: '', error: 'Base64 解码失败，密文可能被截断' }
  }
  if (packed.length <= SALT_LEN + IV_LEN)
    return { ok: false, output: '', error: '密文长度不足' }
  if (!password) return { ok: false, output: '', error: '请输入口令' }
  try {
    const salt = packed.slice(0, SALT_LEN)
    const iv = packed.slice(SALT_LEN, SALT_LEN + IV_LEN)
    const ct = packed.slice(SALT_LEN + IV_LEN)
    const key = await deriveKey(password, salt)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct as BufferSource
    )
    return { ok: true, output: new TextDecoder().decode(plain), error: '' }
  } catch {
    return { ok: false, output: '', error: '口令错误或密文被篡改（GCM 认证失败）' }
  }
}
