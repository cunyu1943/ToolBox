/**
 * ASCII 码表（0 ~ 127）内核：字符、名称、中文说明、常见用途，以及一个码位的多进制/多语境写法。
 *
 * 表本身由码位规则生成（0–31 与 127 是控制字符，32 是空格，33–126 可打印），
 * 只对少数值得解释的码位挂 `hint`。128–255 属于 Latin-1 / Unicode 区间，
 * 依赖具体编码，故不在此表内，页面上如实说明。
 */

export type AsciiKind = 'control' | 'space' | 'printable'

export interface AsciiEntry {
  code: number
  /** 可打印字符本体；控制字符为空串 */
  char: string
  /** 常用名称或缩写，如 NUL、Space、Digit 0 */
  name: string
  zh: string
  kind: AsciiKind
  /** 只有值得解释的码位才有 */
  hint?: string
}

const CONTROL_NAMES: Record<number, [string, string]> = {
  0: ['NUL', '空字符'], 1: ['SOH', '标题开始'], 2: ['STX', '正文开始'], 3: ['ETX', '正文结束'],
  4: ['EOT', '传输结束'], 5: ['ENQ', '询问'], 6: ['ACK', '确认应答'], 7: ['BEL', '响铃'],
  8: ['BS', '退格'], 9: ['HT', '水平制表符 Tab'], 10: ['LF', '换行'], 11: ['VT', '垂直制表符'],
  12: ['FF', '换页'], 13: ['CR', '回车'], 14: ['SO', '移出（shift out）'], 15: ['SI', '移入（shift in）'],
  16: ['DLE', '数据链路转义'], 17: ['DC1', '设备控制 1（常作 XON）'], 18: ['DC2', '设备控制 2'],
  19: ['DC3', '设备控制 3（常作 XOFF）'], 20: ['DC4', '设备控制 4'], 21: ['NAK', '否定应答'],
  22: ['SYN', '空同步'], 23: ['ETB', '传输块结束'], 24: ['CAN', '取消'], 25: ['EM', '介质结束'],
  26: ['SUB', '替换'], 27: ['ESC', '转义'], 28: ['FS', '文件分隔符'], 29: ['GS', '组分隔符'],
  30: ['RS', '记录分隔符'], 31: ['US', '单元分隔符'], 127: ['DEL', '删除']
}

const HINTS: Record<number, string> = {
  0: 'C 系字符串的结束符；文本文件里出现 NUL 通常意味着写入被截断或有填充区',
  7: '终端会响铃；日志里混进 BEL 多半是进度条或补全脚本的残留',
  9: '缩进首选还是空格要按项目约定；`git diff` 对 Tab 宽度敏感',
  10: 'Unix 行结束符。Windows 写成 CRLF（13 后跟 10），老式 Mac 只用 13',
  11: 'JS 里写作 `\\v`，JSON 字符串中必须以 `\\u000b` 转义',
  12: '打印分页符；PDF 与报表导出仍会用到',
  13: '单独出现时多为 Windows 换行残留，编辑器里显示成 `^M`',
  27: 'ANSI/VT 转义序列的开头（ESC [ …m 上颜色），也是 Vim 的退出键',
  31: '少数协议（如某些日志格式）拿它当字段分隔，肉眼看不见但会破坏 CSV 解析',
  32: '唯一的「空白类可打印」码位；全角空格是 U+3000，不在此表内',
  45: '连字符减号 `-`；真正的数学减号是 U+2212，排版工具里别混用',
  39: "撇号 / 单引号 '，HTML 里可写成 &apos; 或数字引用 &#39;",
  34: '双引号；HTML 内嵌属性时需要转义为 `&quot;`',
  38: '与号；HTML 里必须写成 `&amp;`，否则实体解析会错位',
  92: '反斜杠是转义符本身：JS 字符串里要写 `\\\\`，正则里也要转义',
  127: '键盘上的 Backspace 实际发送 DEL（0x7F），这是 ASCII 里少数的历史遗留'
}

const NAMED_ENTITIES: Record<number, string> = {
  34: '&quot;', 38: '&amp;', 39: '&apos;', 60: '&lt;', 62: '&gt;'
}

export const asciiTable: AsciiEntry[] = Array.from({ length: 128 }, (_, code) => {
  if (code === 32) {
    return { code, char: ' ', name: 'Space', zh: '空格', kind: 'space' as const, hint: HINTS[32] }
  }
  if (code < 32 || code === 127) {
    const [name, zh] = CONTROL_NAMES[code] ?? ['—', '未命名控制字符']
    return { code, char: '', name, zh, kind: 'control' as const, hint: HINTS[code] }
  }
  const ch = String.fromCharCode(code)
  let zh = '标点 / 符号'
  let name = ch
  if (code >= 48 && code <= 57) {
    zh = '数字'
    name = `Digit ${ch}`
  } else if (code >= 65 && code <= 90) {
    zh = '大写拉丁字母'
    name = ch
  } else if (code >= 97 && code <= 122) {
    zh = '小写拉丁字母'
    name = ch
  }
  return { code, char: ch, name, zh, kind: 'printable' as const, hint: HINTS[code] }
})

export function asciiByCode(code: number): AsciiEntry | undefined {
  return asciiTable[code]
}

