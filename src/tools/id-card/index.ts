/**
 * 中国大陆居民身份证解析（纯本地，不联网）。
 *
 * 校验位是 GB 11643—1999 定义的 ISO 7064:1983 MOD 11-2：前 17 位加权求和 mod 11 查表得末位。
 * 归属地只到**省一级**（前 2 位）—— 市/县要正确就得内置整张 GB/T 2260 表（3000+ 条、且每年变动），
 * 纯前端不联网做不到「准」，所以这里只给省名 + 原始 6 位码，不猜市县。
 * 15 位一代证支持升位（出生年补世纪、末尾按同法补校验位），结果里明确标出是「升位后」的号码。
 */

import { DAY_MS, daysInMonth, isValidDate, toUtcMs, type CalendarDate } from '../date-diff/index.ts'
import { signOfYearMonthDay } from '../zodiac/index.ts'

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

/** GB/T 2260 省级区划码（前 2 位） */
export const PROVINCES: Record<string, string> = {
  '11': '北京市', '12': '天津市', '13': '河北省', '14': '山西省', '15': '内蒙古自治区',
  '21': '辽宁省', '22': '吉林省', '23': '黑龙江省',
  '31': '上海市', '32': '江苏省', '33': '浙江省', '34': '安徽省', '35': '福建省',
  '36': '江西省', '37': '山东省',
  '41': '河南省', '42': '湖北省', '43': '湖南省', '44': '广东省', '45': '广西壮族自治区', '46': '海南省',
  '50': '重庆市', '51': '四川省', '52': '贵州省', '53': '云南省', '54': '西藏自治区',
  '61': '陕西省', '62': '甘肃省', '63': '青海省', '64': '宁夏回族自治区', '65': '新疆维吾尔自治区',
  '71': '台湾', '81': '香港', '82': '澳门'
}

