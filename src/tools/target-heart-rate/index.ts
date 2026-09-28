/**
 * 靶心率区间（两种算法并行给出，因为它们对同一人的区间能差 10 次/分以上）。
 *
 * 1. **%HRmax 法**：区间 = 最大心率 × 强度百分比。简单，但把每个人的最大心率当作同一年龄常数，
 *    静息心率高的久坐者与运动员会被算成同样的区间。
 * 2. **Karvonen 储备心率法**：目标 = (HRmax − HRrest) × 强度 + HRrest。把静息心率纳进来，
 *    同一百分比对应的实际强度更贴近生理，所以康复与训练计划多用它。
 *
 * HRmax 同时给四个回归式：Fox/Haskill 的 `220 − 年龄` 流传最广但误差也最大（个体 SD 约 ±10–12 bpm，
 * 且对老年人群偏低），Tanaka、Gellish、Nes 是后续更大样本的拟合。若能实测（负荷试验或全力冲刺后
 * 15–30 秒内的峰值），一定要用实测值覆盖估算。
 */

export interface HeartRateInput {
  age: number
  /** 静息心率：早晨清醒后卧床 1 分钟测，取一周平均最稳 */
  restingHr: number
  /** 实测最大心率，优先于所有估算式 */
  measuredMax: number | null
}

export interface MaxHrFormula {
  id: string
  name: string
  expression: string
  /** `SD` 是原研究的个体离散度或后续综述给出的误差范围 */
  accuracy: string
  value: number | null
  used: boolean
}

export interface HrZone {
  id: string
  label: string
  /** 强度区间（两种算法共用同一组百分比） */
  lowerPct: number
  upperPct: number
  feel: string
  use: string
  /** 按 %HRmax 算的心率上下界 */
  maxHrBased: { lower: number; upper: number }
  /** 按 Karvonen 储备心率算的心率上下界 */
  karvonen: { lower: number; upper: number }
}

export interface HeartRateResult {
  ok: boolean
  error?: string
  formulas: MaxHrFormula[]
  maxHr: number | null
  maxHrSource: string | null
  hrr: number | null
  zones: HrZone[]
  /** 世界卫生组织 / ACSM 的每周 150–300 分钟中等强度建议所对应的区间 */
  moderate: { lower: number; upper: number } | null
  vigorous: { lower: number; upper: number } | null
  notes: string[]
}

export const HR_ZONE_DEFS: Omit<HrZone, 'maxHrBased' | 'karvonen'>[] = [
  {
    id: 'z1',
    label: 'Z1 很轻（50–60%）',
    lowerPct: 0.5,
    upperPct: 0.6,
    feel: '能轻松聊完整句话，鼻呼吸不费力',
    use: '热身、放松、主动恢复；对血压与血糖的改善有意义，但训练刺激很小'
  },
  {
    id: 'z2',
    label: 'Z2 轻度（60–70%）',
    lowerPct: 0.6,
    upperPct: 0.7,
    feel: '能说话、唱不了歌',
    use: '基础耐力与线粒体适应的主要区间，脂肪供能占比最高。注意：占比高不等于总热量多（见页脚说明）'
  },
  {
    id: 'z3',
    label: 'Z3 中度（70–80%）',
    lowerPct: 0.7,
    upperPct: 0.8,
    feel: '只能说短句，呼吸明显加深',
    use: '有氧耐力主体，对应「每周 150–300 分钟中等强度」这一档'
  },
  {
    id: 'z4',
    label: 'Z4 较大（80–90%）',
    lowerPct: 0.8,
    upperPct: 0.9,
    feel: '只能吐单词，腿部开始发胀',
    use: '乳酸阈附近，间歇训练的主力区间，每次持续 2–8 分钟'
  },
  {
    id: 'z5',
    label: 'Z5 极限（90–100%）',
    lowerPct: 0.9,
    upperPct: 1,
    feel: '无法说话，只能维持几十秒到一两分钟',
    use: '无氧能力与冲刺；健康人群不必刻意进入，心血管疾病风险者应避免'
  }
]

const MAX_HR_FORMULAS: Omit<MaxHrFormula, 'value' | 'used'>[] = [
  { id: 'fox', name: 'Fox / Haskell（220 − 年龄）', expression: '220 − 年龄', accuracy: '1971 年那篇只有 11 个数据点的综述图表，被引用成「标准式」。后续复核发现个体 SD 约 ±10–12 bpm，且对 40 岁以上系统性低估。' },
  { id: 'tanaka', name: 'Tanaka（208 − 0.7×年龄）', expression: '208 − 0.7 × 年龄', accuracy: '2001 年 351 项研究的汇总，成人各年龄段偏差较均匀，是较稳妥的默认选择。' },
  { id: 'gellish', name: 'Gellish（207 − 0.7×年龄）', expression: '207 − 0.7 × 年龄', accuracy: '来自纵向实测队列，男女分开拟合后系数几乎一致，故合并为一条。' },
  { id: 'nes', name: 'Nes（211 − 0.56×年龄，普通活动人群）', expression: '211 − 0.56 × 年龄', accuracy: '挪威健康人群队列（22–90 岁），年龄项斜率更缓；对规律运动者偏高、对久坐者更接近 Fox。' }
]

const round = (value: number): number => Math.round(value)

export function estimateMaxHr(age: number): Record<string, number> {
  return {
    fox: round(220 - age),
    tanaka: round(208 - 0.7 * age),
    gellish: round(207 - 0.7 * age),
    nes: round(211 - 0.56 * age)
  }
}

