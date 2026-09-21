/**
 * HTTP 状态码数据表与查询：按码号、英文名、中文说明模糊过滤。
 */

export interface HttpStatusEntry {
  code: number
  name: string
  zh: string
  desc: string
}

export const httpStatuses: HttpStatusEntry[] = [
  { code: 100, name: 'Continue', zh: '继续', desc: '服务器已收到请求头，客户端应继续发送请求体。' },
  { code: 101, name: 'Switching Protocols', zh: '切换协议', desc: '服务器同意切换协议，如升级为 WebSocket。' },
  { code: 103, name: 'Early Hints', zh: '早期提示', desc: '预响应，携带 Link 头让浏览器提前加载资源。' },
  { code: 200, name: 'OK', zh: '成功', desc: '请求已成功处理，响应体包含结果。' },
  { code: 201, name: 'Created', zh: '已创建', desc: '请求成功且创建了新资源，响应通常带 Location 头。' },
  { code: 202, name: 'Accepted', zh: '已接受', desc: '请求已接受但尚未处理完成，常用于异步任务。' },
  { code: 203, name: 'Non-Authoritative Information', zh: '非权威信息', desc: '响应来自代理缓存，可能与源服务器不同。' },
  { code: 204, name: 'No Content', zh: '无内容', desc: '成功处理但无响应体，如删除操作后的确认。' },
  { code: 205, name: 'Reset Content', zh: '重置内容', desc: '成功处理，要求客户端重置表单等视图。' },
  { code: 206, name: 'Partial Content', zh: '部分内容', desc: '范围请求成功，配合 Range 头实现断点续传。' },
  { code: 300, name: 'Multiple Choices', zh: '多种选择', desc: '资源有多个表示，需客户端选择。' },
  { code: 301, name: 'Moved Permanently', zh: '永久重定向', desc: '资源已永久移动到新 URI，SEO 权重会转移。' },
  { code: 302, name: 'Found', zh: '临时重定向', desc: '资源临时位于其他 URI，后续请求仍用原地址。' },
  { code: 303, name: 'See Other', zh: '查看其他地址', desc: '用 GET 到新 URI 获取响应，常用于 POST 后跳转。' },
  { code: 304, name: 'Not Modified', zh: '未修改', desc: '协商缓存命中，客户端可使用本地缓存副本。' },
  { code: 307, name: 'Temporary Redirect', zh: '临时重定向（保持方法）', desc: '类似 302，但重定向时严格保持请求方法与请求体。' },
  { code: 308, name: 'Permanent Redirect', zh: '永久重定向（保持方法）', desc: '类似 301，但重定向时严格保持请求方法与请求体。' },
  { code: 400, name: 'Bad Request', zh: '错误请求', desc: '请求语法或参数有误，服务器无法理解。' },
  { code: 401, name: 'Unauthorized', zh: '未认证', desc: '缺少或无效的认证凭据，需登录后重试。' },
  { code: 402, name: 'Payment Required', zh: '需要付款', desc: '保留状态码，预留给支付场景。' },
  { code: 403, name: 'Forbidden', zh: '禁止访问', desc: '服务器理解请求但拒绝执行，权限不足。' },
  { code: 404, name: 'Not Found', zh: '未找到', desc: '资源不存在，地址拼写错误或已删除。' },
  { code: 405, name: 'Method Not Allowed', zh: '方法不允许', desc: '资源不支持该 HTTP 方法，响应带 Allow 头。' },
  { code: 406, name: 'Not Acceptable', zh: '不可接受', desc: '资源没有匹配 Accept 头的表示。' },
  { code: 408, name: 'Request Timeout', zh: '请求超时', desc: '客户端未在服务器等待时间内完成请求。' },
  { code: 409, name: 'Conflict', zh: '冲突', desc: '请求与资源当前状态冲突，如重复创建、乐观锁失败。' },
  { code: 410, name: 'Gone', zh: '已消失', desc: '资源已永久删除，且无重定向地址。' },
  { code: 411, name: 'Length Required', zh: '需要长度', desc: '缺少 Content-Length 请求头。' },
  { code: 412, name: 'Precondition Failed', zh: '前提条件失败', desc: 'If-Match 等条件请求头校验未通过。' },
  { code: 413, name: 'Content Too Large', zh: '请求体过大', desc: '请求体超出服务器愿意处理的限制。' },
  { code: 414, name: 'URI Too Long', zh: 'URI 过长', desc: '请求行超出服务器长度限制。' },
  { code: 415, name: 'Unsupported Media Type', zh: '不支持的媒体类型', desc: '请求体的 Content-Type 不被资源支持。' },
  { code: 416, name: 'Range Not Satisfiable', zh: '范围不可满足', desc: 'Range 头请求的范围超出资源大小。' },
  { code: 418, name: "I'm a Teapot", zh: '我是茶壶', desc: '彩蛋状态码（RFC 2324 咖啡协议），拒绝泡茶任务。' },
  { code: 422, name: 'Unprocessable Content', zh: '无法处理的内容', desc: '请求格式正确但语义错误，如字段校验失败。' },
  { code: 425, name: 'Too Early', zh: '过早', desc: '请求可能被重放，服务器不愿处理。' },
  { code: 429, name: 'Too Many Requests', zh: '请求过多', desc: '触发限流，配合 Retry-After 头稍后重试。' },
  { code: 431, name: 'Request Header Fields Too Large', zh: '请求头过大', desc: '请求头字段总长超出服务器限制。' },
  { code: 451, name: 'Unavailable For Legal Reasons', zh: '因法律原因不可用', desc: '资源因法律要求被拒绝提供。' },
  { code: 500, name: 'Internal Server Error', zh: '服务器内部错误', desc: '服务器发生未预期的错误。' },
  { code: 501, name: 'Not Implemented', zh: '未实现', desc: '服务器不支持请求的功能，如缺少方法。' },
  { code: 502, name: 'Bad Gateway', zh: '错误网关', desc: '网关/代理从上游收到无效响应。' },
  { code: 503, name: 'Service Unavailable', zh: '服务不可用', desc: '服务器暂时过载或在维护，可带 Retry-After。' },
  { code: 504, name: 'Gateway Timeout', zh: '网关超时', desc: '网关/代理等待上游响应超时。' },
  { code: 505, name: 'HTTP Version Not Supported', zh: '不支持的 HTTP 版本', desc: '服务器不支持请求使用的 HTTP 版本。' },
  { code: 507, name: 'Insufficient Storage', zh: '存储空间不足', desc: '服务器没有空间完成请求（WebDAV）。' },
  { code: 508, name: 'Loop Detected', zh: '检测到循环', desc: '服务器检测到无限循环（WebDAV）。' },
  { code: 511, name: 'Network Authentication Required', zh: '需要网络认证', desc: '需要登录认证，常见于强制门户 WiFi。' }
]

/** 按码号前缀、英文名、中文名、说明做不区分大小写的模糊过滤 */
export function filterStatuses(query: string): HttpStatusEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return httpStatuses
  return httpStatuses.filter(
    (e) =>
      String(e.code).includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.zh.includes(q) ||
      e.desc.includes(q)
  )
}

/** 按大类过滤：1-5，0 表示全部 */
export function filterByClass(entries: HttpStatusEntry[], cls: number): HttpStatusEntry[] {
  if (!cls) return entries
  return entries.filter((e) => Math.floor(e.code / 100) === cls)
}
