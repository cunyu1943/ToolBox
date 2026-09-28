/**
 * 投资收益与复利：一次性本金 + 每月定投，按月复利推算终值。
 *
 * 终值 = P·(1+i)^N + PMT·((1+i)^N − 1)/i（定投期末投入；期初投入再乘 (1+i)）。
 * i=0 时公式退化，直接线性累加。
 * 另外解两个方向相反的问题：给定目标需要多久（逐月迭代）、给定年限每月要投多少（年金公式反解）。
 */

export type ContributionTiming = 'end' | 'begin'

export const TIMING_LABELS: { value: ContributionTiming; label: string; detail: string }[] = [
  { value: 'end', label: '定投在每月月末投入', detail: '常见的基金自动扣款口径：当月申购、下月起参与复利' },
  { value: 'begin', label: '定投在每月月初投入', detail: '每期多算一个月利息，长期看终值更高' }
]

export interface InvestmentInput {
  /** 初始本金（元） */
  principal: number
  /** 预期年化收益率（%） */
  annualRatePct: number
  years: number
  /** 每月定投（元），默认 0 */
  monthlyContribution: number
  timing: ContributionTiming
  /** 年化通胀率（%），用于把名义终值折成今天的购买力；传 null 不折现 */
  inflationPct: number | null
  /** 目标金额（元），用于反推所需时间；传 null 不反推 */
  target: number | null
}

export interface YearRow {
  year: number
  /** 这一年新投入的本金 */
  contributed: number
  /** 这一年产生的收益 */
  gain: number
  /** 年末总资产 */
  value: number
}

