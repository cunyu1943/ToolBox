import { describe, expect, it } from 'vitest'
import { buildLinearGradient, isValidGradient, type GradientStop } from '~/utils/gradient'

describe('buildLinearGradient', () => {
  it('标准拼接', () =>
    expect(buildLinearGradient(90, [{ color: '#f00', pos: 0 }, { color: '#00f', pos: 100 }])).toBe(
      'linear-gradient(90deg, #f00 0%, #00f 100%)'
    ))
  it('角度归一到 0-359', () =>
    expect(buildLinearGradient(450, [{ color: 'red', pos: 0 }, { color: 'blue', pos: 50 }])).toBe(
      'linear-gradient(90deg, red 0%, blue 50%)'
    ))
  it('负角度归一', () =>
    expect(buildLinearGradient(-90, [{ color: 'a', pos: 0 }, { color: 'b', pos: 100 }])).toContain('(270deg'))
  it('忽略空色标', () =>
    expect(buildLinearGradient(0, [{ color: '', pos: 0 }, { color: 'red', pos: 100 }])).toBe('linear-gradient(0deg, red 100%)'))
  it('位置越界钳制', () =>
    expect(buildLinearGradient(0, [{ color: 'x', pos: -10 }, { color: 'y', pos: 200 }])).toBe('linear-gradient(0deg, x 0%, y 100%)'))
})

describe('isValidGradient', () => {
  it('两色有效', () => expect(isValidGradient([{ color: 'a', pos: 0 }, { color: 'b', pos: 1 }] as GradientStop[])).toBe(true))
  it('单色无效', () => expect(isValidGradient([{ color: 'a', pos: 0 }])).toBe(false))
})
