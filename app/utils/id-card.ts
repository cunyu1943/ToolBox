/**
 * 中国大陆二代身份证（18 位）解析：格式与校验位核验、出生日期、性别、年龄、归属地码。
 * 纯函数，now 可注入以便测试。
 */

export interface IdCardInfo {
  valid: boolean
  error: string
  /** 出生日期 YYYY-MM-DD */
  birthday: string
  age: number
  gender: '男' | '女' | ''
  /** 前 6 位行政区划代码 */
  regionCode: string
}

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_MAP = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

const EMPTY: IdCardInfo = {
  valid: false, error: '', birthday: '', age: 0, gender: '', regionCode: ''
}

/** 校验 18 位身份证号末尾校验位是否正确 */
export function verifyIdCardChecksum(id: string): boolean {
  const s = id.trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(s[i]) * WEIGHTS[i]
  return CHECK_MAP[sum % 11] === s[17]
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** 从出生日期推算截至 now 的周岁 */
function ageFrom(y: number, m: number, d: number, now: Date): number {
  let age = now.getFullYear() - y
  const nowM = now.getMonth() + 1
  const nowD = now.getDate()
  const hadBirthday = nowM > m || (nowM === m && nowD >= d)
  if (!hadBirthday) age--
  return age < 0 ? 0 : age
}

/** 解析身份证号，now 默认当前时间 */
export function parseIdCard(id: string, now: Date = new Date()): IdCardInfo {
  const s = id.trim().toUpperCase()
  if (!s) return { ...EMPTY, error: '请输入身份证号' }
  if (s.length !== 18) return { ...EMPTY, error: '身份证号应为 18 位' }
  if (!/^\d{17}[\dX]$/.test(s)) return { ...EMPTY, error: '格式不正确（前 17 位数字，末位数字或 X）' }
  if (!verifyIdCardChecksum(s)) return { ...EMPTY, error: '校验位不正确' }

  const y = Number(s.slice(6, 10))
  const m = Number(s.slice(10, 12))
  const d = Number(s.slice(12, 14))
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return { ...EMPTY, error: '出生日期不合法' }
  }

  return {
    valid: true,
    error: '',
    birthday: `${y}-${pad(m)}-${pad(d)}`,
    age: ageFrom(y, m, d, now),
    gender: Number(s[16]) % 2 === 1 ? '男' : '女',
    regionCode: s.slice(0, 6)
  }
}
