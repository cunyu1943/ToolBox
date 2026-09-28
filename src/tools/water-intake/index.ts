/**
 * 每日饮水量估算。
 *
 * 主体是「35 ml/kg 体重」这条常用经验式（文献里 30–40 ml/kg 都算正常带宽），再按运动时长、
 * 高温干燥、高海拔、妊娠、哺乳、发热逐项加成，最后减掉食物供水那一档：
 * **人体水的来源约 20% 来自食物**，所以「要喝多少」比「总共需要多少」小一截 ——
 * 很多计算器把两者混为一谈，于是给出了偏高的杯数。
 * 参照系是 IOM（现 NASEM）2004/2010 的适宜摄入量（AI）：男性总水 3.7 L/日（其中饮品约 2.7 L）、
 * 女性 2.7 L/日（饮品约 2.0 L）。
 */

export type Climate = 'temperate' | 'hot' | 'high-altitude' | 'indoor-heated'
export type UrineColor = 'unknown' | 'clear' | 'pale' | 'dark' | 'amber'

export interface WaterInput {
  weightKg: number
  /** 每天额外的主动运动时长（分钟） */
  exerciseMinutes: number
  climate: Climate
  pregnant: boolean
  lactating: boolean
  /** 发热时体温（℃），不发热填 null */
  temperature: number | null
  /** 自我观察的尿色，只影响提示文案，不参与计算 */
  urine: UrineColor
  /** 单杯容量（毫升），用于换算「几杯」 */
  cupMl: number
}

export interface WaterItem {
  label: string
  ml: number
  basis: string
}

export interface WaterResult {
  ok: boolean
  error?: string
  items: WaterItem[]
  /** 总需水量（含食物供水） */
  totalMl: number | null
  /** 需要喝进去的量（扣掉约 20% 食物来源） */
  beverageMl: number | null
  cups: number | null
  /** 从 8:00 到 22:00 均分的喝水提醒时刻 */
  schedule: { time: string; ml: number }[]
  urineNote: string | null
  /** IOM 适宜摄入量对照 */
  reference: { label: string; totalMl: number; beverageMl: number }[]
  notes: string[]
}

export const CLIMATE_LABELS: { value: Climate; label: string; detail: string }[] = [
  { value: 'temperate', label: '温和气候', detail: '常温、不过度出汗，无加成' },
  { value: 'hot', label: '高温 / 干燥 / 大量出汗', detail: '+700 ml（500–1000 ml）' },
  { value: 'high-altitude', label: '高海拔（约 2500 m 以上）', detail: '+500 ml：呼吸加快加干燥空气，隐性失水上升' },
  { value: 'indoor-heated', label: '冬季室内供暖干燥', detail: '+300 ml：呼吸道与皮肤蒸发增加' }
]

const EXERCISE_ML_PER_HOUR = 500
const FOOD_SHARE = 0.2
const ML_PER_KG = 35

