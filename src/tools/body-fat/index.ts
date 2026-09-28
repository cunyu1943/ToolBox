/**
 * 体脂率估算与身体成分换算。
 *
 * 估算只走 **Deurenberg 1991 的 BMI 回归**这一条：`体脂% = 1.20·BMI + 0.23·年龄 − 10.8·性别(男1女0) − 5.4`。
 * 网传很广的「美国海军周长法」这里**故意不实现** —— 它的常数与输入单位绑定（英寸那套与厘米那套不是同一组系数），
 * 而网上流传的多个版本互相矛盾、无法在离线环境里核对；健康数值上「给一个来源不明的常数」比「不给」更糟。
 * 需要更贴近个体的数字，就用手上的实测值（体脂秤 / DXA / 皮褶）走 `measuredPercent` 这一条：
 * 由它推脂肪量、去脂体重与目标体重都是纯算术，不含估算误差。
 *
 * 围度部分给腰围、腰高比、腰臀比三项，切点用中国卫生行业标准 WS/T 428—2013 与 WHO 的公开阈值 ——
 * 这三项比体脂率更能反映代谢风险，因为它们指向的是脂肪**长在哪**。
 */

export type FatSex = 'male' | 'female'

export interface BodyFatInput {
  sex: FatSex
  weightKg: number
  heightCm: number
  /** 周岁，Deurenberg 回归必需 */
  age: number | null
  waistCm: number | null
  hipCm: number | null
  /** 手上已有的实测体脂率（体脂秤 / DXA / 皮褶），填了就优先用它做换算 */
  measuredPercent: number | null
}

export interface FatMethod {
  id: 'measured' | 'deurenberg'
  name: string
  expression: string
  percent: number | null
  skipped?: string
  note: string
}

export interface FatGrade {
  label: string
  min: number
  /** `null` 表示无上限 */
  max: number | null
}

export interface RiskMark {
  label: string
  value: number | null
  grade: string
  threshold: string
}

export interface FatResult {
  ok: boolean
  error?: string
  methods: FatMethod[]
  /** 主用值：有实测用实测，否则用 Deurenberg */
  percent: number | null
  percentSource: string | null
  fatMassKg: number | null
  leanMassKg: number | null
  grade: FatGrade | null
  grades: FatGrade[]
  bmi: number | null
  risk: RiskMark[]
  /** 去脂体重不变时，达到各目标体脂率所需的体重 */
  weightAt: { percent: number; weightKg: number; deltaKg: number }[]
  notes: string[]
}

/** ACE（美国运动委员会）常用分级 */
export const ACE_GRADES: Record<FatSex, FatGrade[]> = {
  male: [
    { label: '必需脂肪', min: 2, max: 5 },
    { label: '运动员', min: 6, max: 13 },
    { label: '健康', min: 14, max: 17 },
    { label: '可接受', min: 18, max: 24 },
    { label: '偏高（肥胖）', min: 25, max: null }
  ],
  female: [
    { label: '必需脂肪', min: 10, max: 13 },
    { label: '运动员', min: 14, max: 20 },
    { label: '健康', min: 21, max: 24 },
    { label: '可接受', min: 25, max: 31 },
    { label: '偏高（肥胖）', min: 32, max: null }
  ]
}

/** 中国 WS/T 428—2013 的中心型肥胖腰围切点（WHO 的高腰围切点更宽） */
export const WAIST_CUTS: Record<FatSex, { cn: number; who: number }> = {
  male: { cn: 90, who: 102 },
  female: { cn: 85, who: 88 }
}

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function whtrGrade(whtr: number): string {
  if (whtr < 0.5) return '低风险（常用建议线是「腰围不到身高的一半」）'
  if (whtr < 0.6) return '风险增加'
  return '风险显著增加'
}

