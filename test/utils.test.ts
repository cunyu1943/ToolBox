import { describe, it, expect } from 'vitest'
import { roundFloat, formatNumber, formatCurrency, formatPercent } from '~/utils/number'
import { calcEqualInstallment, calcEqualPrincipal } from '~/utils/loan'
import { weightUnits, volumeUnits, convertUnit, convertAll, findUnit } from '~/utils/units'
import { calcBmi, bmiLevel, healthyWeightRange, ftInToCm, lbToKg, bmiPosition } from '~/utils/bmi'
import { resolveKinship } from '~/utils/kinship-data'

describe('utils/number 精度与格式化', () => {
  it('消除浮点误差 0.1+0.2', () => {
    expect(roundFloat(0.1 + 0.2)).toBe(0.3)
  })
  it('千分位格式化', () => {
    expect(formatNumber(1234567.5, { maximumFractionDigits: 1 })).toBe('1,234,567.5')
  })
  it('货币格式化与未知币种降级', () => {
    expect(formatCurrency(1234.5, 'CNY')).toContain('1,234.50')
    expect(formatCurrency(100, 'ZZZ')).toContain('ZZZ')
  })
  it('百分比', () => {
    expect(formatPercent(0.1234)).toBe('12.34%')
  })
})

describe('utils/loan 房贷核心', () => {
  const P = 1_000_000
  const r = 4.9
  const n = 30
  it('等额本息月供约 5307 元', () => {
    const res = calcEqualInstallment(P, r, n)
    expect(res.monthlyPayment).toBeCloseTo(5307.27, 1)
    expect(res.schedule).toHaveLength(360)
    // 末期剩余本金应归零
    expect(res.schedule[res.schedule.length - 1].remaining).toBeCloseTo(0, 0)
    // 总还款 = 本金 + 总利息
    expect(res.totalPayment).toBeCloseTo(P + res.totalInterest, 0)
  })
  it('等额本金首月月供与递减额', () => {
    const res = calcEqualPrincipal(P, r, n)
    const i = r / 100 / 12
    expect(res.monthlyPayment).toBeCloseTo(P / 360 + P * i, 0) // 首月
    expect(res.monthlyDecrease).toBeCloseTo((P / 360) * i, 2)
    expect(res.lastPayment).toBeCloseTo(P / 360 + (P / 360) * i, 0)
    // 等额本金总利息 = i*P*(n+1)/2
    expect(res.totalInterest).toBeCloseTo(i * P * (360 + 1) / 2, 0)
  })
  it('零利率边界：月供=本金/期数，无利息', () => {
    const res = calcEqualInstallment(120_000, 0, 10)
    expect(res.monthlyPayment).toBeCloseTo(1000, 2)
    expect(res.totalInterest).toBe(0)
  })
  it('非法输入返回空计划', () => {
    expect(calcEqualInstallment(0, 5, 10).schedule).toHaveLength(0)
  })
})

describe('utils/units 单位换算', () => {
  it('质量 1kg = 2.2046226 lb', () => {
    const kg = findUnit(weightUnits, 'kg')!
    const lb = findUnit(weightUnits, 'lb')!
    expect(convertUnit(1, kg, lb)).toBeCloseTo(2.2046226, 5)
  })
  it('市斤/两 关系 1斤=10两', () => {
    const jin = findUnit(weightUnits, 'jin')!
    const liang = findUnit(weightUnits, 'liang')!
    expect(convertUnit(1, jin, liang)).toBeCloseTo(10, 6)
  })
  it('容量 1gal(US) = 3.785411784 L', () => {
    const g = findUnit(volumeUnits, 'gal-us')!
    const l = findUnit(volumeUnits, 'l')!
    expect(convertUnit(1, g, l)).toBeCloseTo(3.785411784, 6)
  })
  it('convertAll 以 L 为基准联动且守恒', () => {
    const all = convertAll(volumeUnits, 'l', 1)
    expect(all.l).toBe(1)
    expect(all.ml).toBeCloseTo(1000, 6)
    expect(all.m3).toBeCloseTo(0.001, 9)
  })
})

describe('utils/bmi', () => {
  it('BMI = 70 / 1.75² ≈ 22.9，分级正常', () => {
    const v = calcBmi(175, 70)!
    expect(v).toBeCloseTo(22.9, 0)
    expect(bmiLevel(v).key).toBe('normal')
  })
  it('边界分级：24 为超重', () => {
    expect(bmiLevel(24).key).toBe('overweight')
    expect(bmiLevel(28).key).toBe('obese')
    expect(bmiLevel(17).key).toBe('underweight')
  })
  it('健康体重区间与单位换算', () => {
    const range = healthyWeightRange(175)!
    expect(range.min).toBeCloseTo(18.5 * 1.75 ** 2, 1)
    expect(ftInToCm(5, 7)).toBeCloseTo(170.18, 1)
    expect(lbToKg(100)).toBeCloseTo(45.36, 1)
    expect(bmiPosition(20)).toBeCloseTo(50, 0)
  })
  it('非法输入返回 null', () => {
    expect(calcBmi(0, 60)).toBeNull()
  })
})

describe('utils/kinship 称谓推导', () => {
  it('爸爸的姐姐的儿子 → 表哥/表弟（歧义）', () => {
    const res = resolveKinship('爸爸的姐姐的儿子')
    expect(res).not.toBeNull()
    expect(res!.terms).toContain('表哥/表弟')
    expect(res!.ambiguous).toBe(true)
    expect(res!.reverse).toContain('表弟/表哥')
  })
  it('妈妈的弟弟 → 舅舅；反向为我称外甥/外甥女', () => {
    const res = resolveKinship('妈妈的弟弟')
    expect(res!.terms).toEqual(['舅舅'])
    const rev = resolveKinship('妈妈的弟弟', true)
    expect(rev!.terms).toEqual(['外甥/外甥女'])
  })
  it('老婆的弟弟 → 内弟/小舅子', () => {
    const res = resolveKinship('老婆的弟弟')
    expect(res).not.toBeNull()
    expect(res!.terms[0]).toContain('小舅子')
  })
  it('老公的哥哥 → 大伯子', () => {
    expect(resolveKinship('老公的哥哥')!.terms[0]).toContain('大伯子')
  })
  it('未知称谓返回 null 而非抛错', () => {
    expect(resolveKinship('邻居的猫')).toBeNull()
  })
  it('无法推导的组合返回 null', () => {
    // 哥哥的丈夫：关系图中未定义该边
    expect(resolveKinship('哥哥的丈夫')).toBeNull()
  })
  it('反向边回溯：侄子的爸爸 → 哥哥/弟弟（多候选歧义）', () => {
    const res = resolveKinship('侄子的爸爸')
    expect(res!.terms).toEqual(['哥哥', '弟弟'])
    expect(res!.ambiguous).toBe(true)
  })
  it('兄弟共享父母：爷爷的儿子 → 爸爸/伯伯/叔叔', () => {
    const res = resolveKinship('爷爷的儿子')
    expect(res!.terms).toEqual(['爸爸', '伯伯', '叔叔'])
    expect(res!.ambiguous).toBe(true)
  })
  it('叔叔的爸爸 → 爷爷（单一候选）', () => {
    expect(resolveKinship('叔叔的爸爸')!.terms).toEqual(['爷爷'])
  })
  it('外甥女的妈妈 → 姐姐/妹妹（按性别过滤候选）', () => {
    const res = resolveKinship('外甥女的妈妈')
    expect(res!.terms).toEqual(['姐姐', '妹妹'])
  })
})
