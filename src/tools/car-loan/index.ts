/**
 * 车贷。与房贷的分期数学不同之处：4S 店常见的「等本等息 / 免息贴息」方案里，
 * 利息是按**全额本金**固定收取的（每月 本金/n + 本金×月费率），不随剩余本金递减，
 * 所以名义费率看着很低、真实年化接近它的两倍。本模块用 IRR 反解出这一档的真实年化。
 */
import { buildPlan, type LoanPlan } from '../mortgage/index.ts'

export type CarLoanMode = 'annuity' | 'flat'

export const CAR_LOAN_MODE_LABELS: { value: CarLoanMode; label: string; detail: string }[] = [
  { value: 'annuity', label: '等额本息（银行口径年利率）', detail: '利息按剩余本金计算，月供固定，真实年化就是名义年利率' },
  { value: 'flat', label: '等本等息（4S 店费率口径）', detail: '每月还 本金/n + 全额本金×月费率，费率不变但本金在降 —— 真实年化接近费率的两倍' }
]

/** 购置税法（2019-07-01 施行）：税率 10%，计税价格为不含增值税的价格；机动车增值税率 13% */
export const VAT_RATE = 0.13
export const PURCHASE_TAX_RATE = 0.1

export const estimatePurchaseTax = (priceYuan: number): number =>
  Math.round(((priceYuan / (1 + VAT_RATE)) * PURCHASE_TAX_RATE) / 100) * 100

/**
 * 手续费式（等本等息）的真实月利率：解 P = c·(1−(1+i)^−n)/i。
 * 右边对 i 单调递减，用二分；i=0 时右端极限为 P（无息），此时真实年化即 0。
 */
