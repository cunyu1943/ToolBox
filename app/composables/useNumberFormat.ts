import { formatCurrency, formatNumber, formatPercent } from '~/utils/number'

/**
 * 组件内使用的格式化 composable（薄封装 utils/number 纯函数，方便模板直接调用）。
 */
export function useNumberFormat() {
  return {
    num: formatNumber,
    currency: formatCurrency,
    percent: formatPercent
  }
}
