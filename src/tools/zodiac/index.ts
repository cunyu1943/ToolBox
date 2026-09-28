/**
 * 生肖 / 星座查询。
 *
 * 生肖按「干支年」推：以 1984 甲子年为基准（该年 2 月 2 日进入甲子，页面已注明农历分界的近似），
 * 干支序号 `n = (year − 1984) mod 60`，天干取 `n % 10`、地支取 `n % 12`，生肖由地支决定 ——
 * 一条公式同时给出「庚子」「丙午」这类年份名，比 `year % 12` 更好核对。
 * 干支年以**春节**为界，本工具按公历年近似：春节前后各半个月的生日会差一生肖，页面明确标注。
 *
 * 星座用通行的日期区间（每月 19/20/21/22/23 日分界，逐年可能漂移一天，此处不引入天文历表）。
 */

export interface ChineseZodiac {
  animal: string
  /** 该年地支 */
  branch: string
  /** 该年天干 */
  stem: string
  /** 干支年名，如「丙午」 */
  ganzhi: string
  /** 天干五行 */
  element: string
  /** 最近三个本命年（生肖相同的年份） */
  recentYears: number[]
}

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const STEM_ELEMENTS = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']

/** 1984 年为甲子年，故 `(year − 1984) mod 60` 直接给出干支序号 */
const GANZHI_BASE = 1984

const mod = (n: number, m: number): number => ((n % m) + m) % m

export function chineseZodiac(year: number, refYear = new Date().getFullYear()): ChineseZodiac | null {
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null
  const n = mod(year - GANZHI_BASE, 60)
  const stem = STEMS[n % 10]!
  const branch = BRANCHES[n % 12]!
  const animal = ANIMALS[n % 12]!
  // 最近的（含今年）一个本命年，再往后数两个
  const last = refYear - mod(refYear - year, 12)
  const recentYears = [last, last + 12, last + 24]
  return { animal, branch, stem, ganzhi: `${stem}${branch}`, element: STEM_ELEMENTS[n % 10]!, recentYears }
}

export interface WesternSign {
  name: string
  en: string
  element: string
  /** 起始「月/日」，用于速查表 */
  from: string
  to: string
}

/** 每月「最后一天仍属于上一个星座」的日期（导出以便断言与区间表一致）；索引 = 月 − 1。
 *  月 `m` 的分界前一个星座在 `WESTERN_SIGNS` 里的下标是 `(m + 8) % 12`，分界后是它的下一个。 */
export const SIGN_CUTS = [19, 18, 20, 19, 20, 21, 22, 22, 22, 23, 22, 21]

export const WESTERN_SIGNS: WesternSign[] = [
  { name: '白羊座', en: 'Aries', element: '火象', from: '3/21', to: '4/19' },
  { name: '金牛座', en: 'Taurus', element: '土象', from: '4/20', to: '5/20' },
  { name: '双子座', en: 'Gemini', element: '风象', from: '5/21', to: '6/21' },
  { name: '巨蟹座', en: 'Cancer', element: '水象', from: '6/22', to: '7/22' },
  { name: '狮子座', en: 'Leo', element: '火象', from: '7/23', to: '8/22' },
  { name: '处女座', en: 'Virgo', element: '土象', from: '8/23', to: '9/22' },
  { name: '天秤座', en: 'Libra', element: '风象', from: '9/23', to: '10/23' },
  { name: '天蝎座', en: 'Scorpio', element: '水象', from: '10/24', to: '11/22' },
  { name: '射手座', en: 'Sagittarius', element: '火象', from: '11/23', to: '12/21' },
  { name: '摩羯座', en: 'Capricorn', element: '土象', from: '12/22', to: '1/19' },
  { name: '水瓶座', en: 'Aquarius', element: '风象', from: '1/20', to: '2/18' },
  { name: '双鱼座', en: 'Pisces', element: '水象', from: '2/19', to: '3/20' }
]

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** 月(1–12) / 日 与 生肖，非法返回 null；2 月 29 日按闰年容忍 */
export function westernZodiac(month: number, day: number): WesternSign | null {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1) return null
  if (day > (month === 2 ? 29 : DAYS_IN_MONTH[month - 1]!)) return null
  const cut = SIGN_CUTS[month - 1]!
  const before = (month + 8) % 12
  return WESTERN_SIGNS[day <= cut ? before : (before + 1) % 12]!
}

/** 从 `YYYY-MM-DD` 同时给出生肖与星座，供身份证 / 年龄页复用 */
export function signOfYearMonthDay(
  year: number,
  month: number,
  day: number
): { zodiac: ChineseZodiac | null; sign: WesternSign | null } {
  return { zodiac: chineseZodiac(year), sign: westernZodiac(month, day) }
}

export const ZODIAC_TABLE: { branch: string; animal: string; hours: string }[] = BRANCHES.map(
  (branch, index) => ({
    branch,
    animal: ANIMALS[index]!,
    hours: `${(index * 2 + 23) % 24}:00–${(index * 2 + 25) % 24}:00`
  })
)
