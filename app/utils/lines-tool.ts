/**
 * 行文本处理纯函数：按 \n / \r\n 拆行，逐行操作后重新拼接。
 */

export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/)
}

/** 去除重复行（保留首次出现顺序） */
export function dedupeLines(text: string): string {
  return [...new Set(splitLines(text))].join('\n')
}

/** 删除空行与仅含空白的行 */
export function removeEmptyLines(text: string): string {
  return splitLines(text).filter((l) => l.trim() !== '').join('\n')
}

/** 去除每行首尾空白 */
export function trimLines(text: string): string {
  return splitLines(text).map((l) => l.trim()).join('\n')
}

/** 按字典序排序（localeCompare 以 zh 感知中文拼音外按 Unicode 序，稳定可预期） */
export function sortLines(text: string, desc = false): string {
  const lines = splitLines(text)
  lines.sort((a, b) => (desc ? b.localeCompare(a, 'zh') : a.localeCompare(b, 'zh')))
  return lines.join('\n')
}

/** 反转行序 */
export function reverseLines(text: string): string {
  return splitLines(text).reverse().join('\n')
}

/** 每行加序号前缀，如 "1. foo" */
export function numberLines(text: string, start = 1, sep = '. '): string {
  return splitLines(text).map((l, i) => `${i + start}${sep}${l}`).join('\n')
}

/** 随机打乱行序（传入 rng 便于测试确定性） */
export function shuffleLines(text: string, rng: () => number = Math.random): string {
  const lines = splitLines(text)
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[lines[i], lines[j]] = [lines[j], lines[i]]
  }
  return lines.join('\n')
}
