import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { DEFAULT_CURRENCIES, DEFAULT_UPDATED, type Currency } from '~/utils/currency-rates'

/**
 * 汇率 store：内置可编辑汇率表持久化到 localStorage（键 multicalc:currency）。
 * 纯前端，无网络请求。
 */
export const useCurrencyStore = defineStore('currency', () => {
  const currencies = useLocalStorage<Currency[]>('multicalc:currency', DEFAULT_CURRENCIES)
  const updatedAt = useLocalStorage<string>('multicalc:currency:updated', DEFAULT_UPDATED)

  function byCode(code: string): Currency | undefined {
    return currencies.value.find((c) => c.code === code)
  }

  /** from -> to 换算：先折成 CNY 再折成目标 */
  function convert(amount: number, from: string, to: string): number | null {
    const f = byCode(from)
    const t = byCode(to)
    if (!f || !t || !Number.isFinite(amount)) return null
    const inCny = amount * f.rateToCny
    return inCny / t.rateToCny
  }

  /** 更新某币种对 CNY 的汇率 */
  function setRate(code: string, rate: number) {
    const c = byCode(code)
    if (c && Number.isFinite(rate) && rate > 0) c.rateToCny = rate
  }

  function setUpdatedAt(date: string) {
    updatedAt.value = date
  }

  function reset() {
    currencies.value = DEFAULT_CURRENCIES.map((c) => ({ ...c }))
    updatedAt.value = DEFAULT_UPDATED
  }

  return { currencies, updatedAt, byCode, convert, setRate, setUpdatedAt, reset }
})
