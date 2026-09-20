import { describe, expect, it } from 'vitest'
import { allocate, diskPresets, formatCapacity } from '~/utils/disk-partition'

describe('硬盘分区分配', () => {
  it('占比之和均为 100', () => {
    for (const p of diskPresets) {
      expect(p.slices.reduce((s, x) => s + x.percent, 0)).toBe(100)
    }
  })

  it('512GB 均衡方案各分区之和等于总量', () => {
    const r = allocate(512, diskPresets[0]!.slices)
    expect(r.reduce((s, x) => s + x.sizeGb, 0)).toBe(512)
    expect(r[0]!.sizeGb).toBe(153) // 512 * 30% 向下取整
  })

  it('余数并入最后一块', () => {
    const r = allocate(1000, [
      { label: 'A', percent: 33 },
      { label: 'B', percent: 33 },
      { label: 'C', percent: 34 }
    ])
    expect(r[0]!.sizeGb).toBe(330)
    expect(r[2]!.sizeGb).toBe(1000 - 330 - 330)
    expect(r.reduce((s, x) => s + x.sizeGb, 0)).toBe(1000)
  })

  it('容量展示：超过 1024GB 转 TB', () => {
    expect(formatCapacity(512)).toBe('512 GB')
    expect(formatCapacity(2048)).toBe('2 TB（2048 GB）')
  })
})
