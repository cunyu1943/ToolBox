/**
 * 五险一金估算。
 *
 * 默认比例取中国大陆常见档位：养老 8%/16%、医疗 2%/9.5%、失业 0.5%/0.5%、
 * 工伤 0%/0.4%（按行业浮动）、生育 0%/0.8%（多地已并入医疗）、公积金 12%/12%（5%–12% 自选）。
 * 实际比例、缴费基数上下限每年随当地政策调整，所以这里把每一项比例都做成了可改的入参。
 */

export interface InsuranceItem {
  id: 'pension' | 'medical' | 'unemployment' | 'injury' | 'maternity' | 'housing'
  label: string
  /** 个人比例（%） */
  personalPct: number
  /** 单位比例（%） */
  companyPct: number
  /** 个人是否必须缴（工伤、生育个人不缴） */
  personalOptional: boolean
  note: string
}

export const DEFAULT_ITEMS: InsuranceItem[] = [
  { id: 'pension', label: '养老保险', personalPct: 8, companyPct: 16, personalOptional: true, note: '个人缴的全部进个人账户；单位缴费进统筹。累计缴满 15 年且达到退休年龄才可领取' },
  { id: 'medical', label: '医疗保险', personalPct: 2, companyPct: 9.5, personalOptional: true, note: '多数城市已将生育保险并入职工医保，合并后单位比例会上调' },
  { id: 'unemployment', label: '失业保险', personalPct: 0.5, companyPct: 0.5, personalOptional: true, note: '非本人意愿离职且缴费满 1 年可申领失业金' },
  { id: 'injury', label: '工伤保险', personalPct: 0, companyPct: 0.4, personalOptional: false, note: '个人不缴费；单位比例按行业风险 0.2%–1.9% 分档浮动' },
  { id: 'maternity', label: '生育保险', personalPct: 0, companyPct: 0.8, personalOptional: false, note: '个人不缴费；已并入医保的城市把这一项填 0 即可' },
  { id: 'housing', label: '住房公积金', personalPct: 12, companyPct: 12, personalOptional: true, note: '个人与单位同档，两边都进你自己的公积金账户；比例可在 5%–12% 之间选' }
]

export interface InsuranceRow extends InsuranceItem {
  personal: number
  company: number
}

export interface InsuranceInput {
  /** 缴费基数（元/月） */
  base: number
  items: InsuranceItem[]
  /** 月薪（元），用于算「五险一金占工资的比例」；传 null 只按基数看 */
  salary: number | null
}

export interface InsuranceResult {
  ok: boolean
  error?: string
  base: number
  rows: InsuranceRow[]
  personalTotal: number
  companyTotal: number
  grandTotal: number
  /** 个人各项占基数的比例合计（%） */
  personalPct: number
  /** 公积金账户每月入账（个人 + 单位），是「看不见但属于自己的钱」 */
  housingCredit: number
  /** 基数 − 个人缴纳：还没扣个税的到手 */
  beforeTax: number
  /** 公司实际人力成本：基数 + 单位缴纳 */
  employerCost: number
  /** 占工资的比例（salary 提供时） */
  personalSharePct: number | null
  monthlyTable: { label: string; personal: number; company: number; total: number }[]
  /** 公积金比例在 5%–12% 之间切换时的账户入账与到手对比 */
  housingLadder: { pct: number; housingCredit: number; beforeTax: number }[]
  notes: string[]
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

export const HOUSING_PCT_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12]

