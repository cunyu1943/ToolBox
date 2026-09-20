/**
 * 温度换算：统一以摄氏(C)为基准，其余单位提供到/从基准的显式公式，
 * 因为华氏/开尔文含偏移量，不能套用线性 factor 模型。纯函数，供页面与单测复用。
 */
import { roundFloat } from './number'

export interface TempUnit {
  id: 'C' | 'F' | 'K'
  label: string
  toCelsius: (v: number) => number
  fromCelsius: (c: number) => number
}

export const tempUnits: TempUnit[] = [
  { id: 'C', label: '摄氏度 °C', toCelsius: (v) => v, fromCelsius: (c) => c },
  { id: 'F', label: '华氏度 °F', toCelsius: (v) => ((v - 32) * 5) / 9, fromCelsius: (c) => (c * 9) / 5 + 32 },
  { id: 'K', label: '开尔文 K', toCelsius: (v) => v - 273.15, fromCelsius: (c) => c + 273.15 }
]

export function findTempUnit(id: string): TempUnit | undefined {
  return tempUnits.find((u) => u.id === id)
}

/** 以 sourceId 单位的 value 为输入，返回全部单位的换算值（保留高精度） */
export function convertTempAll(sourceId: string, value: number): Record<string, number> {
  const source = findTempUnit(sourceId)
  const result: Record<string, number> = {}
  if (!source || !Number.isFinite(value)) {
    for (const u of tempUnits) result[u.id] = 0
    return result
  }
  const c = source.toCelsius(value)
  for (const u of tempUnits) result[u.id] = roundFloat(u.fromCelsius(c), 6)
  return result
}
