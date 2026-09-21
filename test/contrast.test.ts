import { describe, expect, it } from 'vitest'
import { contrastRatio, evaluateContrast, relativeLuminance } from '~/utils/contrast'

describe('relativeLuminance', () => {
  it('纯黑白', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBe(0)
  })
  it('非法色值返回 null', () => {
    expect(relativeLuminance('red')).toBeNull()
  })
})

describe('contrastRatio', () => {
  it('黑白对比 21:1，且与顺序无关', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21)
    expect(contrastRatio('#ffffff', '#000000')).toBe(21)
  })
  it('同色对比 1:1', () => {
    expect(contrastRatio('#123456', '#123456')).toBe(1)
  })
  it('红白经典值 ≈ 3.99', () => {
    expect(contrastRatio('#ff0000', '#ffffff')).toBeCloseTo(3.99, 1)
  })
  it('非法输入返回 null', () => {
    expect(contrastRatio('#fff', 'nope')).toBeNull()
  })
})

describe('evaluateContrast', () => {
  it('黑/白全通过', () => {
    expect(evaluateContrast('#000', '#fff')).toEqual({
      ratio: 21,
      passAA: true,
      passAAA: true,
      passAALarge: true,
      passAAALarge: true
    })
  })
  it('4.5 边界附近判定正确', () => {
    // #767676 on white = 4.54：过 AA 普通，不过 AAA
    const r = evaluateContrast('#767676', '#ffffff')!
    expect(r.ratio).toBeCloseTo(4.54, 1)
    expect(r.passAA).toBe(true)
    expect(r.passAAA).toBe(false)
  })
  it('大文本放宽：#949494/白 约 3.03，过 AA 大字、不过普通 AA', () => {
    const r = evaluateContrast('#949494', '#ffffff')!
    expect(r.passAALarge).toBe(true)
    expect(r.passAA).toBe(false)
  })
})
