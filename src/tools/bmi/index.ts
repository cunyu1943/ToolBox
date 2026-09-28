/**
 * BMI（身体质量指数）。
 *
 * 公式 `体重(kg) / 身高(m)²`；英制走等价的 `703 × 磅 / 英寸²`（703 = 0.45359237 / 0.0254²，
 * 直接把磅当公斤、英寸当厘米会差出两个数量级）。
 * 分级同时给 WHO 成人标准与中国卫生行业标准 WS/T 428—2013 —— 两者的「超重」门槛差 1 个 BMI，
 * 只报一个数字会让人误判自己的位置。
 */

export type BmiUnit = 'metric' | 'imperial'

export interface BmiInput {
  unit: BmiUnit
  /** 公斤（公制）或磅（英制） */
  weight: number
  /** 厘米（公制）或英寸（英制） */
  height: number
}

export interface BmiGrade {
  label: string
  min: number
  /** 开区间上界；`null` 表示无上限 */
  max: number | null
}

export interface BmiRange {
  id: 'who' | 'cn'
  title: string
  source: string
  grades: BmiGrade[]
}

export interface BmiEntry {
  range: BmiRange
  grade: BmiGrade
}

export interface BmiResult {
  ok: boolean
  error?: string
  bmi: number | null
  /** 换算后的体重（公斤） */
  weightKg: number | null
  /** 换算后的身高（米） */
  heightM: number | null
  classifications: BmiEntry[]
  /** BMI 18.5–24.9 对应的体重区间 */
  healthyKg: { min: number; max: number } | null
  /** 距离「正常」区间还差多少公斤（负值=需减，正值=需增；0=已在区间内） */
  deltaKg: { toLower: number; toUpper: number } | null
  /** BMI ÷ 25，>1 即超重 */
  bmiPrime: number | null
  /** Ponderal 指数（kg/m³）：身高取三次方，对「同样 BMI 但更高更瘦」的区分度比 BMI 好一点 */
  ponderalIndex: number | null
  notes: string[]
}

export const BMI_RANGES: BmiRange[] = [
  {
    id: 'who',
    title: 'WHO 成人标准',
    source: 'WHO Physical status, 1995 技术报告 728 号',
    grades: [
      { label: '体重过低', min: 0, max: 18.5 },
      { label: '正常范围', min: 18.5, max: 25 },
      { label: '超重（前期）', min: 25, max: 30 },
      { label: '肥胖 I 度', min: 30, max: 35 },
      { label: '肥胖 II 度', min: 35, max: 40 },
      { label: '肥胖 III 度（重度）', min: 40, max: null }
    ]
  },
  {
    id: 'cn',
    title: '中国成人标准',
    source: '卫生行业标准 WS/T 428—2013（成人 BMI 的界限）',
    grades: [
      { label: '体重过低', min: 0, max: 18.5 },
      { label: '正常范围', min: 18.5, max: 24 },
      { label: '超重', min: 24, max: 28 },
      { label: '肥胖', min: 28, max: null }
    ]
  }
]

/** 身高/体重的合理受理范围（超出多半是单位填错，而不是真有人这么高） */
const LIMITS = {
  metric: { weight: [2, 400], height: [50, 272] },
  imperial: { weight: [4, 880], height: [20, 107] }
} as const

const KG_PER_LB = 0.45359237
const M_PER_IN = 0.0254

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function gradeOf(grades: BmiGrade[], bmi: number): BmiGrade | undefined {
  return grades.find((item) => bmi >= item.min && (item.max === null || bmi < item.max))
}

export function toMetric(input: BmiInput): { weightKg: number; heightM: number } | null {
  if (!Number.isFinite(input.weight) || !Number.isFinite(input.height)) return null
  if (input.unit === 'metric') return { weightKg: input.weight, heightM: input.height / 100 }
  return { weightKg: input.weight * KG_PER_LB, heightM: input.height * M_PER_IN }
}

