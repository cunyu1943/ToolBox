/**
 * JSON → TypeScript 接口生成。
 * 对象生成 interface；数组元素若全为对象则按键合并为一个接口，
 * 在部分元素中缺失的键标记为可选（?）；null 归为 null 类型。
 */

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** 顶层类型名（Root 等），嵌套时按 父名+键名 生成 */
export function jsonToTs(text: string, rootName = 'Root'): string {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('请输入 JSON 内容')
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    throw new Error(`JSON 解析失败：${(e as Error).message}`)
  }

  const out: string[] = []
  const usedNames = new Set<string>()
  const uniqueName = (base: string): string => {
    let name = cap(base.replace(/[^A-Za-z0-9_]/g, '') || 'T')
    let i = 1
    while (usedNames.has(i === 1 ? name : `${name}${i}`)) i++
    if (i > 1) name = `${name}${i}`
    usedNames.add(name)
    return name
  }

  const safeKey = (k: string) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k))

  // 返回该值在字段位置使用的类型表达式；对象会顺带注册 interface 到 out
  const walk = (val: unknown, nameHint: string): string => {
    if (val === null) return 'null'
    if (Array.isArray(val)) {
      if (val.length === 0) return 'unknown[]'
      if (val.every(isPlainObject)) {
        const itemType = walkObjectsAsInterface(val, nameHint.endsWith('s') ? nameHint.slice(0, -1) : `${nameHint}Item`)
        return `${itemType}[]`
      }
      const uniq = [...new Set(val.map((el) => walk(el, `${nameHint}Item`)))]
      return uniq.length === 1 ? `${uniq[0]}[]` : `(${uniq.join(' | ')})[]`
    }
    if (isPlainObject(val)) return walkObjectsAsInterface([val], nameHint)
    switch (typeof val) {
      case 'string': return 'string'
      case 'number': return 'number'
      case 'boolean': return 'boolean'
      default: return 'unknown'
    }
  }

  // 合并多个对象样本为一个 interface：所有键的并集，缺席于任一样本的键加 ?
  const walkObjectsAsInterface = (items: Record<string, unknown>[], nameHint: string): string => {
    const iface = uniqueName(nameHint)
    const firstSeen = new Map<string, unknown>()
    const counts = new Map<string, number>()
    for (const obj of items) {
      for (const k of Object.keys(obj)) {
        if (!firstSeen.has(k)) firstSeen.set(k, obj[k])
        counts.set(k, (counts.get(k) ?? 0) + 1)
      }
    }
    const lines: string[] = []
    for (const [k, sample] of firstSeen) {
      const optional = (counts.get(k) ?? 0) < items.length
      lines.push(`  ${safeKey(k)}${optional ? '?' : ''}: ${walk(sample, iface + cap(k))};`)
    }
    out.push(lines.length ? `interface ${iface} {\n${lines.join('\n')}\n}` : `interface ${iface} {\n}`)
    return iface
  }

  const topType = walk(parsed, rootName)
  const alias = cap(rootName.replace(/[^A-Za-z0-9_]/g, '') || 'T')
  if (topType === alias && isPlainObject(parsed)) return out.join('\n\n')
  return out.length ? `${out.join('\n\n')}\n\nexport type ${alias} = ${topType}` : `export type ${alias} = ${topType}`
}
