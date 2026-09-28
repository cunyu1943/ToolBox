/**
 * 基础代谢率（BMR）与每日总消耗（TDEE）。
 *
 * 四个公式并存而不是只给一个，是因为它们对同一人的估算能差出 200 kcal 以上：
 * Mifflin–St Jeor 是当前指南推荐的首选（1990 年那批样本已含肥胖者），
 * Harris–Benedict 修订版出自 1918/1984，对肥胖人群系统性偏高；
 * Katch–McArdle 与 Cunningham 只用去脂体重算，所以**必须有体脂率**才能进这一支。
 * TDEE 的活动系数是 ACSM 常用档位，属群体平均，个体差异（NEAT、职业站立时长）能盖过公式误差。
 */

export type BmrSex = 'male' | 'female'

export interface BmrInput {
  sex: BmrSex
  /** 公斤 */
  weightKg: number
  /** 厘米 */
  heightCm: number
  /** 周岁 */
  age: number
  /** 体脂率（百分数），留空则跳过依赖它的两个公式 */
  bodyFatPercent: number | null
}

export type BmrFormulaId = 'mifflin' | 'harris' | 'katch' | 'cunningham'

export interface BmrFormula {
  id: BmrFormulaId
  name: string
  /** 展示用的公式文本 */
  expression: string
  note: string
}

export interface BmrValue extends BmrFormula {
  kcal: number | null
  /** kcal 为 null 时的原因（例如缺体脂率） */
  skipped?: string
}

export interface ActivityLevel {
  id: string
  label: string
  detail: string
  factor: number
}

export interface TdeeEntry {
  level: ActivityLevel
  kcal: number
  /** 若摄入只有 BMR 那么多时，按 1 kg ≈ 7700 kcal 折算的每周**减重**公斤数 */
  weeklyKg: number
}

export interface BmrResult {
  ok: boolean
  error?: string
  formulas: BmrValue[]
  /** 推荐值：有体脂率时用 Katch–McArdle，否则 Mifflin–St Jeor */
  preferred: BmrValue | null
  tdee: TdeeEntry[]
  /** 达成 ±weightLossKgPerWeek 所需的每日热量缺口（负值=需增重） */
  plan: { targetKgPerWeek: number; dailyKcalDelta: number; intake: number | null; note: string } | null
  leanMassKg: number | null
  notes: string[]
}

export const BMR_FORMULAS: BmrFormula[] = [
  {
    id: 'mifflin',
    name: 'Mifflin–St Jeor（1990）',
    expression: '男 10W + 6.25H − 5A + 5；女 10W + 6.25H − 5A − 161',
    note: '当前多数指南的首选，样本包含肥胖人群，整体偏差最小。'
  },
  {
    id: 'harris',
    name: 'Harris–Benedict 修订（Roza & Shizgal 1984）',
    expression: '男 88.362 + 13.397W + 4.799H − 5.677A；女 447.593 + 9.247W + 3.098H − 4.330A',
    note: '1918 年原式的重回归。对体重偏高者常高估 5–15%，原研究里静息代谢占成人总消耗的 60–75% 这条结论也已被修正。'
  },
  {
    id: 'katch',
    name: 'Katch–McArdle',
    expression: '370 + 21.6 × 去脂体重(kg)',
    note: '只看去脂体重，因此需要体脂率输入；对训练人群、体成分变化明显的人更贴合。'
  },
  {
    id: 'cunningham',
    name: 'Cunningham（1980）',
    expression: '500 + 22 × 去脂体重(kg)',
    note: '同样只看去脂体重，常数项更高，在高肌肉量人群里常给出四个公式中最大的值。'
  }
]

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { id: 'sedentary', label: '久坐', detail: '办公室工作 + 基本不运动', factor: 1.2 },
  { id: 'light', label: '轻度活动', detail: '每周 1–3 天轻度运动，或日常有步行', factor: 1.375 },
  { id: 'moderate', label: '中度活动', detail: '每周 3–5 天中等强度运动', factor: 1.55 },
  { id: 'active', label: '高度活动', detail: '每周 6–7 天运动，或体力劳动', factor: 1.725 },
  { id: 'athlete', label: '极高活动', detail: '每天两次训练、或重体力劳动 + 训练', factor: 1.9 }
]

/** 1 kg 人体脂肪组织约含 7700 kcal 可用能量（实际 7000–7700，取保守值） */
export const KCAL_PER_KG = 7700

