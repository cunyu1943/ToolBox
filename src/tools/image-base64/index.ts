/** 图片转 Base64：FileReader 读取、体积估算、尺寸探测与常用引用片段。 */

export const MAX_BYTES = 5 * 1024 * 1024

export interface ImagePayload {
  name: string
  mime: string
  /** 原始字节数 */
  size: number
  dataUrl: string
  /** 去掉 data URL 前缀后的纯 Base64 */
  base64: string
}

export type ReadResult = { ok: true; payload: ImagePayload } | { ok: false; error: string }

export interface ImageInfo {
  width: number
  height: number
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes
  let unit = 'B'
  for (const next of units) {
    if (value < 1024) break
    value /= 1024
    unit = next
  }
  return `${Math.round(value * 100) / 100} ${unit}`
}

/** Base64 每 3 字节展开成 4 个字符 */
export const base64SizeOf = (bytes: number): number => Math.ceil(bytes / 3) * 4

/** 图片体积 ×4/3 后仍在 URL 属性里常见的可用上限，超出即提示改用文件引用 */
export const isImpracticallyLarge = (dataUrlLength: number): boolean => dataUrlLength > 2 * 1024 * 1024

export function parseDataUrl(input: string): { mime: string; base64: string } | null {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/is.exec(input.trim())
  if (!match) return null
  const [, mime, encoded, body] = match
  if (!encoded) return null
  return { mime: mime || 'text/plain', base64: body!.replace(/\s/g, '') }
}

export function readFileAsDataUrl(file: File): Promise<ReadResult> {
  if (!file.type.startsWith('image/'))
    return Promise.resolve({ ok: false, error: `「${file.name}」不是图片（${file.type || '未知类型'}）` })
  if (file.size === 0) return Promise.resolve({ ok: false, error: `「${file.name}」是空文件` })
  if (file.size > MAX_BYTES)
    return Promise.resolve({
      ok: false,
      error: `「${file.name}」${formatBytes(file.size)}，超过 ${formatBytes(MAX_BYTES)} 上限`
    })

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve({ ok: false, error: `读取「${file.name}」失败` })
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      const comma = dataUrl.indexOf(',')
      resolve({
        ok: true,
        payload: {
          name: file.name,
          mime: file.type,
          size: file.size,
          dataUrl,
          base64: dataUrl.slice(comma + 1)
        }
      })
    }
    reader.readAsDataURL(file)
  })
}

/** 用 <img> 解码 data URL 取自然尺寸；隐藏标签页里也可能失败，因此带超时 */
export function probeImageSize(dataUrl: string, timeoutMs = 3000): Promise<ImageInfo | null> {
  return new Promise((resolve) => {
    const image = new Image()
    let settled = false
    const finish = (value: ImageInfo | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      image.onload = null
      image.onerror = null
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    image.onload = () => finish({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => finish(null)
    image.src = dataUrl
  })
}

export interface Snippets {
  html: string
  css: string
  markdown: string
  /** 只给出前缀，用于展示 data URL 的结构 */
  header: string
}

export function buildSnippets(dataUrl: string, alt = '图片'): Snippets {
  const parsed = parseDataUrl(dataUrl)
  return {
    html: `<img src="${dataUrl}" alt="${alt}" />`,
    css: `background-image: url("${dataUrl}");`,
    markdown: `![${alt}](${dataUrl})`,
    header: parsed ? `data:${parsed.mime};base64,` : 'data:…;base64,'
  }
}
