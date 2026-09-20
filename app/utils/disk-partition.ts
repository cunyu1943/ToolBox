/**
 * 硬盘分区方案：给定总容量与一组分区占比，输出每个分区的容量(GB)。
 * 纯整数分配，向下取整后把余数补给最后一个分区，保证总和等于总容量。
 */
import { roundFloat } from './number'

export interface PartitionSlice {
  label: string
  /** 百分比，0~100 */
  percent: number
}

export interface PartitionPreset {
  id: string
  name: string
  desc: string
  slices: PartitionSlice[]
}

/** 常见用途预设，占比之和均为 100 */
export const diskPresets: PartitionPreset[] = [
  {
    id: 'balanced',
    name: '均衡通用',
    desc: '系统与日常使用并重，适合大多数用户',
    slices: [
      { label: '系统盘 (C)', percent: 30 },
      { label: '软件与工作 (D)', percent: 40 },
      { label: '娱乐与备份 (E)', percent: 30 }
    ]
  },
  {
    id: 'office',
    name: '办公文档',
    desc: '系统精简、文档空间充裕',
    slices: [
      { label: '系统盘 (C)', percent: 25 },
      { label: '文档办公 (D)', percent: 55 },
      { label: '其他 (E)', percent: 20 }
    ]
  },
  {
    id: 'gaming',
    name: '游戏娱乐',
    desc: '为大型游戏预留主分区',
    slices: [
      { label: '系统盘 (C)', percent: 25 },
      { label: '游戏 (D)', percent: 60 },
      { label: '影音 (E)', percent: 15 }
    ]
  },
  {
    id: 'dev',
    name: '开发设计',
    desc: '为工具链、镜像与工程预留空间',
    slices: [
      { label: '系统盘 (C)', percent: 30 },
      { label: '开发环境 (D)', percent: 45 },
      { label: '资料归档 (E)', percent: 25 }
    ]
  },
  {
    id: 'media',
    name: '影音存储',
    desc: '大容量媒体分区为主',
    slices: [
      { label: '系统盘 (C)', percent: 15 },
      { label: '影音库 (D)', percent: 75 },
      { label: '临时 (E)', percent: 10 }
    ]
  }
]

export interface PartitionResult {
  label: string
  percent: number
  sizeGb: number
}

/** 按占比把 total(GB) 拆成整数分区，余数补给最后一块 */
export function allocate(totalGb: number, slices: PartitionSlice[]): PartitionResult[] {
  const total = Math.max(0, Math.floor(totalGb))
  const results: PartitionResult[] = []
  let assigned = 0
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i]!
    if (i === slices.length - 1) {
      results.push({ label: s.label, percent: s.percent, sizeGb: total - assigned })
    } else {
      const size = Math.floor((total * s.percent) / 100)
      assigned += size
      results.push({ label: s.label, percent: s.percent, sizeGb: size })
    }
  }
  return results
}

/** GB 友好展示：>=1024 显示为 TB（保留 2 位） */
export function formatCapacity(gb: number): string {
  if (gb >= 1024) return `${roundFloat(gb / 1024, 2)} TB（${gb} GB）`
  return `${gb} GB`
}
