/**
 * Unicode 转义（\uXXXX）⇄ 原文 纯函数。
 * 按 UTF-16 码元逐个转义，代理对自然拆成两个 \uXXXX，还原时重新配对。
 */

/** 原文 → 转义：非 ASCII 字符转为 \uXXXX，ASCII 保持 */
export function toUnicodeEscape(str: string): string {
  return str.replace(/[^\u0000-\u007F]/g, (ch) =>
    '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0')
  )
}

/** 转义 → 原文：解析 \uXXXX（大小写十六进制均可），未知序列保持原样 */
export function fromUnicodeEscape(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}
