/**
 * AES 加解密内核：`crypto.subtle` 的 PBKDF2 + AES-256-GCM。
 *
 * - **密钥是口令推导出来的**：口令不能直接用，AES 要 256 位密钥。这里用 PBKDF2-SHA256，
 *   salt 每次随机 16 字节并写进载荷，迭代次数默认 210 000（OWASP 对 PBKDF2-SHA256 的建议量级）。
 * - **GCM 的认证标签由 WebCrypto 附在密文尾部**（最后 16 字节），不必单独存；
 *   解密失败统一归因到「口令错 / 载荷被改过」，因为 GCM 自己就能验 integrity。
 * - **IV 必须每次随机、且绝不能同 key 复用**：同口令两次加密出两个不同载荷是特性不是 bug。
 * - 载荷是一串点分字段，方便整段复制：`aes256-gcm.v1.<迭代数>.<saltB64>.<ivB64>.<密文B64>`。
 */

export interface AesOptions {
  password: string
  iterations: number
}

export interface AesFields {
  salt: string
  iv: string
  ciphertext: string
}

export type AesResult =
  | { ok: true; value: string; fields: AesFields; notes: string[] }
  | { ok: false; error: string; notes: string[] }

export interface PayloadInfo {
  ok: boolean
  error?: string
  iterations?: number
  saltBytes?: number
  ivBytes?: number
  /** 含 16 字节认证标签 */
  cipherBytes?: number
  /** 密文可读长度的粗估：GCM 输出长度 = 明文 UTF-8 长度 */
  plainBytes?: number
}

const VERSION = 'aes256-gcm.v1'
const SALT_BYTES = 16
const IV_BYTES = 12
const TAG_BYTES = 16
const HASH = 'SHA-256'
export const AES_DEFAULT_ITERATIONS = 210_000

const subtle = (): SubtleCrypto | undefined => (globalThis.crypto?.subtle as SubtleCrypto | undefined) ?? undefined

const toB64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const fromB64 = (text: string): Uint8Array => {
  const binary = atob(text)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
  return out
}

const noSpace = (value: string): string => value.replace(/\s+/g, '')

export interface CipherWeakness {
  label: string
  detail: string
  severity: 'error' | 'warning' | 'info'
}

/** 环境检查：`crypto.subtle` 只在安全上下文里有 */
export function environmentIssues(): CipherWeakness[] {
  const out: CipherWeakness[] = []
  const loc = globalThis.location
  if (!subtle()) out.push({ label: '当前环境没有 WebCrypto', detail: 'crypto.subtle 不可用，只有 https 或 localhost 才提供', severity: 'error' })
  if (loc && loc.protocol !== 'https:' && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
    out.push({ label: '非安全上下文', detail: `${loc.protocol}//${loc.host} 下 WebCrypto 可能被浏览器关掉`, severity: 'warning' })
  }
  return out
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle()!.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return subtle()!.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: HASH },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function guard(options: AesOptions): string | undefined {
  if (!options.password) return '口令为空'
  if (!Number.isInteger(options.iterations) || options.iterations < 1_000) {
    return `迭代次数要是不小于 1000 的整数（当前 ${options.iterations}）`
  }
  if (options.iterations > 2_000_000) return '迭代次数超过 200 万，浏览器会卡住'
  return undefined
}

export async function encryptText(plain: string, options: AesOptions): Promise<AesResult> {
  const bad = guard(options)
  if (bad) return { ok: false, error: bad, notes: [] }
  if (!subtle()) return { ok: false, error: '当前环境没有 WebCrypto（需要 https 或 localhost）', notes: [] }
  if (!plain) return { ok: false, error: '明文为空：没有内容可加密', notes: [] }
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(options.password, salt, options.iterations)
  const sealed = await subtle()!.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(plain)
  )
  const fields: AesFields = { salt: toB64(salt), iv: toB64(iv), ciphertext: toB64(new Uint8Array(sealed)) }
  return {
    ok: true,
    value: [VERSION, String(options.iterations), fields.salt, fields.iv, fields.ciphertext].join('.'),
    fields,
    notes: [
      `salt ${SALT_BYTES} 字节、IV ${IV_BYTES} 字节都是本次随机生成，已写进载荷`,
      `密文尾部含 ${TAG_BYTES} 字节 GCM 认证标签，所以能鉴别口令错误与载荷被篡改`,
      '同一段明文两次加密会得到两个不同载荷，这是正常的'
    ]
  }
}

