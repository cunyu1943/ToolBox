import { describe, expect, it } from 'vitest'
import { computeInsurance } from '~/utils/social-insurance'

describe('五险一金估算', () => {
  it('基数 10000、公积金 12% 的个人/单位合计', () => {
    const r = computeInsurance(10000, 12)
    expect(r.personalTotal).toBe(2250) // 8%+2%+0.5%+12%
    expect(r.companyTotal).toBe(3920) // 16%+9.5%+0.5%+0.4%+0.8%+12%
    expect(r.takeHome).toBe(7750)
  })

  it('个人不缴工伤与生育', () => {
    const r = computeInsurance(10000, 0)
    const injury = r.rows.find((x) => x.label === '工伤保险')!
    const maternity = r.rows.find((x) => x.label === '生育保险')!
    expect(injury.personal).toBe(0)
    expect(maternity.personal).toBe(0)
    expect(r.personalTotal).toBe(1050) // 8%+2%+0.5%
  })

  it('公积金比例可调', () => {
    const r = computeInsurance(20000, 5)
    const fund = r.rows.find((x) => x.label === '住房公积金')!
    expect(fund.personal).toBe(1000)
    expect(fund.company).toBe(1000)
  })
})
