import { roundFloat } from './number'

/**
 * 标准计算器按键状态机（纯函数，便于单元测试）。
 * 页面只需持有 state 并调用 press()，展示层读取 display/expression。
 */
export type CalcKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | '.' | '+' | '-' | '*' | '/' | '=' | 'AC' | 'C' | 'back' | 'sign' | 'pct'

export type CalcOp = '+' | '-' | '*' | '/'

export interface CalcState {
  display: string
  expression: string
  /** 已累积的左操作数 */
  prev: number | null
  operator: CalcOp | null
  /** 刚按了运算符，下一次输入数字应覆盖显示 */
  waitingForOperand: boolean
  error: boolean
}

export function initialCalc(): CalcState {
  return { display: '0', expression: '', prev: null, operator: null, waitingForOperand: false, error: false }
}

function compute(a: number, b: number, op: CalcOp): number | null {
  switch (op) {
    case '+': return roundFloat(a + b)
    case '-': return roundFloat(a - b)
    case '*': return roundFloat(a * b)
    case '/': return b === 0 ? null : roundFloat(a / b)
  }
}

function symbol(op: CalcOp): string {
  return op === '*' ? '×' : op === '/' ? '÷' : op
}

function withError(s: CalcState): CalcState {
  return { display: '错误', expression: '除数不能为 0', prev: null, operator: null, waitingForOperand: false, error: true }
}

/** 按键驱动状态转移，返回新状态（不修改入参）。 */
export function press(prevState: CalcState, key: CalcKey): CalcState {
  const s: CalcState = { ...prevState }
  const clear = () => Object.assign(s, initialCalc())

  if (/^[0-9]$/.test(key)) {
    if (s.error) clear()
    if (s.waitingForOperand) {
      s.display = key
      s.waitingForOperand = false
    } else {
      s.display = s.display === '0' ? key : s.display + key
    }
    return s
  }

  switch (key) {
    case '.': {
      if (s.error) clear()
      if (s.waitingForOperand) {
        s.display = '0.'
        s.waitingForOperand = false
        return s
      }
      if (!s.display.includes('.')) s.display += '.'
      return s
    }
    case '+': case '-': case '*': case '/': {
      if (s.error) return s
      const current = parseFloat(s.display)
      const op = key as CalcOp
      // 连按时先算出中间结果
      if (s.operator && s.prev !== null && !s.waitingForOperand) {
        const r = compute(s.prev, current, s.operator)
        if (r === null) return withError(s)
        s.prev = r
        s.display = String(r)
      } else {
        s.prev = current
      }
      s.operator = op
      s.waitingForOperand = true
      s.expression = `${s.prev} ${symbol(op)}`
      return s
    }
    case '=': {
      if (s.error || s.operator === null || s.prev === null) return s
      const current = s.waitingForOperand ? s.prev : parseFloat(s.display)
      const r = compute(s.prev, current, s.operator)
      if (r === null) return withError(s)
      s.expression = `${s.prev} ${symbol(s.operator)} ${current} =`
      s.display = String(r)
      s.prev = null
      s.operator = null
      s.waitingForOperand = false
      return s
    }
    case 'AC': case 'C': {
      return initialCalc()
    }
    case 'back': {
      if (s.error) return initialCalc()
      if (s.waitingForOperand) return s
      const negSingle = s.display.length === 2 && s.display.startsWith('-')
      s.display = s.display.length <= 1 || negSingle ? '0' : s.display.slice(0, -1)
      return s
    }
    case 'sign': {
      if (s.error) return s
      s.display = String(parseFloat(s.display) * -1)
      return s
    }
    case 'pct': {
      if (s.error) return s
      s.display = String(roundFloat(parseFloat(s.display) / 100))
      return s
    }
    default:
      return s
  }
}