export function computeHeartRate(input: HeartRateInput): HeartRateResult {
  const empty: HeartRateResult = {
    ok: false,
    formulas: [],
    maxHr: null,
    maxHrSource: null,
    hrr: null,
    zones: [],
    moderate: null,
    vigorous: null,
    notes: []
  }
  if (!Number.isFinite(input.age) || input.age < 10 || input.age > 100) {
    return { ...empty, error: '年龄请在 10–100 之间。儿童与少年的最大心率变异更大，需在监护与专业指导下使用。' }
  }
  if (!Number.isFinite(input.restingHr) || input.restingHr < 30 || input.restingHr > 120) {
    return { ...empty, error: '静息心率请在 30–120 之间（长期训练者常低于 50，测量时的紧张会把数字抬高）。' }
  }
  if (input.measuredMax !== null && (!Number.isFinite(input.measuredMax) || input.measuredMax < 100 || input.measuredMax > 230)) {
    return { ...empty, error: '实测最大心率若填写，请在 100–230 之间。' }
  }

  const estimates = estimateMaxHr(input.age)
  const formulas: MaxHrFormula[] = MAX_HR_FORMULAS.map((formula) => ({
    ...formula,
    value: estimates[formula.id] ?? null,
    used: false
  }))

  let maxHr: number | null = null
  let maxHrSource: string | null = null
  if (input.measuredMax !== null) {
    maxHr = round(input.measuredMax)
    maxHrSource = '实测最大心率（最可靠，请优先使用）'
  } else {
    // 无实测时以 Tanaka 为默认，它在大样本汇总里最平衡
    maxHr = estimates.tanaka ?? null
    maxHrSource = 'Tanaka 式估算（208 − 0.7×年龄）。四个式子都给在下面的对照里。'
  }
  if (maxHr === null) return { ...empty, error: '最大心率估算失败。' }

  const target = formulas.find((item) => item.name.startsWith('Tanaka'))
  if (target && input.measuredMax === null) target.used = true
  else if (input.measuredMax !== null) formulas.forEach((item) => (item.used = false))

  const hrr = maxHr - input.restingHr
  if (hrr <= 20) {
    return {
      ...empty,
      error: `储备心率只有 ${hrr} 次/分（最大 − 静息），说明静息心率与估算的最大心率太接近，区间算不出来。若静息心率是被紧张抬高的，请改测晨起卧床值；若在服用影响心率的药物，请直接听医生给的区间。`
    }
  }

  const zones: HrZone[] = HR_ZONE_DEFS.map((def) => ({
    ...def,
    maxHrBased: { lower: round(maxHr * def.lowerPct), upper: round(maxHr * def.upperPct) },
    karvonen: {
      lower: round(hrr * def.lowerPct + input.restingHr),
      upper: round(hrr * def.upperPct + input.restingHr)
    }
  }))

  const z3 = zones.find((zone) => zone.id === 'z3') ?? null
  const z4 = zones.find((zone) => zone.id === 'z4') ?? null

  const notes: string[] = []
  const spread = formulas.filter((item) => item.value !== null).map((item) => item.value as number)
  notes.push(
    `四个估算式对 ${input.age} 岁给出的最大心率从 ${Math.min(...spread)} 到 ${Math.max(...spread)} 次/分。年龄公式的个体误差远大于式子之间的差别 —— 有实测就用实测，没有就用 Tanaka 起步、按训练后的恢复速度与主观费力程度回调。`
  )
  notes.push('「燃脂区」这个说法容易误导：低强度时脂肪供能「占比」高，但每分钟总热量消耗也低。走 60 分钟 Z2 与跑 60 分钟 Z4，前者脂肪比例高、后者总消耗大，减脂看的是总消耗与饮食，不是比例。')
  notes.push('在服用 β 受体阻滞剂、部分抗心律失常药、含伪麻黄碱的感冒药，或有甲状腺功能异常时，心率会被药物或疾病压低/抬高，「所有年龄公式都失效」。这类情况要用主观费力程度（RPE 6–20）或谈话测试定强度，或按运动负荷试验的结果定区间。')
  notes.push('静息心率下降是训练适应里最稳定的指标之一：把晨起卧床测得的一周平均值当基线，训练 4–6 周后常能降 3–8 次/分。')
  notes.push('运动中出现胸痛、胸闷、明显气促、头晕或心律不齐，应立刻停止并就医 —— 任何心率区间都不值得用来交换一次心血管事件。')

  return {
    ok: true,
    formulas,
    maxHr,
    maxHrSource,
    hrr,
    zones,
    moderate: z3 ? { lower: z3.maxHrBased.lower, upper: z3.maxHrBased.upper } : null,
    vigorous: z4 ? { lower: z4.maxHrBased.lower, upper: z4.maxHrBased.upper } : null,
    notes
  }
}

export interface HeartRateSample {
  label: string
  input: HeartRateInput
}

export const HEART_RATE_SAMPLES: HeartRateSample[] = [
  { label: '30 岁·久坐', input: { age: 30, restingHr: 78, measuredMax: null } },
  { label: '45 岁·周练三次', input: { age: 45, restingHr: 60, measuredMax: null } },
  { label: '实测 191', input: { age: 34, restingHr: 52, measuredMax: 191 } },
  { label: '60 岁·晨脉低', input: { age: 60, restingHr: 58, measuredMax: null } }
]