export function computeBmi(input: BmiInput): BmiResult {
  const base: BmiResult = {
    ok: false,
    bmi: null,
    weightKg: null,
    heightM: null,
    classifications: [],
    healthyKg: null,
    deltaKg: null,
    bmiPrime: null,
    ponderalIndex: null,
    notes: []
  }

  const limits = LIMITS[input.unit]
  const weightRange = limits.weight
  const heightRange = limits.height
  if (!Number.isFinite(input.weight) || !Number.isFinite(input.height)) {
    return { ...base, error: '体重与身高都必须是数字。' }
  }
  if (input.weight <= 0 || input.height <= 0) {
    return { ...base, error: '体重与身高都必须大于 0。' }
  }
  if (input.weight < weightRange[0] || input.weight > weightRange[1]) {
    return {
      ...base,
      error: `体重应在 ${weightRange[0]}–${weightRange[1]} ${input.unit === 'metric' ? '公斤' : '磅'} 之间，是不是把磅填成了公斤？`
    }
  }
  if (input.height < heightRange[0] || input.height > heightRange[1]) {
    return {
      ...base,
      error: `身高应在 ${heightRange[0]}–${heightRange[1]} ${input.unit === 'metric' ? '厘米' : '英寸'} 之间，是不是把米填成了厘米？`
    }
  }

  const metric = toMetric(input)
  if (!metric) return { ...base, error: '单位换算失败，请检查输入。' }
  const { weightKg, heightM } = metric

  // 英制直接走 703 系数，避免两次换算引入的舍入差
  const bmi =
    input.unit === 'metric' ? weightKg / heightM ** 2 : (703 * input.weight) / input.height ** 2
  if (!Number.isFinite(bmi) || bmi <= 0) return { ...base, error: '计算结果不合理，请检查输入。' }

  const rounded = round(bmi, 1)
  const classifications: BmiEntry[] = []
  for (const range of BMI_RANGES) {
    const grade = gradeOf(range.grades, rounded)
    if (grade) classifications.push({ range, grade })
  }

  const healthyKg = { min: round(18.5 * heightM ** 2, 1), max: round(24.9 * heightM ** 2, 1) }
  const toLower = round(weightKg - healthyKg.min, 1)
  const toUpper = round(weightKg - healthyKg.max, 1)
  const deltaKg = toUpper <= 0 && toLower >= 0 ? null : { toLower, toUpper }

  const notes: string[] = []
  if (input.unit === 'imperial') {
    notes.push(`英制按 703 × 磅 ÷ 英寸² 计算，等价于 ${round(weightKg, 1)} kg / ${round(heightM, 2)} m。`)
  }
  const who = classifications.find((item) => item.range.id === 'who')
  const cn = classifications.find((item) => item.range.id === 'cn')
  if (who && cn && who.grade.label !== cn.grade.label) {
    notes.push(`两套标准给出的结论不同：WHO 是「${who.grade.label}」，中国标准是「${cn.grade.label}」—— 后者门槛更低，因为亚洲人群在更低的 BMI 上糖尿病与心血管风险就已上升。`)
  }
  if (rounded >= 25 || rounded < 18.5) {
    notes.push('BMI 只看身高与体重的比值，分不清脂肪、肌肉、骨骼与水分：体脂率低的力量训练者会被判「超重」，而腹型肥胖（腰围大、四肢细）可能落在「正常」里。建议同时看腰围与腰高比。')
  }
  notes.push('本工具按成人（18–64 岁）标准判读。儿童与青少年要用同年龄同性别的 BMI 百分位（生长曲线），65 岁以上、孕期与哺乳期、运动员的判读区间都不同，不能用这套门槛。')

  return {
    ok: true,
    bmi: rounded,
    weightKg: round(weightKg, 1),
    heightM: round(heightM, 2),
    classifications,
    healthyKg,
    deltaKg,
    bmiPrime: round(bmi / 25, 2),
    ponderalIndex: round(weightKg / heightM ** 3, 1),
    notes
  }
}

export interface BmiSample {
  label: string
  input: BmiInput
}

export const BMI_SAMPLES: BmiSample[] = [
  { label: '成人·正常', input: { unit: 'metric', weight: 65, height: 172 } },
  { label: '成人·超重', input: { unit: 'metric', weight: 82, height: 170 } },
  { label: '成人·肥胖', input: { unit: 'metric', weight: 105, height: 175 } },
  { label: '英制·150lb 5\'9"', input: { unit: 'imperial', weight: 150, height: 69 } }
]
