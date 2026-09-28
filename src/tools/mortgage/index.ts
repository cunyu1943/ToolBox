/**
 * 房贷：等额本息与等额本金两种还款方式。
 *
 * 记号 P=本金（元）、r=年利率百分数、i=r/100/12（月利率）、n=年数×12（期数）。
 * 等额本息是「n 期现金流相等」的年金公式 M = P·i·(1+i)^n / ((1+i)^n − 1)；
 * 等额本金是「每期还固定本金 + 剩余本金利息」，所以月供逐月递减、总利息更少。
 * 车贷页复用本模块的 `buildPlan`，因为两者的分期数学完全一致。
 */

export type LoanMode = 'annuity' | 'principal'

export interface AmortRow {
  /** 第几期（1 起） */
  period: number
  payment: number
  principal: number
  interest: number
  remaining: number
}

export interface YearRow {
  year: number
  payment: number
  principal: number
  interest: number
  remaining: number
}

export interface LoanPlan {
  mode: LoanMode
  months: number
  /** 等额本息是固定月供；等额本金是首月月供 */
  firstPayment: number
  lastPayment: number
  /** 等额本金每月递减额；等额本息为 0 */
  monthlyDecrease: number
  totalInterest: number
  totalPayment: number
  /** 利息占还款总额的比例（%） */
  interestSharePct: number
  /** 按月计息时的实际年成本 (1+i)^12−1，比名义年利率略高 */
  effectiveAnnualPct: number
  rows: AmortRow[]
  years: YearRow[]
}

export const LOAN_MODE_LABELS: { value: LoanMode; label: string; detail: string }[] = [
  { value: 'annuity', label: '等额本息（月供固定）', detail: 'M = P·i·(1+i)ⁿ ÷ ((1+i)ⁿ − 1)，每月还一样的钱，前期大部分是利息' },
  { value: 'principal', label: '等额本金（逐月递减）', detail: '每月还固定本金 P/n + 剩余本金的利息，起步月供最高，总利息更少' }
]

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

/** 受理边界：超出多半是单位填错（万元/元搞混）而不是真有人贷这么多 */
const LIMITS = { principalWan: [1, 100000], years: [1, 40], annualRatePct: [0, 30] } as const

export function buildPlan(principalYuan: number, annualRatePct: number, years: number, mode: LoanMode): LoanPlan {
  const months = Math.round(years * 12)
  const i = annualRatePct / 100 / 12
  const rows: AmortRow[] = []

  let remaining = principalYuan
  let totalInterest = 0
  let totalPayment = 0
  let fixed = 0

  if (mode === 'annuity') {
    fixed = i === 0 ? principalYuan / months : (principalYuan * i * (1 + i) ** months) / ((1 + i) ** months - 1)
  }
  const principalPerMonth = mode === 'principal' ? principalYuan / months : 0

  for (let period = 1; period <= months; period++) {
    const interest = remaining * i
    // 末期把分（0.01 级）残差并进本金，避免「剩余 0.01 元」和利息对不上
    const principalPart =
      mode === 'principal'
        ? period === months
          ? remaining
          : principalPerMonth
        : period === months
          ? remaining
          : fixed - interest
    const payment = principalPart + interest
    remaining = Math.max(0, remaining - principalPart)
    totalInterest += interest
    totalPayment += payment
    rows.push({
      period,
      payment: round2(payment),
      principal: round2(principalPart),
      interest: round2(interest),
      remaining: round2(remaining)
    })
  }

  const sums = new Map<number, { payment: number; principal: number; interest: number; remaining: number }>()
  for (const row of rows) {
    const year = Math.ceil(row.period / 12)
    const acc = sums.get(year) ?? { payment: 0, principal: 0, interest: 0, remaining: 0 }
    acc.payment += row.payment
    acc.principal += row.principal
    acc.interest += row.interest
    acc.remaining = row.remaining
    sums.set(year, acc)
  }
  const yearRows: YearRow[] = [...sums.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, acc]) => ({
      year,
      payment: round2(acc.payment),
      principal: round2(acc.principal),
      interest: round2(acc.interest),
      remaining: acc.remaining
    }))

  const first = rows[0]?.payment ?? 0
  const last = rows[rows.length - 1]?.payment ?? 0

  return {
    mode,
    months,
    firstPayment: round2(first),
    lastPayment: round2(last),
    monthlyDecrease: mode === 'principal' ? round2(principalPerMonth * i) : 0,
    totalInterest: round2(totalInterest),
    totalPayment: round2(totalPayment),
    interestSharePct: totalPayment > 0 ? round2((totalInterest / totalPayment) * 100) : 0,
    effectiveAnnualPct: round2(((1 + i) ** 12 - 1) * 100),
    rows,
    years: yearRows
  }
}

export interface MortgageInput {
  /** 贷款总额（万元） */
  principalWan: number
  annualRatePct: number
  years: number
  mode: LoanMode
}