/** 控制字符对应的键盘组合：Ctrl+字母（0 与 127 有别名） */
export function ctrlCombo(code: number): string {
  if (code === 0) return 'Ctrl+Space 或 Ctrl+@'
  if (code < 32) return `Ctrl+${String.fromCharCode(code + 64)}`
  if (code === 28) return 'Ctrl+\\ 或 Ctrl+2'
  if (code === 29) return 'Ctrl+] 或 Ctrl+3'
  if (code === 30) return 'Ctrl+^^ 或 Ctrl+6'
  if (code === 31) return 'Ctrl+_ 或 Ctrl+7'
  if (code === 127) return 'Ctrl+/ 或 Backspace'
  return '—'
}

export interface AsciiFormat {
  label: string
  value: string
  note?: string
}

/** 同一个码位在各种语境下的写法 */
export function formatsFor(code: number): AsciiFormat[] {
  const entry = asciiTable[code]
  const ch = entry?.char ?? ''
  const hex = code.toString(16).toUpperCase().padStart(2, '0')
  const bin = code.toString(2).padStart(8, '0')
  return [
    { label: '十进制', value: String(code), note: 'HTML 数字引用与 `charCodeAt` 用的就是它' },
    { label: '十六进制', value: `0x${hex}`, note: 'C / JS / 颜色值里最常见' },
    { label: '八进制', value: `0${code.toString(8).padStart(3, '0')}`, note: 'C 转义与文件权限同一种基数' },
    { label: '二进制', value: `${bin.slice(0, 4)} ${bin.slice(4)}`, note: '最高位恒为 0，这是「7 位码」的由来' },
    { label: 'Unicode 码点', value: `U+00${hex}`, note: '与 ISO-8859-1 同值' },
    { label: 'HTML 数字引用', value: `&#${code}; / &#x${hex};`, note: '不写分号会解析错位' },
    { label: 'HTML 命名实体', value: NAMED_ENTITIES[code] ?? '—', note: NAMED_ENTITIES[code] ? undefined : '只有 5 个字符有命名实体（另外 nbsp 等都不是 ASCII）' },
    { label: 'CSS 转义', value: `\\${code.toString(16)} `, note: '后面那个空格是终止符，不能省' },
    { label: 'URL 百分号编码', value: `%${hex}`, note: code === 32 ? '表单里空格更常写成 `+`' : undefined },
    { label: 'JS 字符串', value: `'\\u00${hex}'`, note: '单引号 39 与反斜杠 92 需要额外转义' },
    { label: 'UTF-8 字节', value: hex, note: 'ASCII 区间单字节，与 ISO-8859-1 一致' },
    { label: 'UTF-16LE 字节', value: `${hex} 00`, note: '小端序低字节在前，BOM 是 FF FE' },
    { label: '字符', value: ch || '（不可打印）', note: entry?.kind === 'control' ? ctrlCombo(code) : undefined }
  ]
}

export type AsciiFilter = 'all' | AsciiKind

export interface AsciiQuery {
  text: string
  filter: AsciiFilter
}

/**
 * 支持：十进制（`65`）、十六进制（`0x41` / `41h`）、`U+0041`、`&#65;`、单个字符本身、
 * 名称（NUL/Tab/newline 等）与中文说明子串。
 */
export function searchAscii({ text, filter }: AsciiQuery): AsciiEntry[] {
  const base = asciiTable.filter((entry) => filter === 'all' || entry.kind === filter)
  const query = text.trim().toLowerCase()
  if (!query) return base

  let exactCode = Number.NaN
  const codePatterns: [RegExp, (match: RegExpExecArray) => number][] = [
    [/^\d{1,3}$/, (match) => Number.parseInt(match[0] as string, 10)],
    [/^0x([0-9a-f]{1,2})$/, (match) => Number.parseInt(match[1] as string, 16)],
    [/^([0-9a-f]{1,2})h$/, (match) => Number.parseInt(match[1] as string, 16)],
    [/^u\+0*([0-9a-f]{1,4})$/, (match) => Number.parseInt(match[1] as string, 16)],
    [/^&#x([0-9a-f]{1,2});?$/, (match) => Number.parseInt(match[1] as string, 16)],
    [/^&#(\d{1,3});?$/, (match) => Number.parseInt(match[1] as string, 10)]
  ]
  for (const [pattern, read] of codePatterns) {
    const match = pattern.exec(query)
    if (match) {
      exactCode = read(match)
      break
    }
  }

  return base.filter((entry) => {
    if (!Number.isNaN(exactCode) && entry.code === exactCode) return true
    if ([...query].length === 1 && entry.char === query) return true
    if (entry.name.toLowerCase().includes(query)) return true
    if (entry.zh.toLowerCase().includes(query)) return true
    if (query === 'newline' && entry.code === 10) return true
    if (query === 'escape' && entry.code === 27) return true
    return false
  })
}

export const ASCII_CODE_GROUPS: { label: string; range: [number, number]; note: string }[] = [
  { label: '0 – 31', range: [0, 31], note: '控制字符，不对应任何图形，只指挥设备' },
  { label: '32 – 126', range: [32, 126], note: '可打印区，共 95 个字符' },
  { label: '127', range: [127, 127], note: 'DEL，历史上是「删除上一个字符」' }
]
