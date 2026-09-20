import type { AmortizationRow, LoanResult } from '~/types'
import { roundFloat } from './number'

/**
 * 贷款还款核心计算（房贷、车贷共用）。纯函数、无副作用。
 *
 * 记号：P=本金(principal)，r=年利率(百分数，如 4.9 表示 4.9%)，years=年限。
 * 月利率 i = r/100/12，期数 n = years*12。
 */

/** 等额本息：每期还款额固定。
 * 公式：M = P·i·(1+i)^n / ((1+i)^n − 1)
 * 含义：把本金与利息摊到 n 期，使每期现金流相等的年金公式。
 */
export function calcEqualInstallment(principal: number, annualRatePct: number, years: number): LoanResult {
  const n = Math.round(years * 12)
  const i = annualRatePct / 100 / 12

  if (n <= 0 || principal <= 0) {
    return {
      mode: 'equal-installment',
      monthlyPayment: 0,
      monthlyDecrease: 0,
      lastPayment: 0,
      totalInterest: 0,
      totalPayment: 0,
      schedule: []
    }
  }

  // 零利率边界：月供即本金/期数，无利息
  const monthly = i === 0 ? principal / n : (principal * i * (1 + i) ** n) / ((1 + i) ** n - 1)

  const schedule: AmortizationRow[] = []
  let remaining = principal
  for (let p = 1; p <= n; p++) {
    const interest = remaining * i
    const principalPart = monthly - interest
    remaining = Math.max(0, remaining - principalPart)
    schedule.push({
      period: p,
      payment: roundFloat(monthly, 2),
      principal: roundFloat(principalPart, 2),
      interest: roundFloat(interest, 2),
      remaining: roundFloat(remaining, 2)
    })
  }

  const totalPayment = monthly * n
  return {
    mode: 'equal-installment',
    monthlyPayment: roundFloat(monthly, 2),
    monthlyDecrease: 0,
    lastPayment: roundFloat(monthly, 2),
    totalInterest: roundFloat(totalPayment - principal, 2),
    totalPayment: roundFloat(totalPayment, 2),
    schedule
  }
}

/** 等额本金：每期偿还固定本金 + 剩余本金利息，月供逐月递减。
 * 每月本金 = P/n；第 k 期利息 = (P − (k−1)·P/n)·i。
 * 首月月供 = P/n + P·i；每月递减 = (P/n)·i；末月月供 = P/n + (P/n)·i。
 * 总利息 = i·P·(n+1)/2。
 */
export function calcEqualPrincipal(principal: number, annualRatePct: number, years: number): LoanResult {
  const n = Math.round(years * 12)
  const i = annualRatePct / 100 / 12

  if (n <= 0 || principal <= 0) {
    return {
      mode: 'equal-principal',
      monthlyPayment: 0,
      monthlyDecrease: 0,
      lastPayment: 0,
      totalInterest: 0,
      totalPayment: 0,
      schedule: []
    }
  }

  const principalPerMonth = principal / n
  const firstPayment = principalPerMonth + principal * i
  const lastPayment = principalPerMonth + principalPerMonth * i
  const monthlyDecrease = principalPerMonth * i

  const schedule: AmortizationRow[] = []
  let remaining = principal
  let totalInterest = 0
  for (let p = 1; p <= n; p++) {
    const interest = remaining * i
    const payment = principalPerMonth + interest
    remaining = Math.max(0, remaining - principalPerMonth)
    totalInterest += interest
    schedule.push({
      period: p,
      payment: roundFloat(payment, 2),
      principal: roundFloat(principalPerMonth, 2),
      interest: roundFloat(interest, 2),
      remaining: roundFloat(remaining, 2)
    })
  }

  const totalPayment = principal + totalInterest
  return {
    mode: 'equal-principal',
    monthlyPayment: roundFloat(firstPayment, 2),
    monthlyDecrease: roundFloat(monthlyDecrease, 2),
    lastPayment: roundFloat(lastPayment, 2),
    totalInterest: roundFloat(totalInterest, 2),
    totalPayment: roundFloat(totalPayment, 2),
    schedule
  }
}

/** 将还款计划导出为 CSV 文本（供下载）。 */
export function scheduleToCsv(result: LoanResult): string {
  const header = '期数,月供,本金,利息,剩余本金'
  const lines = result.schedule.map(
    (r) => `${r.period},${r.payment},${r.principal},${r.interest},${r.remaining}`
  )
  return [header, ...lines].join('\n')
}