export function computeInsurance(input: InsuranceInput): InsuranceResult {
  const empty: InsuranceResult = {
    ok: false,
    base: 0,
    rows: [],
    personalTotal: 0,
    companyTotal: 0,
    grandTotal: 0,
    personalPct: 0,
    housingCredit: 0,
    beforeTax: 0,
    employerCost: 0,
    personalSharePct: null,
    monthlyTable: [],
    housingLadder: [],
    notes: []
  }

  const base = input.base
  if (!Number.isFinite(base) || base <= 0) {
    return { ...empty, error: '缴费基数要大于 0 的数字（一般是上年度月平均工资）。' }
  }
  if (base > 1000000) {
    return { ...empty, error: '基数超过 100 万/月，多半是把年薪当成月薪填了。' }
  }
  for (const item of input.items) {
    if (!Number.isFinite(item.personalPct) || !Number.isFinite(item.companyPct) || item.personalPct < 0 || item.companyPct < 0 || item.personalPct > 50 || item.companyPct > 50) {
      return { ...empty, error: `「${item.label}」的比例需要是 0–50 之间的数字。` }
    }
  }
  if (input.salary !== null && (!Number.isFinite(input.salary) || input.salary < 0)) {
    return { ...empty, error: '月薪要么留空，要么是不小于 0 的数字。' }
  }

  const rows: InsuranceRow[] = input.items.map((item) => ({
    ...item,
    personal: round2((base * item.personalPct) / 100),
    company: round2((base * item.companyPct) / 100)
  }))
  const personalTotal = round2(rows.reduce((sum, row) => sum + row.personal, 0))
  const companyTotal = round2(rows.reduce((sum, row) => sum + row.company, 0))
  const housing = rows.find((row) => row.id === 'housing')
  const housingCredit = round2((housing?.personal ?? 0) + (housing?.company ?? 0))
  const personalPct = round2((personalTotal / base) * 100)

  const monthlyTable = rows
    .filter((row) => row.personal > 0 || row.company > 0)
    .map((row) => ({
      label: row.label,
      personal: row.personal,
      company: row.company,
      total: round2(row.personal + row.company)
    }))

  const housingPct = input.items.find((item) => item.id === 'housing')?.personalPct ?? 0
  const housingLadder = HOUSING_PCT_OPTIONS.map((pct) => {
    const credit = round2((base * pct) / 100 * 2)
    const personalDelta = round2((base * pct) / 100)
    const others = personalTotal - (housing?.personal ?? 0)
    return { pct, housingCredit: credit, beforeTax: round2(base - (others + personalDelta)) }
  })

  const notes: string[] = []
  notes.push(`个人缴纳 ${personalTotal.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元里，有 ${housingCredit.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元（含单位配套）进的是你自己的公积金账户，加上养老保险的个人账户部分，这些钱并没有被交掉，只是换了个地方存。`)
  if (input.salary !== null && input.salary > 0 && Math.abs(input.salary - base) / input.salary > 0.001) {
    notes.push(`你填的月薪 ${input.salary.toLocaleString('zh-CN')} 与缴费基数 ${base.toLocaleString('zh-CN')} 不一致 —— 基数应按上年度月平均工资核定，且有当地社平工资的 60%–300% 上下限，按最低基数缴纳是常见的违规操作，会直接压低医保划入、养老金与生育津贴。`)
  }
  if (housingPct < 12) {
    notes.push(`公积金比例目前 ${housingPct}%。同样基数下顶到 12% 时，账户每月多入账 ${round2((base * (12 - housingPct)) / 100 * 2).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元，且个人多缴的部分可以在个税前扣除 —— 这是工资里性价比最高的一块。`)
  }
  notes.push('「扣完五险一金」不等于到手：还要减个税与专项附加扣除。这里的 beforeTax 只到税前工资这一步。')
  notes.push('工伤、生育、失业的单位比例与行业、城市、企业费率强相关，别把本页默认值当成当地政策。')

  return {
    ok: true,
    base: round2(base),
    rows,
    personalTotal,
    companyTotal,
    grandTotal: round2(personalTotal + companyTotal),
    personalPct,
    housingCredit,
    beforeTax: round2(base - personalTotal),
    employerCost: round2(base + companyTotal),
    personalSharePct: input.salary && input.salary > 0 ? round2((personalTotal / input.salary) * 100) : null,
    monthlyTable,
    housingLadder,
    notes
  }
}

/** 把默认比例里的公积金档位替换成指定值，返回新的 items（不修改入参） */
export function withHousingPct(items: InsuranceItem[], pct: number): InsuranceItem[] {
  return items.map((item) => (item.id === 'housing' ? { ...item, personalPct: pct, companyPct: pct } : item))
}
