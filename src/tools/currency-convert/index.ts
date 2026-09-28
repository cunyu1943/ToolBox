/**
 * 货币换算（离线表）。
 *
 * 纯前端拿不到实时汇率，也不该在页面里塞一个会过期的「实时」数字，
 * 所以这里做成**用户可编辑的锚定表**：每个币种存「1 单位折合多少 CNY」，
 * 交叉汇率由两个对 CNY 的比值算出（USD→EUR = rateUSD / rateEUR）。
 * 表上明确标注「出厂快照」与「最后更新时间」，提醒使用者自行核对。
 */

export interface Currency {
  code: string
  name: string
  symbol: string
  /** 1 单位该币种折合的人民币金额 */
  rateToCny: number
  /** 该币种常用小数位（日元、韩元面值小，2 位小数会误导） */
  decimals: number
}

/** 出厂快照日期：不是「数据来自这一天」的声明，而是「请以此为基准自行核对并更新」的提醒 */
export const DEFAULT_UPDATED = '2026-09-18'

export const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'CNY', name: '人民币', symbol: '¥', rateToCny: 1, decimals: 2 },
  { code: 'USD', name: '美元', symbol: '$', rateToCny: 7.2, decimals: 2 },
  { code: 'EUR', name: '欧元', symbol: '€', rateToCny: 7.85, decimals: 2 },
  { code: 'JPY', name: '日元', symbol: 'JP¥', rateToCny: 0.048, decimals: 0 },
  { code: 'GBP', name: '英镑', symbol: '£', rateToCny: 9.15, decimals: 2 },
  { code: 'HKD', name: '港币', symbol: 'HK$', rateToCny: 0.925, decimals: 2 },
  { code: 'KRW', name: '韩元', symbol: '₩', rateToCny: 0.0054, decimals: 0 },
  { code: 'AUD', name: '澳元', symbol: 'A$', rateToCny: 4.75, decimals: 2 },
  { code: 'CAD', name: '加元', symbol: 'C$', rateToCny: 5.25, decimals: 2 },
  { code: 'CHF', name: '瑞士法郎', symbol: 'Fr', rateToCny: 8.05, decimals: 2 },
  { code: 'SGD', name: '新加坡元', symbol: 'S$', rateToCny: 5.35, decimals: 2 },
  { code: 'NZD', name: '新西兰元', symbol: 'NZ$', rateToCny: 4.25, decimals: 2 },
  { code: 'THB', name: '泰铢', symbol: '฿', rateToCny: 0.2, decimals: 0 },
  { code: 'MYR', name: '马来西亚林吉特', symbol: 'RM', rateToCny: 1.62, decimals: 2 },
  { code: 'AED', name: '阿联酋迪拉姆', symbol: 'د.إ', rateToCny: 1.96, decimals: 2 },
  { code: 'RUB', name: '俄罗斯卢布', symbol: '₽', rateToCny: 0.09, decimals: 0 }
]

export interface ConvertResult {
  ok: boolean
  error?: string
  amount: number
  from: Currency | null
  to: Currency | null
  value: number
  /** 1 from = per1 个 to */
  per1: number
  /** 1 to = perBack 个 from，用于核对往返 */
  perBack: number
  /** 100 单位 from 折合多少 to，表格里更直观 */
  per100: number
}

export function findCurrency(currencies: Currency[], code: string): Currency | null {
  return currencies.find((item) => item.code === code) ?? null
}

export function convert(amount: number, from: string, to: string, currencies: Currency[]): ConvertResult {
  const empty: ConvertResult = {
    ok: false,
    amount: Number.isFinite(amount) ? amount : 0,
    from: null,
    to: null,
    value: 0,
    per1: 0,
    perBack: 0,
    per100: 0
  }
  const source = findCurrency(currencies, from)
  const target = findCurrency(currencies, to)
  if (!Number.isFinite(amount)) return { ...empty, error: '金额必须是数字。' }
  if (!source) return { ...empty, error: `币种 ${from} 不在表里。` }
  if (!target) return { ...empty, error: `币种 ${to} 不在表里。` }
  if (source.rateToCny <= 0 || target.rateToCny <= 0) {
    return { ...empty, from: source, to: target, error: '汇率必须大于 0，否则换算没有意义。' }
  }

  const per1 = source.rateToCny / target.rateToCny
  return {
    ok: true,
    amount,
    from: source,
    to: target,
    value: amount * per1,
    per1,
    perBack: 1 / per1,
    per100: per1 * 100
  }
}

/** 全表对照：1 单位 from 分别折合多少其他币种 */
export function crossTable(from: string, currencies: Currency[]): { code: string; name: string; per1: number }[] {
  const source = findCurrency(currencies, from)
  if (!source || source.rateToCny <= 0) return []
  return currencies
    .filter((item) => item.code !== from)
    .map((item) => ({ code: item.code, name: item.name, per1: source.rateToCny / item.rateToCny }))
}

/** 校验用户编辑过的汇率表，返回「币种码 → 问题」；空数组表示没有问题 */
export function validateRates(currencies: Currency[]): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const item of currencies) {
    if (seen.has(item.code)) problems.push(`${item.code} 重复出现`)
    seen.add(item.code)
    if (!Number.isFinite(item.rateToCny) || item.rateToCny <= 0) problems.push(`${item.code} 的汇率必须是大于 0 的数字`)
  }
  const cny = findCurrency(currencies, 'CNY')
  if (!cny) problems.push('表里必须有 CNY 作为锚定币种')
  else if (Math.abs(cny.rateToCny - 1) > 1e-9) problems.push('CNY 的汇率应当是 1（其他币种都是相对它定价的）')
  return problems
}

/** 按币种自身的小数习惯格式化（日元/韩元不显示小数） */
export function formatByCurrency(value: number, currency: Currency | null): string {
  const decimals = currency?.decimals ?? 2
  return value.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
