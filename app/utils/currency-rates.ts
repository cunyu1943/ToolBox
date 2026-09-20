/** 内置可编辑汇率表的默认值与元数据（纯前端、离线可用）。 */

/** 币种定义：rateToCny = 1 单位该币种折合的人民币金额（默认值，用户可改） */
export interface Currency {
  code: string
  name: string
  symbol: string
  rateToCny: number
}

/** 最后更新时间由用户在页面维护，存 localStorage；此为出厂标注 */
export const DEFAULT_UPDATED = '2026-09-18'

export const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'CNY', name: '人民币', symbol: '¥', rateToCny: 1 },
  { code: 'USD', name: '美元', symbol: '$', rateToCny: 7.2 },
  { code: 'EUR', name: '欧元', symbol: '€', rateToCny: 7.85 },
  { code: 'JPY', name: '日元', symbol: 'JP¥', rateToCny: 0.048 },
  { code: 'GBP', name: '英镑', symbol: '£', rateToCny: 9.15 },
  { code: 'HKD', name: '港币', symbol: 'HK$', rateToCny: 0.92 },
  { code: 'KRW', name: '韩元', symbol: '₩', rateToCny: 0.0054 },
  { code: 'AUD', name: '澳元', symbol: 'A$', rateToCny: 4.7 }
]