export function flatMonthlyRate(loanYuan: number, monthlyFeeRatePct: number, months: number): number {
  if (loanYuan <= 0 || months <= 0 || monthlyFeeRatePct <= 0) return 0
  const payment = loanYuan / months + (loanYuan * monthlyFeeRatePct) / 100
  const pv = (i: number): number =>
    i === 0 ? payment * months : (payment * (1 - (1 + i) ** -months)) / i

  let low = 0
  let high = 1
  // pv(low) >= loanYuan 且 pv(high) 远小于 loanYuan 才能二分
  if (pv(low) <= loanYuan) return 0
  for (let step = 0; step < 80; step++) {
    const mid = (low + high) / 2
    if (pv(mid) > loanYuan) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export interface CarLoanInput {
  /** 车价（万元） */
  priceWan: number
  /** 首付比例（%） */
  downPercent: number
  /** 贷款年限 */
  years: number
  /** 等额本息为年利率；等本等息为月费率（两者都在这一栏输入，口径由 mode 决定） */
  ratePct: number
  mode: CarLoanMode
  /** 落地价附加项（元） */
  purchaseTax: number
  insurance: number
  plateFee: number
}

export interface CarLoanResult {
  ok: boolean
  error?: string
  priceYuan: number
  downPayment: number
  loanYuan: number
  months: number
  monthlyPayment: number
  totalInterest: number
  totalPayment: number
  extraFees: number
  landingPrice: number
  totalCost: number
  /** 等本等息模式下反解出的真实年化（名义 % 与实际年成本 %）；等额本息为 null */
  effective: { nominalAprPct: number; effectiveAnnualPct: number; feePct: number } | null
  /** 同一笔钱若按等额本息还，月供与总利息 */
  annuityCompare: LoanPlan | null
  notes: string[]
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

export function computeCarLoan(input: CarLoanInput): CarLoanResult {
  const empty: CarLoanResult = {
    ok: false,
    priceYuan: 0,
    downPayment: 0,
    loanYuan: 0,
    months: 0,
    monthlyPayment: 0,
    totalInterest: 0,
    totalPayment: 0,
    extraFees: 0,
    landingPrice: 0,
    totalCost: 0,
    effective: null,
    annuityCompare: null,
    notes: []
  }

  const { priceWan, downPercent, years, ratePct, mode } = input
  if (!Number.isFinite(priceWan) || !Number.isFinite(years) || !Number.isFinite(ratePct)) {
    return { ...empty, error: '车价、年限与利率都必须是数字。' }
  }
  if (priceWan <= 0 || priceWan > 2000) {
    return { ...empty, error: '车价按万元输入，支持 0–2000 万。' }
  }
  if (!Number.isFinite(downPercent) || downPercent < 0 || downPercent > 100) {
    return { ...empty, error: '首付比例应在 0–100% 之间。' }
  }
  if (years < 1 || years > 10) {
    return { ...empty, error: '车贷年限一般在 1–10 年（多数银行做到 1–5 年）。' }
  }
  if (ratePct < 0 || ratePct > 30) {
    return { ...empty, error: '利率或月费率应在 0–30% 之间。' }
  }

  const priceYuan = round2(priceWan * 10000)
  const downPayment = round2((priceYuan * downPercent) / 100)
  const loanYuan = round2(priceYuan - downPayment)
  const months = Math.round(years * 12)
  if (loanYuan <= 0) {
    return { ...empty, error: '贷款金额为 0：首付比例到 100% 了，全款就没有利息这回事。' }
  }

  const extraFees = round2(
    (input.purchaseTax || 0) + (input.insurance || 0) + (input.plateFee || 0)
  )

  let monthlyPayment = 0
  let totalInterest = 0
  let totalPayment = 0
  let effective: CarLoanResult['effective'] = null
  const notes: string[] = []

  if (mode === 'annuity') {
    const plan = buildPlan(loanYuan, ratePct, years, 'annuity')
    monthlyPayment = plan.firstPayment
    totalInterest = plan.totalInterest
    totalPayment = plan.totalPayment
  } else {
    monthlyPayment = round2(loanYuan / months + (loanYuan * ratePct) / 100)
    totalInterest = round2(((loanYuan * ratePct) / 100) * months)
    totalPayment = round2(loanYuan + totalInterest)
    const i = flatMonthlyRate(loanYuan, ratePct, months)
    effective = {
      nominalAprPct: round2(i * 12 * 100),
      effectiveAnnualPct: round2(((1 + i) ** 12 - 1) * 100),
      feePct: ratePct
    }
    notes.push(
      `月费率 ${ratePct}%（年化费率 ${(ratePct * 12).toFixed(2)}%）按全额本金收取，反解出的真实年化是 ${round2(i * 12 * 100)}%、实际年成本 ${round2(((1 + i) ** 12 - 1) * 100)}% —— 因为本金还得只剩一半时，利息还按最初的全额在收。`
    )
  }

  const annuityCompare = mode === 'flat' ? buildPlan(loanYuan, effective ? round2(effective.nominalAprPct) : 0, years, 'annuity') : null
  if (annuityCompare && effective) {
    notes.push(
      `按真实年化 ${effective.nominalAprPct}% 改用等额本息，月供约 ${annuityCompare.firstPayment.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元、总利息 ${annuityCompare.totalInterest.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元，比费率方案的 ${totalInterest.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元少 ${round2(totalInterest - annuityCompare.totalInterest).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元。`
    )
  }
  if (downPercent < 20) {
    notes.push('首付低于 20% 在多数银行的汽车分期里属于低首付档，利率更高、还可能要求额外保证金或指定保险。')
  }
  notes.push('「总花费」= 首付 + 全部还款 + 购置税/保险/上牌等杂费，不含油电费、保养、停车与过路费；这些才是养车的大头。')
  notes.push('保险与购置税按你填的金额计入，购置税可用「按 10% 估算」按钮：计税价格≈发票价÷1.13（机动车增值税率 13%），新能源车的减免政策与限额以购车当期公告为准。')

  return {
    ok: true,
    priceYuan,
    downPayment,
    loanYuan,
    months,
    monthlyPayment,
    totalInterest,
    totalPayment,
    extraFees,
    landingPrice: round2(priceYuan + extraFees),
    totalCost: round2(downPayment + totalPayment + extraFees),
    effective,
    annuityCompare,
    notes
  }
}

export interface CarLoanSample {
  label: string
  input: CarLoanInput
}

export const CAR_LOAN_SAMPLES: CarLoanSample[] = [
  {
    label: '20万·30%·3年·等额本息 4.5%',
    input: { priceWan: 20, downPercent: 30, years: 3, ratePct: 4.5, mode: 'annuity', purchaseTax: 0, insurance: 0, plateFee: 0 }
  },
  {
    label: '20万·30%·3年·月费率 0.25%',
    input: { priceWan: 20, downPercent: 30, years: 3, ratePct: 0.25, mode: 'flat', purchaseTax: 0, insurance: 0, plateFee: 0 }
  },
  {
    label: '35万·50%·5年·月费率 0.35%',
    input: { priceWan: 35, downPercent: 50, years: 5, ratePct: 0.35, mode: 'flat', purchaseTax: 0, insurance: 0, plateFee: 0 }
  }
]
