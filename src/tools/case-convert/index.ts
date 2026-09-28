export type CaseStyle =
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'constant'
  | 'kebab'
  | 'dot'
  | 'sentence'
  | 'title'

export interface CaseStyleMeta {
  id: CaseStyle
  label: string
  separator: string | null
  /** 预览用的示例输出 */
  example: string
}

export const caseStyles: CaseStyleMeta[] = [
  { id: 'camel', label: 'camelCase', separator: null, example: 'userHttpRequestId' },
  { id: 'pascal', label: 'PascalCase', separator: null, example: 'UserHttpRequestId' },
  { id: 'snake', label: 'snake_case', separator: '_', example: 'user_http_request_id' },
  { id: 'constant', label: 'CONSTANT_CASE', separator: '_', example: 'USER_HTTP_REQUEST_ID' },
  { id: 'kebab', label: 'kebab-case', separator: '-', example: 'user-http-request-id' },
  { id: 'dot', label: 'dot.case', separator: '.', example: 'user.http.request.id' },
  { id: 'sentence', label: 'Sentence case', separator: ' ', example: 'User http request id' },
  { id: 'title', label: 'Title Case', separator: ' ', example: 'User Http Request Id' }
]

/** 先拆缩写（HTTPResponse → HTTP Response），再拆驼峰边界，最后按非字母数字下划线切。 */
export function splitWords(input: string): string[] {
  return input
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9\u4e00-\u9fa5]+/)
    .filter(Boolean)
}

const upperFirst = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()

export function convertCase(input: string, style: CaseStyle): string {
  const words = splitWords(input)
  if (!words.length) return ''

  switch (style) {
    case 'camel':
      return words
        .map((word, index) => (index === 0 ? word.toLowerCase() : upperFirst(word)))
        .join('')
    case 'pascal':
      return words.map(upperFirst).join('')
    case 'snake':
      return words.map((word) => word.toLowerCase()).join('_')
    case 'constant':
      return words.map((word) => word.toUpperCase()).join('_')
    case 'kebab':
      return words.map((word) => word.toLowerCase()).join('-')
    case 'dot':
      return words.map((word) => word.toLowerCase()).join('.')
    case 'sentence':
      return words.map((word, index) => (index === 0 ? upperFirst(word) : word.toLowerCase())).join(' ')
    case 'title':
      return words.map(upperFirst).join(' ')
  }
}

export interface CaseInspection {
  words: string[]
  /** 推断输入本身的风格，用于「从 X 转 Y」的提示 */
  detected: CaseStyle | 'unknown'
}

export function inspect(input: string): CaseInspection {
  const words = splitWords(input)
  let detected: CaseStyle | 'unknown' = 'unknown'
  if (words.length) {
    const match = caseStyles.find(
      (style) => convertCase(input, style.id) === input.replace(/\s+/g, ' ').trim()
    )
    detected = match?.id ?? 'unknown'
  }
  return { words, detected }
}

export function convertAll(input: string): Record<CaseStyle, string> {
  return caseStyles.reduce(
    (acc, style) => {
      acc[style.id] = convertCase(input, style.id)
      return acc
    },
    {} as Record<CaseStyle, string>
  )
}
