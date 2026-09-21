import { describe, expect, it } from 'vitest'
import { nextRuns, parseCron } from '~/utils/cron'

describe('Cron 解析', () => {
  it('合法表达式拆出 5 字段', () => {
    const r = parseCron('*/5 9 * * 1-5')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.fields[0]!.values).toHaveLength(12)
    expect(r.fields[1]!.values).toEqual([9])
    expect(r.fields[4]!.values).toEqual([1, 2, 3, 4, 5])
    expect(r.describe).toContain('每 5 分')
  })
  it('周字段 7 归一为周日', () => {
    const r = parseCron('0 0 * * 7')
    expect(r.ok && (r as { fields: { values: number[] }[] }).fields[4]!.values).toEqual([0])
  })
  it('非法字段与字段数报错', () => {
    expect(parseCron('61 * * * *').ok).toBe(false)
    expect(parseCron('0 0 32 * *').ok).toBe(false)
    expect(parseCron('* *').ok).toBe(false)
    expect(parseCron('a * * * *').ok).toBe(false)
    expect(parseCron('*/0 * * * *').ok).toBe(false)
  })

  it('每 15 分钟：从 10:07 起下一批为 10:15/10:30/10:45/11:00', () => {
    const runs = nextRuns('*/15 * * * *', new Date(2026, 8, 20, 10, 7), 4)
    expect(runs.map(d => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`))
      .toEqual(['10:15', '10:30', '10:45', '11:00'])
  })
  it('每年 1 月 1 日零点', () => {
    const runs = nextRuns('0 0 1 1 *', new Date(2026, 5, 1), 2)
    expect(runs[0]!.getFullYear()).toBe(2027)
    expect(runs[0]!.getMonth()).toBe(0)
    expect(runs[1]!.getFullYear()).toBe(2028)
  })
  it('日与周同时受限取「或」', () => {
    const runs = nextRuns('0 0 13 * 5', new Date(2026, 8, 1), 8)
    expect(runs).toHaveLength(8)
    for (const d of runs) {
      expect(d.getHours()).toBe(0)
      expect(d.getDate() === 13 || d.getDay() === 5).toBe(true)
    }
  })
  it('不含当前分钟本身', () => {
    const runs = nextRuns('* * * * *', new Date(2026, 8, 20, 12, 0), 1)
    expect(runs[0]!.getMinutes()).toBe(1)
  })
})
