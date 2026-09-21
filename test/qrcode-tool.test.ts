import { describe, expect, it } from 'vitest'
import { generateQrSvg } from '~/utils/qrcode-tool'

describe('generateQrSvg', () => {
  it('生成含路径模块的 SVG', async () => {
    const svg = await generateQrSvg('https://example.com')
    expect(svg).toContain('<svg')
    expect(svg).toMatch(/<path|<rect/)
  })

  it('自定义颜色体现在 fill 上', async () => {
    const svg = await generateQrSvg('x', { dark: '#ff0000', light: '#00ff00' })
    expect(svg).toContain('ff0000')
  })

  it('超出容量时报错而非崩溃', async () => {
    const huge = 'A'.repeat(5000)
    await expect(generateQrSvg(huge, { level: 'H' })).rejects.toThrow()
  })
})