const round = (value: number, digits = 0): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function computeBmr(input: BmrInput, targetKgPerWeek = 0.5): BmrResult {
  const empty: BmrResult = {
    ok: false,
    formulas: [],
    preferred: null,
    tdee: [],
    plan: null,
    leanMassKg: null,
    notes: []
  }
  const { weightKg, heightCm, age } = input
  if (![weightKg, heightCm, age].every((n) => Number.isFinite(n))) return { ...empty, error: '体重、身高、年龄都必须是数字。' }
  if (weightKg < 20 || weightKg > 300) return { ...empty, error: '体重请在 20–300 公斤之间。' }
  if (heightCm < 100 || heightCm > 230) return { ...empty, error: '身高请在 100–230 厘米之间。' }
  if (age < 16 || age > 100) return { ...empty, error: '这些公式的验证样本是成年人，年龄请在 16–100 之间。' }
  const fat = input.bodyFatPercent
  if (fat !== null && (!Number.isFinite(fat) || fat <= 3 || fat > 70)) {
    return { ...empty, error: '体脂率若填写，需在 3–70% 之间（男性必需脂约 2–5%，实测误差常在 ±3 个百分点）。' }
  }

  const sign = input.sex === 'male' ? 1 : -1
  const mifflin = 10 * weightKg + 6.25 * heightCm - 5 * age + (sign === 1 ? 5 : -161)
  const harris =
    input.sex === 'male'
      ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
      : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age
  const leanMassKg = fat === null ? null : round(weightKg * (1 - fat / 100), 1)
  const katch = leanMassKg === null ? null : 370 + 21.6 * leanMassKg
  const cunningham = leanMassKg === null ? null : 500 + 22 * leanMassKg

  const values: Record<BmrFormulaId, number | null> = {
    mifflin: round(mifflin),
    harris: round(harris),
    katch: katch === null ? null : round(katch),
    cunningham: cunningham === null ? null : round(cunningham)
  }

  const formulas: BmrValue[] = BMR_FORMULAS.map((formula) => ({
    ...formula,
    kcal: values[formula.id],
    skipped:
      values[formula.id] === null
        ? '需要体脂率才能算（这一支只看去脂体重）。'
        : undefined
  }))

  const preferred =
    (formulas.find((item) => item.id === 'katch' && item.kcal !== null) ??
      formulas.find((item) => item.id === 'mifflin')) ||
    null

  const basis = preferred?.kcal
  const tdee: TdeeEntry[] =
    basis === null || basis === undefined
      ? []
      : ACTIVITY_LEVELS.map((level) => {
          const kcal = round(basis * level.factor)
          return { level, kcal, weeklyKg: round(((kcal - basis) * 7) / KCAL_PER_KG, 2) }
        })

  let plan: BmrResult['plan'] = null
  if (basis !== null && basis !== undefined && tdee.length) {
    const maintenance = tdee.find((item) => item.level.id === 'moderate') ?? tdee[0]
    const delta = round((targetKgPerWeek * KCAL_PER_KG) / 7)
    const intake = maintenance ? round(maintenance.kcal - delta) : null
    const tooAggressive = Math.abs(targetKgPerWeek) >= 1
    plan = {
      targetKgPerWeek,
      dailyKcalDelta: delta,
      intake,
      note: tooAggressive
        ? '每周变化超过 1 公斤通常需要极低热量饮食或大幅超食，前者会连带掉肌肉、压低代谢，后者多半长脂肪。建议按 0.25–0.75 公斤/周走。'
        : targetKgPerWeek === 0
          ? '维持量的意义在于「按周取平均」：单日上下浮动 500 kcal 很常见，看 2–3 周的趋势而不是某一天。'
          : intake !== null && basis !== null && intake < basis
            ? '摄入低于基础代谢并不等于「更安全」：长期低于 BMR 会先掉肌肉、再压低代谢。蛋白质与抗阻训练要一起跟上。'
            : '这里按 1 kg 脂肪 ≈ 7700 kcal 线性折算，实际前两周会因糖原与水分变化而偏离，之后才接近这条线。'
    }
  }

  const notes: string[] = []
  const spread = formulas.filter((item) => item.kcal !== null).map((item) => item.kcal as number)
  if (spread.length >= 2) {
    notes.push(
      `四个公式对同一个人的估算从 ${Math.min(...spread)} 到 ${Math.max(...spread)} kcal，差 ${Math.max(...spread) - Math.min(...spread)} kcal —— 这就是为什么「日摄 2000 kcal」这类统一数字只能当起点，要按 2–3 周的体重与腰围趋势回调。`
    )
  }
  if (input.sex === 'female') notes.push('女性的公式常数项低 166 kcal，主要来自平均去脂体重更低；个体差异远大于这一性别项。')
  notes.push('BMR 是「静息、空腹、25 ℃、完全不活动」的消耗，约占总消耗 60–70%；食物热效应（约 10%）与活动消耗是另外两块。')
  notes.push('估算用于健康人群的参考，不替代代谢车实测。甲状腺疾病、孕期哺乳期、进食障碍史、肾功能不全者请遵医嘱，不要据此自行设定摄入。')

  return { ok: true, formulas, preferred, tdee, plan, leanMassKg, notes }
}

export interface BmrSample {
  label: string
  input: BmrInput
}

export const BMR_SAMPLES: BmrSample[] = [
  { label: '男·30·中等活动', input: { sex: 'male', weightKg: 75, heightCm: 178, age: 30, bodyFatPercent: 18 } },
  { label: '女·28·久坐', input: { sex: 'female', weightKg: 58, heightCm: 163, age: 28, bodyFatPercent: 27 } },
  { label: '不知体脂（只算两式）', input: { sex: 'male', weightKg: 92, heightCm: 180, age: 45, bodyFatPercent: null } }
]