export function inspectPayload(payload: string): PayloadInfo {
  const text = noSpace(payload)
  if (!text) return { ok: false, error: '载荷为空' }
  const parts = text.split('.')
  if (parts.length !== 6) {
    return { ok: false, error: `载荷应是 6 段点分字段（${VERSION}.迭代.salt.iv.密文），当前 ${parts.length} 段` }
  }
  const iterations = parts[2] ?? ''
  const salt = parts[3] ?? ''
  const iv = parts[4] ?? ''
  const ciphertext = parts[5] ?? ''
  if (`${parts[0]}.${parts[1]}` !== VERSION) {
    return { ok: false, error: `版本段「${parts[0]}.${parts[1]}」不是本工具写的「${VERSION}」` }
  }
  const count = Number(iterations)
  if (!Number.isInteger(count) || count < 1_000) return { ok: false, error: `迭代次数段「${iterations}」不对` }
  const decode = (value: string): Uint8Array | undefined => {
    try {
      return fromB64(value)
    } catch {
      return undefined
    }
  }
  const saltBytes = decode(salt)
  if (!saltBytes) return { ok: false, error: 'salt 段不是合法 base64，可能被截断了' }
  const ivBytes = decode(iv)
  if (!ivBytes) return { ok: false, error: 'iv 段不是合法 base64，可能被截断了' }
  const body = decode(ciphertext)
  if (!body) return { ok: false, error: '密文段不是合法 base64，可能被截断了' }
  if (body.length < TAG_BYTES) return { ok: false, error: '密文比一个认证标签还短，肯定不完整' }
  return {
    ok: true,
    iterations: count,
    saltBytes: saltBytes.length,
    ivBytes: ivBytes.length,
    cipherBytes: body.length,
    plainBytes: body.length - TAG_BYTES
  }
}

export async function decryptText(payload: string, options: AesOptions): Promise<AesResult> {
  const bad = guard(options)
  if (bad) return { ok: false, error: bad, notes: [] }
  if (!subtle()) return { ok: false, error: '当前环境没有 WebCrypto（需要 https 或 localhost）', notes: [] }
  const info = inspectPayload(payload)
  if (!info.ok) return { ok: false, error: info.error ?? '载荷无法解析', notes: [] }
  const [, , iterations, salt, iv, ciphertext] = noSpace(payload).split('.') as string[]
  const body = fromB64(ciphertext as string)
  const tag = body.slice(body.length - TAG_BYTES)
  const notes = [
    `载荷声明迭代次数 ${iterations}`,
    `密文 ${body.length - TAG_BYTES} 字节 + 认证标签 ${TAG_BYTES} 字节`,
    '口令错误与载荷被改过都表现为同一种失败（GCM 验签不过）'
  ]
  if (Number(iterations) !== options.iterations) {
    notes.push(`你填的迭代次数是 ${options.iterations}，与载荷记录的 ${iterations} 不同：已按载荷里的值推导密钥`)
  }
  try {
    const key = await deriveKey(options.password, fromB64(salt as string), Number(iterations))
    const opened = await subtle()!.decrypt(
      { name: 'AES-GCM', iv: fromB64(iv as string) as unknown as BufferSource },
      key,
      body as unknown as BufferSource
    )
    return {
      ok: true,
      value: new TextDecoder().decode(opened),
      fields: { salt: salt as string, iv: iv as string, ciphertext: ciphertext as string },
      notes: [...notes, `标签十六进制 ${toB64(tag).slice(0, 8)}…（仅用于比对，单独拿出来没用）`]
    }
  } catch {
    return { ok: false, error: '解密失败：口令不对，或载荷被改动过', notes }
  }
}

export const AES_SAMPLES: { label: string; plain: string; password: string }[] = [
  { label: '一句中文', plain: '服务器口令：更换于下周一', password: 'correct horse battery staple' },
  { label: '带结构', plain: '{"host":"db.internal","port":5432}', password: 'ToolBox-2026' },
  { label: '空口令会报错', plain: 'demo', password: '' }
]
