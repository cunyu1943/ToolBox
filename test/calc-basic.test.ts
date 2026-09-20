import { describe, expect, it } from 'vitest'
import { initialCalc, press, type CalcKey, type CalcState } from '~/utils/calc-basic'

function tap(keys: CalcKey[]): CalcState {
  return keys.reduce((s, k) => press(s, k), initialCalc())
}

const num = (s: CalcState) => Number(s.display)

describe('标准计算器状态机 calc-basic', () => {
  it('浮点误差归一：0.1 + 0.2 = 0.3', () => {
    expect(tap(['0', '.', '1', '+', '0', '.', '2', '=']).display).toBe('0.3')
  })

  it('连续运算按从左到右：2 + 3 * 4 = 20', () => {
    const s = tap(['2', '+', '3', '*', '4', '='])
    expect(s.display).toBe('20')
  })

  it('运算符连按先算中间结果', () => {
    const s = tap(['2', '+', '3', '*'])
    expect(s.display).toBe('5')
    expect(s.expression).toBe('5 ×')
  })

  it('除零进入错误态，AC 复位', () => {
    const err = tap(['8', '/', '0', '='])
    expect(err.display).toBe('错误')
    expect(err.error).toBe(true)
    expect(press(err, 'AC')).toEqual(initialCalc())
  })

  it('错误态下按数字自动清零后输入', () => {
    const s = tap(['5', '/', '0', '=', '7'])
    expect(s.display).toBe('7')
    expect(s.error).toBe(false)
  })

  it('等待操作数时输入数字覆盖显示：7 + 8 = 15', () => {
    expect(num(tap(['7', '+', '8', '=']))).toBe(15)
  })

  it('退格逐位删除，至多回到 0', () => {
    const s = tap(['1', '2', '3', 'back', 'back', 'back'])
    expect(s.display).toBe('0')
  })

  it('正负号取反', () => {
    expect(tap(['5', 'sign']).display).toBe('-5')
    expect(tap(['5', 'sign', 'sign']).display).toBe('5')
  })

  it('百分号：50 % = 0.5', () => {
    expect(num(tap(['5', '0', 'pct']))).toBe(0.5)
  })

  it('小数点不可重复', () => {
    expect(tap(['1', '.', '.', '5']).display).toBe('1.5')
  })
})