export function computeBodyFat(input: BodyFatInput): FatResult {
  const empty: FatResult = {
    ok: false,
    methods: [],
    percent: null,
    percentSource: null,
    fatMassKg: null,
    leanMassKg: null,
    grade: null,
    grades: ACE_GRADES[input.sex] ?? [],
    bmi: null,
    risk: [],
    weightAt: [],
    notes: []
  }

  if (!Number.isFinite(input.weightKg) || input.weightKg < 20 || input.weightKg > 300) {
    return { ...empty, error: '体重请在 20–300 公斤之间。' }
  }
  if (!Number.isFinite(input.heightCm) || input.heightCm < 100 || input.heightCm > 230) {
    return { ...empty, error: '身高请在 100–230 厘米之间。' }
  }
  if (input.age !== null && (!Number.isFinite(input.age) || input.age < 16 || input.age > 100)) {
    return { ...empty, error: '年龄若填写，请在 16–100 之间（这一回归只在成年人样本上拟合）。' }
  }
  if (input.waistCm !== null && (!Number.isFinite(input.waistCm) || input.waistCm < 40 || input.waistCm > 200)) {
    return { ...empty, error: '腰围若填写，请在 40–200 厘米之间。' }
  }
  if (input.hipCm !== null && (!Number.isFinite(input.hipCm) || input.hipCm < 40 || input.hipCm > 200)) {
    return { ...empty, error: '臀围若填写，请在 40–200 厘米之间。' }
  }
  if (input.measuredPercent !== null && (!Number.isFinite(input.measuredPercent) || input.measuredPercent < 3 || input.measuredPercent > 70)) {
    return { ...empty, error: '实测体脂率若填写，请在 3–70% 之间。男性的必需脂肪约 2–5%，低于这个区间的数据基本可以判定为测量误差。' }
  }

  const heightM = input.heightCm / 100
  const bmi = round(input.weightKg / heightM ** 2, 1)

  const deurenberg =
    input.age === null ? null : 1.2 * (input.weightKg / heightM ** 2) + 0.23 * input.age - 10.8 * (input.sex === 'male' ? 1 : 0) - 5.4
  const deurenbergUsable = deurenberg === null || deurenberg < 1 || deurenberg > 70 ? null : round(deurenberg)

  const methods: FatMethod[] = [
    {
      id: 'measured',
      name: '实测值换算',
      expression: '直接用你手上的体脂率（体脂秤 / DXA / 皮褶）',
      percent: input.measuredPercent === null ? null : round(input.measuredPercent),
      skipped: input.measuredPercent === null ? '没有填写实测体脂率。' : undefined,
      note: '只要数字来自同一台设备、同一时段、同一状态，它的「趋势」就比任何公式估算都可信；绝对值仍受设备误差影响。'
    },
    {
      id: 'deurenberg',
      name: 'Deurenberg BMI 回归（1991）',
      expression: '体脂% = 1.20·BMI + 0.23·年龄 − 10.8·性别(男1女0) − 5.4',
      percent: deurenbergUsable,
      skipped: input.age === null ? '需要年龄才能算这一条。' : deurenbergUsable === null ? '回归结果落在 1–70% 之外，说明身高体重组合本身不合理。' : undefined,
      note: '群体层面的回归，把「同样 BMI 就有同样体脂」当常数：肌肉型会低估，老年人（去脂体重流失但 BMI 不变）会低估真实脂肪，消瘦型会高估。'
    }
  ]

  const percent = input.measuredPercent !== null ? round(input.measuredPercent) : deurenbergUsable
  const percentSource =
    percent === null ? null : input.measuredPercent !== null ? '实测值（优先采用）' : 'Deurenberg 回归估算'

  const grades = ACE_GRADES[input.sex]
  const grade =
    percent === null
      ? null
      : grades.find((item) => percent >= item.min && (item.max === null || percent < item.max)) ?? null

  const fatMassKg = percent === null ? null : round(input.weightKg * (percent / 100), 1)
  const leanMassKg = percent === null ? null : round(input.weightKg - (input.weightKg * percent) / 100, 1)

  const cuts = WAIST_CUTS[input.sex]
  const risk: RiskMark[] = []
  if (input.waistCm !== null) {
    risk.push({
      label: '腰围',
      value: round(input.waistCm),
      grade: input.waistCm >= cuts.cn ? (input.waistCm >= cuts.who ? '明显偏高' : '达到中心型肥胖判定线') : '在判定线以下',
      threshold: `中国 WS/T 428—2013：${input.sex === 'male' ? '男' : '女'} ≥${cuts.cn} cm 判为中心型肥胖；WHO 的高腰围切点是 ${cuts.who} cm`
    })
    const ratio = round(input.waistCm / (heightM * 100), 2)
    risk.push({
      label: '腰高比（WHtR）',
      value: ratio,
      grade: whtrGrade(ratio),
      threshold: '常用切点：<0.5 低风险，0.5–0.6 风险增加，≥0.6 风险显著增加。对身高极端的人比 BMI 更公平。'
    })
  }
  if (input.waistCm !== null && input.hipCm !== null && input.hipCm > 0) {
    const whr = round(input.waistCm / input.hipCm, 2)
    const cut = input.sex === 'male' ? 0.9 : 0.85
    risk.push({
      label: '腰臀比（WHR）',
      value: whr,
      grade: whr >= cut ? '达到 WHO 的中心型脂肪分布判定线' : '未达判定线',
      threshold: `WHO 判定线：${input.sex === 'male' ? '男 ≥0.90' : '女 ≥0.85'}`
    })
  }

  const weightAt: FatResult['weightAt'] = []
  if (leanMassKg !== null && leanMassKg > 0) {
    for (const target of [15, 18, 20, 22, 25, 30]) {
      const weightKg = round(leanMassKg / (1 - target / 100), 1)
      weightAt.push({ percent: target, weightKg, deltaKg: round(weightKg - input.weightKg, 1) })
    }
  }

  const notes: string[] = []
  if (percent === null) {
    notes.push('填年龄就能得到 Deurenberg 估算；已有体脂秤或 DXA 数字就填进「实测体脂率」，下面的脂肪量与目标体重会改用实测值。')
  }
  if (input.measuredPercent !== null && deurenbergUsable !== null && Math.abs(deurenbergUsable - round(input.measuredPercent)) >= 6) {
    notes.push(`实测与 BMI 回归相差 ${Math.abs(deurenbergUsable - round(input.measuredPercent))} 个百分点。这通常意味着体成分偏离群体平均（肌肉量高，或脂肪集中在腹部），不是「哪个坏了」—— 以你的目标为准：看健康风险用腰围与腰高比，看身体成分用同一设备的趋势。`)
  }
  notes.push('体脂率本身没有统一真值：DXA、水下称重、Bod Pod、生物电阻抗（家用体脂秤多用它）对同一人可差 3–5 个百分点，且会随进食、饮水、皮肤温度与当天水合状态漂移。要比较，就固定「同一设备 + 同一时间 + 同一状态」。')
  notes.push('BMI 回归看不到脂肪分布。两个人同样 25% 体脂，脂肪在皮下的大概率代谢正常，脂肪在内脏与肝脏的那位更接近糖尿病与心血管风险 —— 所以下面单列了腰围、腰高比与腰臀比。')
  notes.push('必需脂肪不可再降：男性约 2–5%、女性约 10–13%，低于此区间会影响激素与骨密度。女性体脂率天然高于男性约 10 个百分点，这是生殖生理，不是「超标」。')
  notes.push('本页只做健康人群参考。孕期、哺乳期、未成年人、65 岁以上，以及有进食障碍史、甲状腺疾病、水肿或心肾功能问题的人，体脂率与这些切点都不适用，请走临床评估。')

  return {
    ok: true,
    methods,
    percent,
    percentSource,
    fatMassKg,
    leanMassKg,
    grade,
    grades,
    bmi,
    risk,
    weightAt,
    notes
  }
}

export interface FatSample {
  label: string
  input: BodyFatInput
}

export const BODY_FAT_SAMPLES: FatSample[] = [
  { label: '男·健康区间', input: { sex: 'male', weightKg: 72, heightCm: 175, age: 30, waistCm: 80, hipCm: 94, measuredPercent: null } },
  { label: '男·腹部偏高', input: { sex: 'male', weightKg: 92, heightCm: 172, age: 45, waistCm: 100, hipCm: 102, measuredPercent: null } },
  { label: '女·运动员', input: { sex: 'female', weightKg: 58, heightCm: 168, age: 26, waistCm: 66, hipCm: 92, measuredPercent: 17 } },
  { label: '只看 BMI 与年龄', input: { sex: 'female', weightKg: 66, heightCm: 160, age: 52, waistCm: 82, hipCm: 100, measuredPercent: null } }
]
