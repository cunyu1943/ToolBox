/**
 * 数字 → 中文转换。纯函数，供页面与单测复用。
 * - toChineseUpper：财务大写（壹贰叁…元角分整），用于金额大写。
 * - toChineseLower：普通读法（一二三…十百千）。
 * 整数部分最大支持到「万亿」级别（约 12~16 位），超出抛错由调用方兜底。
 */

const UPPER_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const LOWER_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
// 四位节内单位：个 十 百 千
const UPPER_SECTIONS = ['', '拾', '佰', '仟']
const LOWER_SECTIONS = ['', '十', '百', '千']
// 节单位（每 4 位一节）：个 万 亿 万亿
const GROUP_UNITS = ['', '万', '亿', '万亿']

/** 把一个 4 位以内的整数（0~9999）转为中文节内片段，处理内部零 */
function sectionToChinese(n: number, digits: string[], sections: string[]): string {
  let s = ''
  let unitPos = 0
  let zero = true // 是否处于需要补零的位置
  let v = n
  while (v > 0) {
    const d = v % 10
    if (d === 0) {
      if (!zero) {
        zero = true
        s = digits[0] + s
      }
    } else {
      zero = false
      s = digits[d] + sections[unitPos] + s
    }
    unitPos++
    v = Math.floor(v / 10)
  }
  return s
}

/** 整数部分（非负）转中文 */
function integerToChinese(intPart: number, digits: string[], sections: string[]): string {
  if (intPart === 0) return digits[0]
  if (intPart >= 1e16) throw new RangeError('整数部分超出支持范围（< 1 亿亿）')

  let num = intPart
  const groups: string[] = []
  let groupPos = 0
  let needZero = false

  while (num > 0) {
    const section = num % 10000
    if (needZero) {
      groups.unshift(digits[0])
    }
    if (section !== 0) {
      groups.unshift(sectionToChinese(section, digits, sections) + GROUP_UNITS[groupPos])
    }
    // 当前节高位不足四位且下一节存在时，需要补零
    needZero = section < 1000 && section > 0 && num >= 10000
    num = Math.floor(num / 10000)
    groupPos++
  }
  return groups.join('')
}

function convert(amount: number, digits: string[], sections: string[], withCurrency: boolean): string {
  if (!Number.isFinite(amount)) throw new TypeError('请输入有效数字')
  const negative = amount < 0
  const abs = Math.abs(amount)
  // 金额保留到分（两位小数）
  const rounded = Math.round(abs * 100) / 100
  const intPart = Math.floor(rounded)
  const frac = Math.round((rounded - intPart) * 100)
  const jiao = Math.floor(frac / 10)
  const fen = frac % 10

  const intChinese = integerToChinese(intPart, digits, sections)
  let body: string
  if (!withCurrency) {
    body = intChinese + (frac > 0 ? '点' + digits[jiao] + (fen > 0 ? digits[fen] : '') : '')
    return (negative ? '负' : '') + body
  }

  // 财务金额：元角分
  let s = ''
  if (intPart === 0 && frac === 0) return (negative ? '负' : '') + '零元整'
  if (intPart > 0) s += intChinese + '元'
  if (jiao === 0 && fen === 0) {
    s += '整'
  } else if (fen === 0) {
    // 到「角」为止，角后补「整」
    s += digits[jiao] + '角整'
  } else {
    if (jiao > 0) s += digits[jiao] + '角'
    else if (intPart > 0) s += digits[0] // 元后有分无角补零
    s += digits[fen] + '分'
  }
  if (s === '') s = '零元整'
  return (negative ? '负' : '') + s
}

/** 人民币财务大写金额，如 1234.5 → 壹仟贰佰叁拾肆元伍角整 */
export function toChineseUpper(amount: number): string {
  return convert(amount, UPPER_DIGITS, UPPER_SECTIONS, true)
}

/** 普通中文读法，如 1234.5 → 一千二百三十四点五 */
export function toChineseLower(amount: number): string {
  return convert(amount, LOWER_DIGITS, LOWER_SECTIONS, false)
}
