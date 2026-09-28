/**
 * Unix 文件权限内核（纯函数，无 DOM 依赖）。
 *
 * 一个 mode 值是 12 位：低 9 位为 owner/group/other 的 rwx，高三位为 setuid/setgid/sticky。
 * 支持 `755`、`0755`、`rwxr-xr-x`、`u+x,g-w` 四类输入之间的互转与逐步推演。
 *
 * 刻意不支持的语法会在解析时报明原因，而不是静默忽略：GNU 的大写 `X`（依赖路径是否为目录）、
 * `u`/`g`/`o` 作为权限来源（如 `g=u`）、以及 `=` 省略 who 时的「只加不减」规则。
 */

export interface ModeParts {
  setuid: boolean
  setgid: boolean
  sticky: boolean
  owner: number
  group: number
  other: number
}

export interface ModeRow {
  who: string
  whoKey: 'owner' | 'group' | 'other'
  bits: number
  read: boolean
  write: boolean
  execute: boolean
  /** 该节加上特殊位后的 3 字符渲染，如 `rws` / `rwS` */
  display: string
}

export interface ParseResult {
  ok: boolean
  mode?: number
  error?: string
  notes: string[]
}

export interface SymbolicStep {
  expr: string
  before: number
  after: number
  beforeText: string
  afterText: string
  note: string
}

export interface SymbolicResult {
  ok: boolean
  mode?: number
  error?: string
  steps: SymbolicStep[]
}

export const SPECIAL_BITS = { setuid: 0o4000, setgid: 0o2000, sticky: 0o1000 } as const

const R = 4
const W = 2
const X = 1

export function splitMode(mode: number): ModeParts {
  return {
    setuid: (mode & SPECIAL_BITS.setuid) !== 0,
    setgid: (mode & SPECIAL_BITS.setgid) !== 0,
    sticky: (mode & SPECIAL_BITS.sticky) !== 0,
    owner: (mode >> 6) & 7,
    group: (mode >> 3) & 7,
    other: mode & 7
  }
}

export function joinMode(parts: ModeParts): number {
  return (
    (parts.setuid ? SPECIAL_BITS.setuid : 0) |
    (parts.setgid ? SPECIAL_BITS.setgid : 0) |
    (parts.sticky ? SPECIAL_BITS.sticky : 0) |
    ((parts.owner & 7) << 6) |
    ((parts.group & 7) << 3) |
    (parts.other & 7)
  )
}

/** 三位八进制文本，如 `755` */
export function baseOctal(mode: number): string {
  return ((mode & 0o777) >>> 0).toString(8).padStart(3, '0')
}

/** 四位八进制文本（含特殊位），如 `4755`；无特殊位时首位为 0 */
export function fullOctal(mode: number): string {
  const special =
    (mode & SPECIAL_BITS.setuid ? 4 : 0) + (mode & SPECIAL_BITS.setgid ? 2 : 0) + (mode & SPECIAL_BITS.sticky ? 1 : 0)
  return `${special.toString(8)}${baseOctal(mode)}`
}

function triad(bits: number, special: boolean, specialLetters: [string, string]): string {
  const base = `${bits & R ? 'r' : '-'}${bits & W ? 'w' : '-'}${bits & X ? 'x' : '-'}`
  if (!special) return base
  // 有特殊位时执行位改写成 s/t；若该节本来没有执行位，按 ls 的惯例写成大写
  const letter = bits & X ? specialLetters[0] : specialLetters[1]
  return `${base.slice(0, 2)}${letter}`
}

/** 9 字符权限串，即 `ls -l` 去掉最前面的文件类型字符 */
export function toSymbolic(mode: number): string {
  const parts = splitMode(mode)
  return (
    triad(parts.owner, parts.setuid, ['s', 'S']) +
    triad(parts.group, parts.setgid, ['s', 'S']) +
    triad(parts.other, parts.sticky, ['t', 'T'])
  )
}

/** 10 字符 `ls -l` 形式，typeChar 取 `-`（普通文件）或 `d`（目录） */
export function toLsString(mode: number, typeChar: '-' | 'd' = '-'): string {
  return typeChar + toSymbolic(mode)
}

export function describeMode(mode: number): ModeRow[] {
  const parts = splitMode(mode)
  const rows: [string, 'owner' | 'group' | 'other', number, string][] = [
    ['所有者 (u)', 'owner', parts.owner, triad(parts.owner, parts.setuid, ['s', 'S'])],
    ['所属组 (g)', 'group', parts.group, triad(parts.group, parts.setgid, ['s', 'S'])],
    ['其他人 (o)', 'other', parts.other, triad(parts.other, parts.sticky, ['t', 'T'])]
  ]
  return rows.map(([who, whoKey, bits, display]) => ({
    who,
    whoKey,
    bits,
    read: (bits & R) !== 0,
    write: (bits & W) !== 0,
    execute: (bits & X) !== 0,
    display
  }))
}

