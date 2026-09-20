import { describe, expect, it } from 'vitest'
import { computeInvestment } from '~/utils/investment'

describe('投资收益计算', () => {
  it('零利率下等于本金 + 定投累加', () => {
    const r = computeInvestment({ principal: 0, annualRatePct: 0, years: 1, monthlyContribution: 1000 })
    expect(r.finalValue).toBe(12000)
    expect(r.totalGain).toBe(0)
  })

  it('一次性本金按月复利', () => {
    const r = computeInvestment({ principal: 10000, annualRatePct: 10, years: 1 })
    expect(r.finalValue).toBeCloseTo(11047.13, 1)
    expect(r.contributed).toBe(10000)
    expect(r.totalGain).toBeCloseTo(1047.13, 1)
  })

  it('年限为 0 时终值等于本金', () => {
    const r = computeInvestment({ principal: 5000, annualRatePct: 8, years: 0 })
    expect(r.finalValue).toBe(5000)
    expect(r.months).toBe(0)
  })

  it('本金与定投混合', () => {
    const r = computeInvestment({ principal: 10000, annualRatePct: 0, years: 2, monthlyContribution: 500 })
    expect(r.contributed).toBe(10000 + 500 * 24)
    expect(r.totalGain).toBe(0)
  })
})
