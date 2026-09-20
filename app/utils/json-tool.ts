/**
 * JSON 处理纯函数：格式化 / 压缩 / 校验。
 */

export interface JsonResult {
  ok: boolean
  output: string
  error?: string
}

function describeError(e: unknown, text: string): string {
  const msg = e instanceof Error ? e.message : String(e)
  const m = /position (\d+)/.exec(msg)
  if (!m) return msg
  const pos = Number(m[1])
  const line = text.slice(0, pos).split('\n').length
  const col = pos - text.lastIndexOf('\n', pos - 1)
  return `第 ${line} 行第 ${col} 列附近解析失败`
}

/** 格式化（美化）JSON，indent 个空格缩进 */
export function formatJson(text: string, indent = 2): JsonResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, output: '', error: '输入为空' }
  try {
    const obj: unknown = JSON.parse(trimmed)
    return { ok: true, output: JSON.stringify(obj, null, indent) }
  } catch (e) {
    return { ok: false, output: '', error: describeError(e, trimmed) }
  }
}

/** 压缩 JSON（去除所有空白） */
export function minifyJson(text: string): JsonResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, output: '', error: '输入为空' }
  try {
    return { ok: true, output: JSON.stringify(JSON.parse(trimmed)) }
  } catch (e) {
    return { ok: false, output: '', error: describeError(e, trimmed) }
  }
}

/** 仅校验是否合法 JSON */
export function validateJson(text: string): JsonResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, output: '', error: '输入为空' }
  try {
    JSON.parse(trimmed)
    return { ok: true, output: '合法的 JSON' }
  } catch (e) {
    return { ok: false, output: '', error: describeError(e, trimmed) }
  }
}