export function specialNames(mode: number): string[] {
  const out: string[] = []
  if (mode & SPECIAL_BITS.setuid) out.push('setuid（执行时以文件所有者身份运行）')
  if (mode & SPECIAL_BITS.setgid) out.push('setgid（目录内新建文件继承所属组）')
  if (mode & SPECIAL_BITS.sticky) out.push('sticky（目录内只能删自己的文件）')
  return out
}

/** 接受 1–4 位八进制，`755` / `0755` / `4755` 都合法 */
export function parseOctal(input: string): ParseResult {
  const notes: string[] = []
  const text = input.trim().replace(/^0o/i, '')
  if (!text) return { ok: false, error: '请输入八进制权限，例如 755', notes }
  if (!/^[0-7]+$/.test(text)) {
    const bad = [...text].find((ch) => !"01234567".includes(ch))
    return { ok: false, error: `「${bad}」不是八进制数字（权限只用 0–7）`, notes }
  }
  if (text.length > 4) return { ok: false, error: `位数过多：${text.length} 位，最多 4 位`, notes }
  if (text.length < 3) notes.push(`位数不足，按 ${text.length} 位读作 ${fullOctal(Number(`0o${text}`))}`)
  return { ok: true, mode: Number(`0o${text}`), notes }
}

/** 反向：`rwxr-xr-x` / `-rwxr-xr-x` / `rwSr--r--` → mode */
export function parseSymbolic(input: string): ParseResult {
  const notes: string[] = []
  const text = input.trim()
  if (!text) return { ok: false, error: '请输入 9 或 10 个字符的权限串，例如 rwxr-xr-x', notes }
  let body = text
  if (text.length === 10) {
    if (!/[-dlcpbsS]/.test(text[0] ?? '')) {
      return { ok: false, error: `首位「${text[0]}」不是文件类型字符（- d l c b p s）`, notes }
    }
    notes.push(`首位 ${text[0]} 是文件类型，不属于权限位，已忽略`)
    body = text.slice(1)
  }
  if (body.length !== 9) {
    return { ok: false, error: `长度为 ${text.length}，应为 9 位权限（或带文件类型的 10 位）`, notes }
  }

  const owner = parseTriad(body.slice(0, 3), 's')
  const group = parseTriad(body.slice(3, 6), 's')
  const other = parseTriad(body.slice(6, 9), 't')
  if ('error' in owner) return { ok: false, error: owner.error, notes }
  if ('error' in group) return { ok: false, error: group.error, notes }
  if ('error' in other) return { ok: false, error: other.error, notes }

  const mode =
    (((owner.bits as number) << 6) | ((group.bits as number) << 3) | (other.bits as number)) |
    (owner.special ? SPECIAL_BITS.setuid : 0) |
    (group.special ? SPECIAL_BITS.setgid : 0) |
    (other.special ? SPECIAL_BITS.sticky : 0)

  return { ok: true, mode, notes }
}

function parseTriad(
  triadText: string,
  specialLetter: 's' | 't'
): { bits: number; special: boolean; error?: undefined } | { error: string } {
  const [first, second, third] = [...(triadText ?? '')]
  const out = { bits: 0, special: false }

  if (first === 'r') out.bits |= R
  else if (first !== '-') return { error: `第 1 位应为 r 或 -，收到「${first}」` }
  if (second === 'w') out.bits |= W
  else if (second !== '-') return { error: `第 2 位应为 w 或 -，收到「${second}」` }

  if (third === 'x') out.bits |= X
  else if (third === '-') {
    /* 无执行位 */
  } else if (third === specialLetter) {
    // 小写 s/t：执行位被特殊位「吃掉」，ls 直接显示成 s/t
    out.bits |= X
    out.special = true
  } else if (third === specialLetter.toUpperCase()) {
    // 大写 S/T：特殊位置起，但该节本来没有执行位
    out.special = true
  } else {
    return { error: `第 3 位应为 x、-、${specialLetter} 或 ${specialLetter.toUpperCase()}，收到「${third}」` }
  }
  return out
}

const WHO_MASK: Record<string, number> = { u: 0o700, g: 0o70, o: 0o7, a: 0o777 }

const OPERAND_RE = /^([ugoa]*)(\+|-|=)(.*)$/

/**
 * 逐个应用 `u+x,g-w,a=rwx` 这类符号表达式，返回每一步的前后 mode。
 * base 为当前权限；GNU 里省略 who 等价于 `a`，且不带 `=` 时只加不减——这里同样按此规则实现。
 */