export interface InvestmentResult {
  ok: boolean
  error?: string
  months: number
  finalValue: number
  contributed: number
  totalGain: number
  /** 收益 ÷ 累计投入（%） */
  returnPct: number
  /** 期末资产 ÷ 累计投入 */
  multiple: number
  /** 折算到今天购买力的金额；inflationPct 为 null 时等于 finalValue */
  realValue: number | null
  /** 通胀吃掉的购买力 */
  inflationLoss: number | null
  /** 72 法则估算的翻倍年数（年化 ≤0 时为 null） */
  ruleOf72Years: number | null
  /** 精确翻倍年数 ln2/ln(1+r) */
  exactDoublingYears: number | null
  /** 达到目标所需的月数；期限内达不到为 null */
  monthsToTarget: number | null
  /** 在给定年限内达到目标，每月需要定投多少（元）；不可能达成时为 null */
  requiredMonthly: number | null
  years: YearRow[]
  notes: string[]
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

/** 逐月推进，同时产出年度明细；定投口径由 timing 决定 */
function project(principal: number, monthly: number, i: number, months: number, timing: ContributionTiming): { finalValue: number; rows: YearRow[] } {
  let value = principal
  let yearContributed = 0
  let yearGain = 0
  const rows: YearRow[] = []
  for (let month = 1; month <= months; month++) {
    if (timing === 'begin') {
      value += monthly
      yearContributed += monthly
    }
    const interest = value * i
    value += interest
    yearGain += interest
    if (timing === 'end') {
      value += monthly
      yearContributed += monthly
    }
    if (month % 12 === 0 || month === months) {
      rows.push({
        year: Math.ceil(month / 12),
        contributed: round2(yearContributed),
        gain: round2(yearGain),
        value: round2(value)
      })
      yearContributed = 0
      yearGain = 0
    }
  }
  return { finalValue: value, rows }
}

/** 复利终值闭式（用于快算与反解） */
function futureValue(principal: number, monthly: number, i: number, months: number, timing: ContributionTiming): number {
  const growth = (1 + i) ** months
  const lump = principal * growth
  const series = i === 0 ? monthly * months : (monthly * (growth - 1)) / i
  return lump + (timing === 'begin' ? series * (1 + i) : series)
}

export function computeInvestment(input: InvestmentInput): InvestmentResult {
  const empty: InvestmentResult = {
    ok: false,
    months: 0,
    finalValue: 0,
    contributed: 0,
    totalGain: 0,
    returnPct: 0,
    multiple: 0,
    realValue: null,
    inflationLoss: null,
    ruleOf72Years: null,
    exactDoublingYears: null,
    monthsToTarget: null,
    requiredMonthly: null,
    years: [],
    notes: []
  }

  const { principal, annualRatePct, years, monthlyContribution, timing } = input
  if (![principal, annualRatePct, years, monthlyContribution].every((value) => Number.isFinite(value))) {
    return { ...empty, error: '本金、收益率、年限与定投额都必须是数字。' }
  }
  if (principal < 0 || monthlyContribution < 0) {
    return { ...empty, error: '本金与定投金额不能为负。' }
  }
  if (annualRatePct < -100 || annualRatePct > 100) {
    return { ...empty, error: '年化收益率应在 −100% 到 100% 之间。更高的数字一般是把多年收益当成了一年。' }
  }
  if (years < 0 || years > 70) {
    return { ...empty, error: '投资年限支持 0–70 年。' }
  }
  if (input.inflationPct !== null && (input.inflationPct < -100 || input.inflationPct > 100)) {
    return { ...empty, error: '通胀率应在 −100% 到 100% 之间。' }
  }
  if (input.target !== null && input.target <= 0) {
    return { ...empty, error: '目标金额要大于 0。' }
  }
  if (principal === 0 && monthlyContribution === 0) {
    return { ...empty, error: '本金与定投至少填一项，否则没有任何投入。' }
  }

  const months = Math.round(years * 12)
  const i = annualRatePct / 100 / 12
  const { finalValue, rows } = project(principal, monthlyContribution, i, months, timing)
  const contributed = principal + monthlyContribution * months
  const totalGain = finalValue - contributed

  const inflation = input.inflationPct
  const realValue = inflation === null ? null : finalValue / (1 + inflation / 100 / 12) ** months

  const ruleOf72Years = annualRatePct > 0 ? round2(72 / annualRatePct) : null
  const exactDoublingYears =
    annualRatePct > 0 && annualRatePct < 100 ? round2(Math.LN2 / Math.log(1 + annualRatePct / 100)) : null

  let monthsToTarget: number | null = null
  if (input.target !== null) {
    if (futureValue(principal, monthlyContribution, i, 1200, timing) < input.target) {
      monthsToTarget = null
    } else {
      let value = principal
      let month = 0
      while (value < input.target && month < 1200) {
        month++
        if (timing === 'begin') {
          value += monthlyContribution
          value = value * (1 + i)
        } else {
          value = value * (1 + i) + monthlyContribution
        }
      }
      monthsToTarget = value >= input.target ? month : null
    }
  }

  let requiredMonthly: number | null = null
  if (input.target !== null && months > 0) {
    const lump = principal * (1 + i) ** months
    const gap = input.target - lump
    if (gap <= 0) {
      requiredMonthly = 0
    } else if (i === 0) {
      requiredMonthly = round2(gap / months)
    } else {
      const factor = ((1 + i) ** months - 1) / i * (timing === 'begin' ? 1 + i : 1)
      requiredMonthly = factor > 0 ? round2(gap / factor) : null
    }
    if (requiredMonthly !== null && requiredMonthly < 0) requiredMonthly = 0
  }

  const notes: string[] = []
  if (annualRatePct > 15) {
    notes.push(`${annualRatePct}% 的年化长期高于全球主要权益市场的历史中枢（约 8%–11%）。把它当乐观情形看，别当基准情形 —— 复利对收益率极其敏感，差 3 个百分点，30 年后终值差出近一倍。`)
  }
  if (inflation !== null && realValue !== null) {
    notes.push(
      `按 ${inflation}% 通胀折算，${months} 个月后的 ${round2(finalValue).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元相当于今天的 ${round2(realValue).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元，购买力被物价吃掉 ${round2(finalValue - realValue).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元。名义收益不等于真收益。`
    )
  }
  if (ruleOf72Years !== null && exactDoublingYears !== null) {
    notes.push(`翻倍用时：72 法则估 ${ruleOf72Years} 年，精确值 ${exactDoublingYears} 年（ln2 ÷ ln(1+r)）。年化越低，72 法则估得越准。`)
  }
  if (monthsToTarget === null && input.target !== null) {
    notes.push('按当前投入与收益率，100 年内到不了目标金额 —— 要么提高定投，要么降低目标。')
  }
  if (timing === 'begin') {
    notes.push('按月初投入计息，每期多算一个月利息；和基金 App 默认的月末扣款口径相比，这个数字会略高一些。')
  }
  notes.push('按月复利、收益率恒定，是对「平滑上涨」的理想化。真实收益是波动的，序列风险（钱多的时候恰好大跌）会让同样平均收益率下的终值低于这里算出来的值。')
  notes.push('结果未扣手续费、申赎费与税费，也不构成投资建议。')

  return {
    ok: true,
    months,
    finalValue: round2(finalValue),
    contributed: round2(contributed),
    totalGain: round2(totalGain),
    returnPct: contributed > 0 ? round2((totalGain / contributed) * 100) : 0,
    multiple: contributed > 0 ? round2(finalValue / contributed) : 0,
    realValue: realValue === null ? null : round2(realValue),
    inflationLoss: realValue === null ? null : round2(finalValue - realValue),
    ruleOf72Years,
    exactDoublingYears,
    monthsToTarget,
    requiredMonthly,
    years: rows,
    notes
  }
}

export interface InvestmentSample {
  label: string
  input: InvestmentInput
}

export const INVESTMENT_SAMPLES: InvestmentSample[] = [
  {
    label: '本金 1 万·年化 8%·20 年·月投 2000',
    input: { principal: 10000, annualRatePct: 8, years: 20, monthlyContribution: 2000, timing: 'end', inflationPct: 2.5, target: null }
  },
  {
    label: '只有一次性 30 万·年化 4%',
    input: { principal: 300000, annualRatePct: 4, years: 10, monthlyContribution: 0, timing: 'end', inflationPct: null, target: null }
  },
  {
    label: '攒 100 万·看要多久',
    input: { principal: 50000, annualRatePct: 6, years: 30, monthlyContribution: 3000, timing: 'end', inflationPct: 2, target: 1000000 }
  }
]
