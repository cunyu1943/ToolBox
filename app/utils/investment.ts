/**
 * 投资收益计算：支持一次性本金复利 + 定投（每月固定追加）。按月复利。
 * 纯函数，供页面与单测复用。
 */
import { roundFloat } from './number'

export interface InvestmentInput {
  /** 初始本金 */
  principal: number
  /** 每年收益率（%） */
  annualRatePct: number
  /** 投资年限 */
  years: number
  /** 每月定投额（期末投入），默认 0 */
  monthlyContribution?: number
}

export interface InvestmentResult {
  /** 期末总资产 */
  finalValue: number
  /** 累计投入本金 */
  contributed: number
  /** 累计收益 */
  totalGain: number
  /** 总收益率（%） */
  returnPct: number
  months: number
}

/** 复利终值：P*(1+i)^N + PMT*(((1+i)^N - 1)/i)，i=月利率，N=月数 */
export function computeInvestment(input: InvestmentInput): InvestmentResult {
  const { principal, annualRatePct, years } = input
  const pmt = input.monthlyContribution ?? 0
  const months = Math.max(0, Math.round(years * 12))
  const i = annualRatePct / 100 / 12

  const growth = Math.pow(1 + i, months)
  const lump = principal * growth
  // 定投年金终值（i=0 时退化为线性累加）
  const series = i === 0 ? pmt * months : pmt * ((growth - 1) / i)

  const finalValue = lump + series
  const contributed = principal + pmt * months
  const totalGain = finalValue - contributed
  const returnPct = contributed > 0 ? (totalGain / contributed) * 100 : 0

  return {
    finalValue: roundFloat(finalValue, 2),
    contributed: roundFloat(contributed, 2),
    totalGain: roundFloat(totalGain, 2),
    returnPct: roundFloat(returnPct, 2),
    months
  }
}
