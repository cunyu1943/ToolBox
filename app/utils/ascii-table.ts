/**
 * ASCII 码表（0–127）：控制字符名 + 中文说明 + 查询过滤。
 */

export interface AsciiEntry {
  code: number
  /** 可见字符本体；控制字符为空串 */
  char: string
  /** 常用名称/缩写，如 NUL、Space、Digit 0 */
  name: string
  zh: string
  /** 分类 */
  kind: 'control' | 'printable' | 'space'
}

const controlNames: Record<number, [string, string]> = {
  0: ['NUL', '空字符'], 1: ['SOH', '标题开始'], 2: ['STX', '正文开始'], 3: ['ETX', '正文结束'],
  4: ['EOT', '传输结束'], 5: ['ENQ', '询问'], 6: ['ACK', '收到通知'], 7: ['BEL', '响铃'],
  8: ['BS', '退格'], 9: ['HT', '水平制表符 Tab'], 10: ['LF', '换行'], 11: ['VT', '垂直制表符'],
  12: ['FF', '换页'], 13: ['CR', '回车'], 14: ['SO', '移出shift out'], 15: ['SI', '移入shift in'],
  16: ['DLE', '数据链路转义'], 17: ['DC1', '设备控制1（常作 XON）'], 18: ['DC2', '设备控制2'],
  19: ['DC3', '设备控制3（常作 XOFF）'], 20: ['DC4', '设备控制4'], 21: ['NAK', '否定应答'],
  22: ['SYN', '空同步'], 23: ['ETB', '传输块结束'], 24: ['CAN', '取消'], 25: ['EM', '介质结束'],
  26: ['SUB', '替换'], 27: ['ESC', '退出/转义'], 28: ['FS', '文件分隔符'], 29: ['GS', '组分隔符'],
  30: ['RS', '记录分隔符'], 31: ['US', '单元分隔符'], 127: ['DEL', '删除']
}

const printableNames: Record<number, [string, string]> = {
  32: ['Space', '空格'],
  48: ['0', '数字'], 49: ['1', '数字'], 50: ['2', '数字'], 51: ['3', '数字'], 52: ['4', '数字'],
  53: ['5', '数字'], 54: ['6', '数字'], 55: ['7', '数字'], 56: ['8', '数字'], 57: ['9', '数字'],
  65: ['A', '大写拉丁字母'], 90: ['Z', '大写拉丁字母'],
  97: ['a', '小写拉丁字母'], 122: ['z', '小写拉丁字母']
}

export const asciiTable: AsciiEntry[] = Array.from({ length: 128 }, (_, code) => {
  if (code === 32) {
    return { code, char: ' ', name: printableNames[32][0], zh: printableNames[32][1], kind: 'space' as const }
  }
  if (code < 32 || code === 127) {
    const [name, zh] = controlNames[code]
    return { code, char: '', name, zh, kind: 'control' as const }
  }
  const ch = String.fromCharCode(code)
  const known = printableNames[code]
  let zh = '标点/符号'
  if (code >= 48 && code <= 57) zh = '数字'
  else if (code >= 65 && code <= 90) zh = '大写拉丁字母'
  else if (code >= 97 && code <= 122) zh = '小写拉丁字母'
  return { code, char: ch, name: known ? known[0] : ch, zh, kind: 'printable' as const }
})

/** 按十进制/十六进制码、字符、名称、中文说明模糊过滤 */
export function searchAscii(query: string): AsciiEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return asciiTable
  const asNum = /^\d+$/.test(q) ? parseInt(q, 10) : NaN
  const asHex = /^0x[0-9a-f]+$/.test(q) ? parseInt(q.slice(2), 16) : NaN
  return asciiTable.filter(
    (e) =>
      (!Number.isNaN(asNum) && e.code === asNum) ||
      (!Number.isNaN(asHex) && e.code === asHex) ||
      (q.length === 1 && e.char === q) ||
      e.name.toLowerCase().includes(q) ||
      e.zh.includes(q)
  )
}
