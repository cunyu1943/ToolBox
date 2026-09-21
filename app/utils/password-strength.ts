/**
 * 密码强度评估（纯本地估算，不联网、不校验真实数据库）。
 * 综合长度、字符集多样性、熵估算，并惩罚常见弱口令/连续/重复模式。
 */

export type StrengthLevel = 0 | 1 | 2 | 3 | 4

export interface StrengthResult {
  score: StrengthLevel        // 0~4
  label: string               // 很弱/弱/中等/强/很强
  entropy: number             // 信息熵（比特，保留 1 位小数）
  charsetSize: number         // 命中的字符集大小
  percent: number             // 进度条百分比（score/4）
  warnings: string[]          // 扣分原因/风险提示
  suggestion: string          // 改进建议
}

const LEVEL_LABELS = ['很弱', '弱', '中等', '强', '很强']

/** 常见弱口令与键盘序列（小写比较） */
const COMMON = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234',
  '111111', '1234567', 'dragon', '123123', 'baseball', 'abc123', 'football',
  'monkey', 'letmein', '666666', 'qwertyuiop', '123321', 'password1', 'iloveyou',
  '000000', 'admin', 'welcome', 'hello', '1q2w3e4r', 'passw0rd', '121212'
])

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890']

function hasSequential(pwd: string, run = 4): boolean {
  const s = pwd.toLowerCase()
  for (let i = 0; i + run <= s.length; i++) {
    const seg = s.slice(i, i + run)
    // 正序/逆序的字母或数字序列
    let asc = true
    let desc = true
    for (let j = 1; j < run; j++) {
      const d = s.charCodeAt(i + j) - s.charCodeAt(i + j - 1)
      if (d !== 1) asc = false
      if (d !== -1) desc = false
    }
    if (asc || desc) return true
    if (KEYBOARD_ROWS.some((row) => row.includes(seg))) return true
  }
  return false
}

function hasRepeat(pwd: string): boolean {
  const s = pwd.toLowerCase()
  for (let i = 0; i + 3 <= s.length; i++) {
    if (s[i] === s[i + 1] && s[i] === s[i + 2]) return true
  }
  return false
}

function charsetSize(pwd: string): number {
  let size = 0
  if (/[a-z]/.test(pwd)) size += 26
  if (/[A-Z]/.test(pwd)) size += 26
  if (/[0-9]/.test(pwd)) size += 10
  if (/[^a-zA-Z0-9]/.test(pwd)) size += 33
  return size
}

function countClasses(pwd: string): number {
  let n = 0
  if (/[a-z]/.test(pwd)) n++
  if (/[A-Z]/.test(pwd)) n++
  if (/[0-9]/.test(pwd)) n++
  if (/[^a-zA-Z0-9]/.test(pwd)) n++
  return n
}

export function analyzePassword(pwd: string): StrengthResult {
  const warnings: string[] = []
  if (!pwd) {
    return {
      score: 0, label: LEVEL_LABELS[0], entropy: 0, charsetSize: 0, percent: 0,
      warnings: ['尚未输入密码'], suggestion: '输入密码后将实时评估强度。'
    }
  }

  const size = charsetSize(pwd)
  const rawEntropy = pwd.length * Math.log2(size || 1)
  let entropy = rawEntropy

  // 模式惩罚：命中则最多评为「弱」
  const lower = pwd.toLowerCase()
  const isCommon = COMMON.has(lower)
  const seq = hasSequential(pwd)
  const rep = hasRepeat(pwd)
  if (isCommon) warnings.push('属于常见弱口令')
  if (seq) warnings.push('包含连续字符或键盘序列')
  if (rep) warnings.push('包含重复字符段')

  let score: StrengthLevel
  if (entropy < 28) score = 0
  else if (entropy < 36) score = 1
  else if (entropy < 60) score = 2
  else if (entropy < 128) score = 3
  else score = 4

  // 长度与多样性硬约束
  if (pwd.length < 8) score = Math.min(score, 1) as StrengthLevel
  if (countClasses(pwd) <= 1) score = Math.min(score, 1) as StrengthLevel
  if (isCommon || seq || rep) score = Math.min(score, 1) as StrengthLevel

  // 惩罚后再收敛熵显示
  if (isCommon || seq || rep) entropy = Math.min(entropy, 36)
  entropy = Math.round(entropy * 10) / 10

  const suggestion = buildSuggestion(pwd, score, warnings)

  return {
    score,
    label: LEVEL_LABELS[score],
    entropy,
    charsetSize: size,
    percent: (score / 4) * 100,
    warnings,
    suggestion
  }
}

function buildSuggestion(pwd: string, score: StrengthLevel, warnings: string[]): string {
  if (warnings.includes('属于常见弱口令')) return '请避免使用字典词与常见组合，改用无意义字符或口令短语。'
  if (pwd.length < 8) return '至少使用 8 个字符，推荐 12 位以上。'
  if (warnings.includes('包含连续字符或键盘序列')) return '打散连续字符（如 abcd、1234、qwer），避免键盘序列。'
  if (warnings.includes('包含重复字符段')) return '避免 aaa、111 这类重复段，混合多种字符。'
  if (score <= 2) return '增加长度并混合大小写字母、数字与符号可显著提升强度。'
  return '强度良好，可搭配密码管理器为不同站点生成唯一密码。'
}
