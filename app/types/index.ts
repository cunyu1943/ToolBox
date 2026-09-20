/** 工具分类，用于首页筛选标签 */
export type ToolCategory =
  | '数据'
  | '金融'
  | '数学'
  | '生活'
  | '单位换算'
  | '健康'
  | '开发'
  | '编码'
  | '文本'
  | '颜色'

/** 首页注册表条目，新增工具只需在 utils/tools.ts 追加一项 */
export interface ToolMeta {
  key: string
  name: string
  desc: string
  /** iconify 图标名，如 'mdi:calculator' */
  icon: string
  route: string
  category: ToolCategory
  /** 用于首页搜索的关键词 */
  keywords: string[]
}

/** 还款计划表单行 */
export interface AmortizationRow {
  period: number
  payment: number
  principal: number
  interest: number
  remaining: number
}

/** 等额本息 / 等额本金 计算结果 */
export interface LoanResult {
  mode: 'equal-installment' | 'equal-principal'
  /** 等额本息：固定月供；等额本金：首月月供 */
  monthlyPayment: number
  /** 等额本金每月递减额 */
  monthlyDecrease: number
  /** 等额本金末月月供 */
  lastPayment: number
  totalInterest: number
  totalPayment: number
  schedule: AmortizationRow[]
}

/** 单位换算定义：以 baseFactor 归一到基准单位 */
export interface Unit {
  id: string
  label: string
  /** 1 该单位 = factor 个基准单位 */
  factor: number
}
