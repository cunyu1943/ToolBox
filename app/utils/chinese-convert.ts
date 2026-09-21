import { Converter } from 'opencc-js'

/**
 * 中文繁简转换（opencc-js，纯前端词/字级转换）。
 * 区域变体：cn=简体，tw=繁体台湾，hk=繁体香港，twp/hkp 含惯用语。
 */

export type Locale = 'cn' | 'tw' | 'hk' | 'twp' | 'hkp'

export interface Preset {
  label: string
  from: Locale
  to: Locale
}

export const PRESETS: Preset[] = [
  { label: '简 → 繁（台湾）', from: 'cn', to: 'tw' },
  { label: '繁（台湾） → 简', from: 'tw', to: 'cn' },
  { label: '简 → 繁（香港）', from: 'cn', to: 'hk' },
  { label: '繁（香港） → 简', from: 'hk', to: 'cn' }
]

const cache = new Map<string, (text: string) => string>()

export function convertChinese(text: string, from: Locale, to: Locale): string {
  if (!text || from === to) return text
  const key = `${from}>${to}`
  let fn = cache.get(key)
  if (!fn) {
    fn = Converter({ from, to })
    cache.set(key, fn)
  }
  return fn(text)
}