const round = (value: number, digits = 0): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function computeWater(input: WaterInput): WaterResult {
  const empty: WaterResult = {
    ok: false,
    items: [],
    totalMl: null,
    beverageMl: null,
    cups: null,
    schedule: [],
    urineNote: null,
    reference: [
      { label: '男性 AI（IOM）', totalMl: 3700, beverageMl: 2700 },
      { label: '女性 AI（IOM）', totalMl: 2700, beverageMl: 2000 }
    ],
    notes: []
  }

  if (!Number.isFinite(input.weightKg) || input.weightKg < 20 || input.weightKg > 300) {
    return { ...empty, error: '体重请在 20–300 公斤之间。' }
  }
  if (!Number.isFinite(input.exerciseMinutes) || input.exerciseMinutes < 0 || input.exerciseMinutes > 600) {
    return { ...empty, error: '运动时长请在 0–600 分钟之间。' }
  }
  if (input.cupMl < 100 || input.cupMl > 1000) {
    return { ...empty, error: '单杯容量请在 100–1000 毫升之间。' }
  }
  if (input.temperature !== null && (input.temperature < 36 || input.temperature > 43)) {
    return { ...empty, error: '体温若填写，请在 36–43 ℃ 之间。' }
  }

  const items: WaterItem[] = [
    { label: `基础需求（${ML_PER_KG} ml/kg）`, ml: round(input.weightKg * ML_PER_KG), basis: '按体重线性放大，是最粗也最主要的一项；30–40 ml/kg 都被视为正常带宽。' }
  ]

  const exercise = round((input.exerciseMinutes / 60) * EXERCISE_ML_PER_HOUR)
  if (exercise > 0) {
    items.push({
      label: `运动补液（${input.exerciseMinutes} 分钟）`,
      ml: exercise,
      basis: '按约 500 ml/小时 计（ACSM 给的带宽是每 15 分钟 12–24 oz ≈ 350–700 ml/h）。超过 60–90 分钟或大量出汗时，光补水不够，要补钠。'
    })
  }

  const climateAdd: Record<Climate, { ml: number; why: string }> = {
    temperate: { ml: 0, why: '' },
    hot: { ml: 700, why: '高温、干燥或大量出汗时隐性失水显著上升。' },
    'high-altitude': { ml: 500, why: '海拔上升后呼吸频率增加、空气更干，脱水常被误判为「高反」。' },
    'indoor-heated': { ml: 300, why: '供暖室内相对湿度常低于 30%，呼吸道失水增加。' }
  }
  const climate = climateAdd[input.climate]
  if (climate.ml > 0) items.push({ label: '环境加成', ml: climate.ml, basis: climate.why })

  if (input.pregnant) items.push({ label: '妊娠', ml: 300, basis: 'IOM 孕期附加量约 +300 ml/日（孕中晚期），血浆容量扩张是主因。' })
  if (input.lactating) items.push({ label: '哺乳', ml: 700, basis: 'IOM 哺乳期附加量约 +700 ml/日（0–6 月），乳汁含水量约 87%。' })
  if (input.temperature !== null && input.temperature > 37.5) {
    const fever = round((input.temperature - 37) * 300)
    items.push({
      label: `发热（${input.temperature} ℃）`,
      ml: fever,
      basis: '按每升高 1 ℃ 约 +300 ml 的常用教学值。发热时真正该盯的是尿量与口干，而不只是数字。'
    })
  }

  const totalMl = round(items.reduce((sum, item) => sum + item.ml, 0))
  const beverageMl = round(totalMl * (1 - FOOD_SHARE))
  const cups = round(beverageMl / input.cupMl, 1)

  const slots = 7
  const perSlot = round(beverageMl / slots / 10) * 10
  const schedule = Array.from({ length: slots }, (_, index) => ({
    time: `${8 + index * 2}:00`,
    ml: perSlot
  }))

  const urineTable: Record<UrineColor, string | null> = {
    unknown: null,
    clear: '几乎无色：可能已经喝得偏多。长期这样且没有大量出汗，说明当前水量充足甚至富余。',
    pale: '淡柠檬黄：这是最理想的状态，说明补水到位。',
    dark: '深黄：偏低，建议接下来的 1–2 小时补 300–500 ml。',
    amber: '琥珀色 / 茶色：明显不足，或有胆红素相关问题。若持续如此、或伴尿量减少与头晕，应当就医而不是只加水。'
  }

  const notes: string[] = [
    `约 ${round(FOOD_SHARE * 100)}% 的水来自食物（蔬果、汤、粥尤其高），所以「总需 ${totalMl} ml」对应的是「喝约 ${beverageMl} ml」。`,
    '这是健康成年人的参考值。「肾功能不全、心力衰竭、肝硬化腹水、抗利尿激素异常、正在限液治疗」的人，盲目按 35 ml/kg 喝水会加重负担，必须按医嘱的液体量执行。',
    '短时间灌太多比「不够」更危险：肾脏最大排水率约 0.8–1.0 L/小时，超过这个速度会稀释血钠，引发低钠血症（马拉松、军训、健身博主的「一天 8 升」都是常见场景）。',
    '咖啡、茶、含酒精饮料都算液体摄入，但酒精与高剂量咖啡因有利尿作用；含糖饮料的热量应按热量计，不能当水。',
    '口渴感在老年人和运动中会钝化，等口渴再喝往往已经晚了 1–2% 体重的失水。'
  ]

  return {
    ok: true,
    items,
    totalMl,
    beverageMl,
    cups,
    schedule,
    urineNote: urineTable[input.urine],
    reference: empty.reference,
    notes
  }
}

export interface WaterSample {
  label: string
  input: WaterInput
}

export const WATER_SAMPLES: WaterSample[] = [
  { label: '办公室久坐 65kg', input: { weightKg: 65, exerciseMinutes: 0, climate: 'temperate', pregnant: false, lactating: false, temperature: null, urine: 'pale', cupMl: 250 } },
  { label: '每天跑 1 小时 70kg', input: { weightKg: 70, exerciseMinutes: 60, climate: 'hot', pregnant: false, lactating: false, temperature: null, urine: 'dark', cupMl: 250 } },
  { label: '孕中期 60kg', input: { weightKg: 60, exerciseMinutes: 30, climate: 'indoor-heated', pregnant: true, lactating: false, temperature: null, urine: 'unknown', cupMl: 300 } }
]