export interface IdCardResult {
  ok: boolean
  error?: string
  /** 规范化后的 18 位号码（大写 X） */
  id18: string
  /** 输入的原始长度 */
  inputLength: 15 | 18 | 0
  /** 输入是 15 位一代证，结果中的 18 位为升位所得 */
  upgraded: boolean
  checksumOk: boolean
  /** 按前 17 位重算出的正确末位 */
  expectedCheckCode: string
  actualCheckCode: string
  province: string
  regionCode: string
  birth: CalendarDate | null
  birthText: string
  weekday: string
  /** 满周岁（未到生日则减一），参考日当天为准 */
  age: number
  /** 到下一个生日还差多少天 */
  daysToNextBirthday: number
  gender: '男' | '女'
  /** 第 17 位（顺序码末位）奇偶决定性别 */
  orderCode: string
  zodiac: string
  sign: string
  /** 打码后的号码，用于分享截图 */
  masked: string
  notes: string[]
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 前 17 位 → 校验位字符 */
export function checkCodeOf(id17: string): string {
  let sum = 0
  for (let i = 0; i < 17; i += 1) sum += Number(id17[i]) * WEIGHTS[i]!
  return CHECK_CODES[sum % 11]!
}

export function verifyIdCard(input: string): boolean {
  const s = normalize(input)
  return /^\d{17}[\dX]$/.test(s) && checkCodeOf(s.slice(0, 17)) === s[17]
}

const normalize = (input: string): string => (input ?? '').trim().replace(/\s/g, '').toUpperCase()

/** 15 位一代证升 18 位：出生年在年份前补 19，末位按加权法补校验位 */
export function upgrade15To18(input: string): string | null {
  const s = normalize(input)
  if (!/^\d{15}$/.test(s)) return null
  const id17 = `${s.slice(0, 6)}19${s.slice(6)}`
  return `${id17}${checkCodeOf(id17)}`
}

function ageOn(birth: CalendarDate, refMs: number): { age: number; daysToNext: number } {
  const ref = new Date(refMs)
  const refY = ref.getUTCFullYear()
  const had =
    ref.getUTCMonth() + 1 > birth.m ||
    (ref.getUTCMonth() + 1 === birth.m && ref.getUTCDate() >= Math.min(birth.d, daysInMonth(refY, birth.m)))
  let age = refY - birth.y - (had ? 0 : 1)
  if (age < 0) age = 0
  const thisYear = toUtcMs({ y: refY, m: birth.m, d: Math.min(birth.d, daysInMonth(refY, birth.m)) })
  const nextMs = thisYear >= refMs ? thisYear : toUtcMs({ y: refY + 1, m: birth.m, d: Math.min(birth.d, daysInMonth(refY + 1, birth.m)) })
  return { age, daysToNext: Math.round((nextMs - refMs) / DAY_MS) }
}

export function parseIdCard(input: string, ref: CalendarDate): IdCardResult {
  const empty = (error: string, inputLength: 15 | 18 | 0): IdCardResult => ({
    ok: false, error, inputLength, upgraded: false, checksumOk: false,
    id18: '', expectedCheckCode: '', actualCheckCode: '', province: '', regionCode: '',
    birth: null, birthText: '', weekday: '', age: 0, daysToNextBirthday: 0,
    gender: '男', orderCode: '', zodiac: '', sign: '', masked: '', notes: []
  })

  const s = normalize(input)
  if (!s) return empty('请输入身份证号', 0)

  let id18 = s
  let upgraded = false
  let inputLength: 15 | 18 = 18
  if (/^\d{15}$/.test(s)) {
    const up = upgrade15To18(s)
    if (!up) return empty('15 位号码无法升位', 15)
    id18 = up
    upgraded = true
    inputLength = 15
  } else if (s.length !== 18) {
    return empty(`身份证号应为 18 位（或一代证 15 位），当前 ${s.length} 位`, 0)
  }

  if (!/^\d{17}[\dX]$/.test(id18)) {
    return empty('格式不正确：前 17 位应为数字，末位为数字或 X', inputLength)
  }

  const expected = checkCodeOf(id18.slice(0, 17))
  const actual = id18[17]!
  const checksumOk = expected === actual

  const y = Number(id18.slice(6, 10))
  const m = Number(id18.slice(10, 12))
  const d = Number(id18.slice(12, 14))
  const birth = { y, m, d }
  if (!isValidDate(birth)) return empty(`出生日期 ${y}-${m}-${d} 不是真实日期`, inputLength)
  const birthMs = toUtcMs(birth)
  const refMs = toUtcMs(ref)
  if (birthMs > refMs) return empty('出生日期晚于参考日期', inputLength)
  if (y < 1900) return empty('出生年份早于 1900，疑似号码错误', inputLength)

  const { age, daysToNext } = ageOn(birth, refMs)
  const { zodiac, sign } = signOfYearMonthDay(y, m, d)
  const notes: string[] = []
  if (upgraded) notes.push('输入是 15 位一代证，下面的 18 位号码由「补 19 世纪 + 加校验位」升位得到。')
  if (!checksumOk) notes.push(`校验位不符：按前 17 位应为 ${expected}，实际是 ${actual}，号码大概率有一处录错（末位之外的任一位都会改变校验位）。`)
  notes.push('归属地只解析到省一级；市/县需要完整的 GB/T 2260 表且逐年调整，离线无法保证准确。')

  return {
    ok: true,
    id18,
    inputLength,
    upgraded,
    checksumOk,
    expectedCheckCode: expected,
    actualCheckCode: actual,
    province: PROVINCES[id18.slice(0, 2)] ?? '未知区划',
    regionCode: id18.slice(0, 6),
    birth,
    birthText: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    weekday: WEEKDAYS[new Date(birthMs).getUTCDay()]!,
    age,
    daysToNextBirthday: daysToNext,
    gender: Number(id18[16]) % 2 === 1 ? '男' : '女',
    orderCode: id18.slice(14, 17),
    zodiac: zodiac ? `${zodiac.animal}（${zodiac.ganzhi}年）` : '',
    sign: sign?.name ?? '',
    masked: `${id18.slice(0, 6)}${'*'.repeat(8)}${id18.slice(14)}`,
    notes
  }
}

/** 页面示例：一个校验位正确的测试号段（区划/生日/顺序码均真实存在，末位按算法算出） */
export const ID_SAMPLES: { label: string; id: string }[] = [
  { label: '合法 18 位', id: '11010519491231002X' },
  { label: '校验位错一位', id: '110105194912310021' },
  { label: '15 位一代证', id: '110105491231002' }
]