export interface MortgageResult {
  ok: boolean
  error?: string
  principalYuan: number
  selected: LoanPlan | null
  comparison: { annuity: LoanPlan | null; principal: LoanPlan | null }
  /** 等额本息比等额本金多付的利息 */
  interestDiff: number
  /** 首月月供需要多少家庭月收入才不算「吃力」（按 50% 负债收入比反推） */
  incomeHint: number | null
  notes: string[]
}

export function computeMortgage(input: MortgageInput): MortgageResult {
  const empty: MortgageResult = {
    ok: false,
    principalYuan: 0,
    selected: null,
    comparison: { annuity: null, principal: null },
    interestDiff: 0,
    incomeHint: null,
    notes: []
  }

  const { principalWan, annualRatePct, years, mode } = input
  if (!Number.isFinite(principalWan) || !Number.isFinite(annualRatePct) || !Number.isFinite(years)) {
    return { ...empty, error: '贷款总额、年利率与年限都必须是数字。' }
  }
  const [minWan, maxWan] = LIMITS.principalWan
  const [minYears, maxYears] = LIMITS.years
  const [minRate, maxRate] = LIMITS.annualRatePct
  if (principalWan < minWan || principalWan > maxWan) {
    return {
      ...empty,
      error: `贷款总额应在 ${minWan}–${maxWan} 万元之间。输入 ${principalWan} 的话，是不是把「元」填成了「万元」？`
    }
  }
  if (years < minYears || years > maxYears) {
    return { ...empty, error: `贷款年限支持 ${minYears}–${maxYears} 年（商贷最长 30 年，公积金一般不超过 30 年且受借款人年龄限制）。` }
  }
  if (annualRatePct < minRate || annualRatePct > maxRate) {
    return { ...empty, error: `年利率应在 ${minRate}–${maxRate}% 之间。` }
  }

  const principalYuan = round2(principalWan * 10000)
  const annuity = buildPlan(principalYuan, annualRatePct, years, 'annuity')
  const principalMode = buildPlan(principalYuan, annualRatePct, years, 'principal')
  const selected = mode === 'annuity' ? annuity : principalMode

  const notes: string[] = []
  const diff = round2(annuity.totalInterest - principalMode.totalInterest)
  if (diff > 0) {
    notes.push(
      `同样的本金与利率，等额本息比等额本金多付 ${diff.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元利息；等额本金换来的是首月月供高出 ${round2(principalMode.firstPayment - annuity.firstPayment).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元。`
    )
  }
  if (selected.effectiveAnnualPct > annualRatePct) {
    notes.push(
      `按月计息的实际年成本是 ${selected.effectiveAnnualPct}%，比合同上写的 ${annualRatePct}% 高 —— 每月都在还本付息，等于把年利率切成 12 份逐月复利。和银行比价时要么都用名义、要么都用这个实际值。`
    )
  }
  if (annualRatePct === 0) {
    notes.push('年利率为 0：这里按「不产生利息、只分期还本」处理，等额本息与等额本金的结果此时完全相同。')
  }
  notes.push('本工具只算本息的摊销：契税、中介费、维修基金、物业费、保险与评估费都不在结果里，等额本息的「还款总额」也不包含这些。')
  notes.push('利率取整年固定值。真实房贷按 LPR 加点定价、每年重定价一次，中途利率调整要按剩余本金与新期数重算 —— 想看清某一年之后发生了什么，改年利率再算一次即可。')

  return {
    ok: true,
    principalYuan,
    selected,
    comparison: { annuity, principal: principalMode },
    interestDiff: diff,
    incomeHint: Math.ceil(selected.firstPayment / 0.5 / 100) * 100,
    notes
  }
}

/** 还款计划导出 CSV（纯文本拼接，页面负责下载）；带 BOM 交给调用方处理 Excel 兼容 */
export function planToCsv(plan: LoanPlan): string {
  const header = '期数,月供(元),本金(元),利息(元),剩余本金(元)'
  const lines = plan.rows.map((row) =>
    [row.period, row.payment.toFixed(2), row.principal.toFixed(2), row.interest.toFixed(2), row.remaining.toFixed(2)].join(',')
  )
  return [header, ...lines].join('\n')
}

export interface MortgageSample {
  label: string
  input: MortgageInput
}

/** 常见档：4.9% 是 2015 年 10 月起执行的五年期以上贷款基准利率，不少存量房贷以它为锚加减点 */
export const MORTGAGE_SAMPLES: MortgageSample[] = [
  { label: '100万·30年·等额本息', input: { principalWan: 100, annualRatePct: 3.1, years: 30, mode: 'annuity' } },
  { label: '100万·30年·等额本金', input: { principalWan: 100, annualRatePct: 3.1, years: 30, mode: 'principal' } },
  { label: '60万·25年·存量 4.9%', input: { principalWan: 60, annualRatePct: 4.9, years: 25, mode: 'annuity' } },
  { label: '30万·20年·公积金 2.85%', input: { principalWan: 30, annualRatePct: 2.85, years: 20, mode: 'annuity' } }
]
