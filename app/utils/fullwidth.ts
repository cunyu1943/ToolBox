/**
 * 全角 / 半角转换纯函数（ASCII 区与全角空格）。
 */

/** 全角 → 半角：FF01–FF5E 移到 21–7E，全角空格 3000 → 20 */
export function toHalfWidth(str: string): string {
  return str.replace(/[\uFF01-\uFF5E\u3000]/g, (c) =>
    c === '\u3000' ? ' ' : String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  )
}

/** 半角 → 全角：21–7E 移到 FF01–FF5E，空格 20 → 3000 */
export function toFullWidth(str: string): string {
  return str.replace(/[\u0020\u0021-\u007E]/g, (c) =>
    c === ' ' ? '\u3000' : String.fromCharCode(c.charCodeAt(0) + 0xfee0)
  )
}
