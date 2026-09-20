/**
 * 五险一金估算：给定缴费基数与公积金比例，算出个人 / 单位各项缴纳额与合计。
 * 默认比例为中国大陆常见档位，实际以当地最新政策为准。纯函数，供页面与单测复用。
 */
import { roundFloat } from './number'

export interface InsuranceItem {
  label: string
  /** 个人比例（%） */
  personalPct: number
  /** 单位比例（%） */
  companyPct: number
}

/** 除公积金外的固定项；公积金比例由参数控制（个人/单位通常同档） */
export function insuranceItems(housingFundPct: number): InsuranceItem[] {
  return [
    { label: '养老保险', personalPct: 8, companyPct: 16 },
    { label: '医疗保险', personalPct: 2, companyPct: 9.5 },
    { label: '失业保险', personalPct: 0.5, companyPct: 0.5 },
    { label: '工伤保险', personalPct: 0, companyPct: 0.4 },
    { label: '生育保险', personalPct: 0, companyPct: 0.8 },
    { label: '住房公积金', personalPct: housingFundPct, companyPct: housingFundPct }
  ]
}

export interface InsuranceRow extends InsuranceItem {
  personal: number
  company: number
}

export interface InsuranceResult {
  rows: InsuranceRow[]
  personalTotal: number
  companyTotal: number
  /** 个人缴纳合计（含公积金），即税前扣减 */
  takeHome: number
}

export function computeInsurance(base: number, housingFundPct: number): InsuranceResult {
  const b = Math.max(0, base)
  const rows: InsuranceRow[] = insuranceItems(housingFundPct).map((it) => ({
    ...it,
    personal: roundFloat((b * it.personalPct) / 100, 2),
    company: roundFloat((b * it.companyPct) / 100, 2)
  }))
  const personalTotal = roundFloat(
    rows.reduce((s, r) => s + r.personal, 0),
    2
  )
  const companyTotal = roundFloat(
    rows.reduce((s, r) => s + r.company, 0),
    2
  )
  return { rows, personalTotal, companyTotal, takeHome: roundFloat(b - personalTotal, 2) }
}
