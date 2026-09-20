import { describe, expect, it } from 'vitest'
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  formatRgb,
  formatHsl,
  readableForeground,
  randomHex
} from '~/utils/color'

describe('hexToRgb', () => {
  it('六位带井号', () => expect(hexToRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 }))
  it('缩写三位', () => expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 }))
  it('无井号 + 大写', () => expect(hexToRgb('FFFFFF')).toEqual({ r: 255, g: 255, b: 255 }))
  it('含 alpha 取前六位', () => expect(hexToRgb('#ff880080')).toEqual({ r: 255, g: 136, b: 0 }))
  it('非法返回 null', () => expect(hexToRgb('zzz')).toBeNull())
})

describe('rgb ⇄ hex', () => {
  it('往返', () => expect(rgbToHex(hexToRgb('#1a2b3c')!)).toBe('#1a2b3c'))
  it('formatRgb', () => expect(formatRgb({ r: 1, g: 2, b: 3 })).toBe('rgb(1, 2, 3)'))
})

describe('rgb ⇄ hsl', () => {
  it('纯红', () => expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 }))
  it('黑', () => expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 }))
  it('白', () => expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 }))
  it('hsl 转 rgb 纯红', () => expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 }))
  it('灰（s=0）r=g=b', () => expect(hslToRgb({ h: 210, s: 0, l: 50 })).toEqual({ r: 128, g: 128, b: 128 }))
  it('往返近似', () => {
    const rgb = hexToRgb('#4a90d9')!
    const back = hslToRgb(rgbToHsl(rgb))
    expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1)
  })
  it('负色相归一', () => expect(hslToRgb({ h: -90, s: 100, l: 50 })).toEqual(hslToRgb({ h: 270, s: 100, l: 50 })))
})

describe('便捷函数', () => {
  it('hexToHsl', () => expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 }))
  it('hslToHex', () => expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000'))
  it('formatHsl', () => expect(formatHsl({ h: 200, s: 50, l: 50 })).toBe('hsl(200, 50%, 50%)'))
})

describe('readableForeground / randomHex', () => {
  it('浅色配黑字', () => expect(readableForeground('#ffffff')).toBe('#000000'))
  it('深色配白字', () => expect(readableForeground('#000000')).toBe('#ffffff'))
  it('随机 hex 合法', () => expect(randomHex()).toMatch(/^#[0-9a-f]{6}$/))
  it('固定 rng', () => expect(randomHex(() => 0)).toBe('#000000'))
})
