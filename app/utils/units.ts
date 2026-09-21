import type { Unit } from '~/types'
import { roundFloat } from './number'

/**
 * 通用单位换算。所有单位以 factor 归一到某个基准单位：
 *   convertUnit(value, from, to) = value * from.factor / to.factor
 * 新增单位只需往对应数组追加一项。
 */

/** 质量：基准单位为克(g) */
export const weightUnits: Unit[] = [
  { id: 'mg', label: '毫克 mg', factor: 0.001 },
  { id: 'g', label: '克 g', factor: 1 },
  { id: 'kg', label: '千克 kg', factor: 1000 },
  { id: 't', label: '吨 t', factor: 1_000_000 },
  { id: 'jin', label: '市斤', factor: 500 },
  { id: 'liang', label: '市两', factor: 50 },
  { id: 'lb', label: '磅 lb', factor: 453.59237 },
  { id: 'oz', label: '盎司 oz', factor: 28.349523125 }
]

/** 容量：基准单位为升(L) */
export const volumeUnits: Unit[] = [
  { id: 'ml', label: '毫升 mL', factor: 0.001 },
  { id: 'l', label: '升 L', factor: 1 },
  { id: 'm3', label: '立方米 m³', factor: 1000 },
  { id: 'cm3', label: '立方厘米 cm³', factor: 0.001 },
  { id: 'gal-us', label: '加仑（美）', factor: 3.785411784 },
  { id: 'gal-uk', label: '加仑（英）', factor: 4.54609 },
  { id: 'pint', label: '品脱（美）', factor: 0.473176473 },
  { id: 'cup', label: '杯（美）', factor: 0.2365882365 },
  { id: 'tbsp', label: '汤匙', factor: 0.015 },
  { id: 'tsp', label: '茶匙', factor: 0.005 }
]

/** 长度：基准单位为米(m) */
export const lengthUnits: Unit[] = [
  { id: 'mm', label: '毫米 mm', factor: 0.001 },
  { id: 'cm', label: '厘米 cm', factor: 0.01 },
  { id: 'm', label: '米 m', factor: 1 },
  { id: 'km', label: '千米 km', factor: 1000 },
  { id: 'in', label: '英寸 in', factor: 0.0254 },
  { id: 'ft', label: '英尺 ft', factor: 0.3048 },
  { id: 'yd', label: '码 yd', factor: 0.9144 },
  { id: 'mi', label: '英里 mi', factor: 1609.344 },
  { id: 'nmi', label: '海里 nmi', factor: 1852 },
  { id: 'li', label: '市里', factor: 500 },
  { id: 'zhang', label: '市丈', factor: 10 / 3 },
  { id: 'chi', label: '市尺', factor: 1 / 3 },
  { id: 'cun', label: '市寸', factor: 1 / 30 }
]

/** 数据存储（以字节 B 为基准）：十进制 SI 与二进制 IEC 双体系 */
export const storageUnits: Unit[] = [
  { id: 'bit', label: '位 bit', factor: 0.125 },
  { id: 'B', label: '字节 B', factor: 1 },
  { id: 'KB', label: 'KB（10³）', factor: 1e3 },
  { id: 'MB', label: 'MB（10⁶）', factor: 1e6 },
  { id: 'GB', label: 'GB（10⁹）', factor: 1e9 },
  { id: 'TB', label: 'TB（10¹²）', factor: 1e12 },
  { id: 'PB', label: 'PB（10¹⁵）', factor: 1e15 },
  { id: 'KiB', label: 'KiB（2¹⁰）', factor: 1024 },
  { id: 'MiB', label: 'MiB（2²⁰）', factor: 1024 ** 2 },
  { id: 'GiB', label: 'GiB（2³⁰）', factor: 1024 ** 3 },
  { id: 'TiB', label: 'TiB（2⁴⁰）', factor: 1024 ** 4 }
]

/** 时间：基准单位为秒(s)；月按 30 天、年按 365 天近似 */
export const timeUnits: Unit[] = [
  { id: 'ns', label: '纳秒 ns', factor: 1e-9 },
  { id: 'us', label: '微秒 μs', factor: 1e-6 },
  { id: 'ms', label: '毫秒 ms', factor: 0.001 },
  { id: 's', label: '秒 s', factor: 1 },
  { id: 'min', label: '分钟 min', factor: 60 },
  { id: 'h', label: '小时 h', factor: 3600 },
  { id: 'd', label: '天 d', factor: 86400 },
  { id: 'wk', label: '周 wk', factor: 604800 },
  { id: 'mo', label: '月（30天）', factor: 2592000 },
  { id: 'yr', label: '年（365天）', factor: 31536000 }
]

/** 按 id 查找单位 */
export function findUnit(list: Unit[], id: string): Unit | undefined {
  return list.find((u) => u.id === id)
}

/** 单值换算，结果做精度归一 */
export function convertUnit(value: number, from: Unit, to: Unit): number {
  if (!Number.isFinite(value)) return 0
  return roundFloat((value * from.factor) / to.factor, 10)
}

/**
 * 实时联动：以 source 单位的 value 为输入，返回所有单位的换算值。
 * 用于「输入任一单位，其余单位实时联动」。
 */
export function convertAll(list: Unit[], sourceId: string, value: number): Record<string, number> {
  const source = findUnit(list, sourceId)
  const result: Record<string, number> = {}
  if (!source || !Number.isFinite(value)) {
    for (const u of list) result[u.id] = 0
    return result
  }
  for (const u of list) result[u.id] = convertUnit(value, source, u)
  return result
}
