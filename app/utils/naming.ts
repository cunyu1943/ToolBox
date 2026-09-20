/**
 * 命名风格转换纯函数：跨 camelCase / snake_case / kebab-case / CONSTANT_CASE / PascalCase 等。
 */

/** 将任意分隔/大小写风格的字符串拆成小写单词序列 */
export function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
}

function capitalize(word: string): string {
  return word ? word[0]!.toUpperCase() + word.slice(1) : word
}

export function toCamelCase(input: string): string {
  return splitWords(input)
    .map((w, i) => (i === 0 ? w : capitalize(w)))
    .join('')
}

export function toPascalCase(input: string): string {
  return splitWords(input).map(capitalize).join('')
}

export function toSnakeCase(input: string): string {
  return splitWords(input).join('_')
}

export function toKebabCase(input: string): string {
  return splitWords(input).join('-')
}

export function toConstantCase(input: string): string {
  return splitWords(input).join('_').toUpperCase()
}

export function toTitleCase(input: string): string {
  return splitWords(input).map(capitalize).join(' ')
}

export function toSentenceCase(input: string): string {
  const words = splitWords(input)
  return words.length ? capitalize(words[0]!) + ' ' + words.slice(1).join(' ') : ''
}