export function applySymbolic(base: number, expression: string): SymbolicResult {
  const steps: SymbolicStep[] = []
  const groups = expression
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (!groups.length) return { ok: false, error: '请输入至少一个表达式，例如 u+x', steps }

  let mode = base & 0o7777
  for (const expr of groups) {
    const match = OPERAND_RE.exec(expr)
    if (!match) {
      return { ok: false, error: `无法解析「${expr}」，写法应为 [ugoa][+-=][rwxst]`, steps }
    }
    const [, whoText, op, permText] = match as unknown as [string, string, string, string]
    // `a=` / `go=` 这类空权限串是合法写法：只清掉该 who 的位
    if (!permText && op !== '=') {
      return { ok: false, error: `「${expr}」只有 ${op} 没有权限字符`, steps }
    }
    if (/[ugo]/.test(permText)) {
      return { ok: false, error: `「${expr}」用了 u/g/o 作为权限来源（如 g=u），本工具不支持`, steps }
    }
    if (permText.includes('X')) {
      return { ok: false, error: `「${expr}」用了大写 X（仅当目标是目录时给执行位），本工具不支持`, steps }
    }

    const who = whoText === '' ? 'a' : whoText
    // 特殊位的归属要先把 a 展开成 u/g/o，否则 `a+s` 会一个特殊位都不置
    const whoSet = who === 'a' ? 'ugo' : who
    let mask = 0
    for (const w of who) mask |= WHO_MASK[w] ?? 0

    let addPerms = 0
    let addSpecial = 0
    for (const p of permText) {
      if (p === 'r') addPerms |= 0o444
      else if (p === 'w') addPerms |= 0o222
      else if (p === 'x') addPerms |= 0o111
      else if (p === 's') {
        if (!whoSet.includes('u') && !whoSet.includes('g')) {
          return { ok: false, error: `「${expr}」：s 只对 u/g 有意义`, steps }
        }
        if (whoSet.includes('u')) addSpecial |= SPECIAL_BITS.setuid
        if (whoSet.includes('g')) addSpecial |= SPECIAL_BITS.setgid
      } else if (p === 't') {
        if (!whoSet.includes('o')) return { ok: false, error: `「${expr}」：t 只对 o/a 有意义`, steps }
        addSpecial |= SPECIAL_BITS.sticky
      } else {
        return { ok: false, error: `「${expr}」里的 ${p} 不是合法权限字符（r w x s t）`, steps }
      }
    }

    const before = mode
    const permMask = mask & 0o777
    const specialMask =
      (whoSet.includes('u') ? SPECIAL_BITS.setuid : 0) |
      (whoSet.includes('g') ? SPECIAL_BITS.setgid : 0) |
      (whoSet.includes('o') ? SPECIAL_BITS.sticky : 0)

    if (op === '+') mode = (mode | (addPerms & permMask) | addSpecial) & 0o7777
    else if (op === '-') mode = (mode & ~(addPerms & permMask) & ~addSpecial) & 0o7777
    else {
      const keepOutside = mode & ~permMask & ~specialMask
      mode = (keepOutside | (addPerms & permMask) | addSpecial) & 0o7777
    }

    steps.push({
      expr,
      before,
      after: mode,
      beforeText: `${fullOctal(before)} ${toSymbolic(before)}`,
      afterText: `${fullOctal(mode)} ${toSymbolic(mode)}`,
      note: describeOp(who, whoText === '', op, permText)
    })
  }
  return { ok: true, mode, steps }
}

function describeOp(who: string, omitted: boolean, op: string, perms: string): string {
  const target = omitted ? 'a（省略 who 时默认为全部）' : who === 'a' ? 'u+g+o' : who.split('').join('、')
  if (!perms) return `${target} 清空该节权限（= 且不带权限字符）`
  const verb = op === '+' ? '增加' : op === '-' ? '去掉' : '设为恰好'
  return `${target} ${verb} ${perms}`
}

export const CHMOD_PRESETS: { label: string; mode: number; note: string }[] = [
  { label: '644', mode: 0o644, note: '普通文件的默认值：只能所有者写' },
  { label: '600', mode: 0o600, note: 'SSH 私钥、密码文件必须是这个，否则 ssh 拒绝加载' },
  { label: '755', mode: 0o755, note: '可执行脚本、网站目录' },
  { label: '700', mode: 0o700, note: '私有目录，其他人不可进入' },
  { label: '775', mode: 0o775, note: '组内协作目录' },
  { label: '777', mode: 0o777, note: '任何人可读写执行，通常是事故来源' },
  { label: '000', mode: 0o000, note: '全部禁止（root 仍可读写）' },
  { label: '2775', mode: 0o2775, note: 'setgid 协作目录：新建文件继承组' },
  { label: '4755', mode: 0o4755, note: 'setuid 可执行文件：以文件所有者身份运行' },
  { label: '1777', mode: 0o1777, note: '带粘滞位的公共可写目录，如 /tmp' }
]
