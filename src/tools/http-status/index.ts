/**
 * HTTP 速查内核（纯函数 + 静态表，无 DOM 依赖）。
 *
 * 三块数据 + 一个解析器：
 * 1. 状态码表：RFC 9110 为主，另收 WebDAV(RFC 4918)、超文本咖啡壶控制协议(RFC 2324) 与
 *    nginx/IIS 的约定俗成扩展（444/499 等），后者在 `spec` 字段里标明「非标准」；
 * 2. 请求方法表：safe / 幂等 / 是否带请求体三个属性；
 * 3. 常用媒体类型表：扩展名 ↔ Content-Type 双向查；
 * 4. parseContentType：按 RFC 9110 的参数语法手工扫描，正确处理引号内的 `;` 与反斜杠转义。
 *
 * 表是给人查的参考，不是行为规范原文；每条都留了出处便于核对。
 */

export interface StatusEntry {
  code: number
  zh: string
  en: string
  summary: string
  detail: string
  spec: string
}

export type StatusClass = 'info' | 'success' | 'redirect' | 'client' | 'server'

export interface MethodEntry {
  name: string
  safe: boolean
  idempotent: boolean
  requestBody: boolean
  summary: string
}

export interface MimeEntry {
  /** 以点开头的扩展名；无扩展名的请求体类型留空 */
  ext: string
  type: string
  note: string
}

export const STATUS_CLASSES: { id: StatusClass; label: string; range: string; desc: string }[] = [
  { id: 'info', label: '信息响应', range: '1xx', desc: '请求已收到，继续处理' },
  { id: 'success', label: '成功', range: '2xx', desc: '请求已被接受并处理' },
  { id: 'redirect', label: '重定向', range: '3xx', desc: '需要客户端换地址或换方式继续' },
  { id: 'client', label: '客户端错误', range: '4xx', desc: '请求有问题，重试同一请求不会变好' },
  { id: 'server', label: '服务端错误', range: '5xx', desc: '服务端处理失败' }
]

export function statusClass(code: number): StatusClass {
  if (code < 200) return 'info'
  if (code < 300) return 'success'
  if (code < 400) return 'redirect'
  if (code < 500) return 'client'
  return 'server'
}

export const HTTP_STATUS: StatusEntry[] = [
  { code: 100, zh: '继续', en: 'Continue', summary: '告知客户端可以把请求体发过来', detail: '通常由服务端在收到 `Expect: 100-continue` 后返回；大文件上传前常用它先做鉴权，避免白传。', spec: 'RFC 9110 §15.2.1' },
  { code: 101, zh: '切换协议', en: 'Switching Protocols', summary: '同意按 Upgrade 头切换协议', detail: 'WebSocket 握手（HTTP/1.1 升级到 ws）与 HTTP/2 的 h2c 升级都会看到它。此后连接不再是 HTTP 语义。', spec: 'RFC 9110 §15.2.2' },
  { code: 102, zh: '处理中', en: 'Processing', summary: 'WebDAV 多状态请求的占位响应', detail: '用于批量操作时先占住连接，避免超时；已被 103 在实际使用中取代，很少见。', spec: 'RFC 2518（已废弃）' },
  { code: 103, zh: '早期提示', en: 'Early Hints', summary: '先返回 Link 头，让浏览器提前预取资源', detail: '配合 `<link rel=preload>` 能明显缩短首屏；注意中间的 CDN/反代若不支持 1xx 透传，可能把它丢掉。', spec: 'RFC 8297' },
  { code: 200, zh: '确定', en: 'OK', summary: '请求成功，响应体即结果', detail: '最常见的成功码。GET/POST 都可能返回 200，因此前端不能只看码判断语义，还要看 body 结构。', spec: 'RFC 9110 §15.3.1' },
  { code: 201, zh: '已创建', en: 'Created', summary: '资源已创建，Location 指向新资源', detail: '常用于 POST 建资源。异步创建时应在响应里给出任务地址，否则客户端无法定位结果。', spec: 'RFC 9110 §15.3.2' },
  { code: 202, zh: '已接受', en: 'Accepted', summary: '已收下但尚未处理完', detail: '异步任务的典型返回。它不承诺最终成功，客户端必须再查询任务状态。', spec: 'RFC 9110 §15.3.3' },
  { code: 203, zh: '非权威信息', en: 'Non-Authoritative Information', summary: '响应来自缓存或代理改写，非源站原样', detail: '反向代理裁剪过 header 时使用，提示客户端内容可能与源站不一致。', spec: 'RFC 9110 §15.3.4' },
  { code: 204, zh: '无内容', en: 'No Content', summary: '成功但没有响应体', detail: '常用于删除、或前端只关心「做到了」的场景。注意 204 不能带 Content-Type，也不能触发页面跳转。', spec: 'RFC 9110 §15.3.5' },
  { code: 205, zh: '重置内容', en: 'Reset Content', summary: '要求客户端重置表单/视图', detail: '提交成功后让表单清空的标准做法，浏览器会重置当前文档的输入控件。', spec: 'RFC 9110 §15.3.6' },
  { code: 206, zh: '部分内容', en: 'Partial Content', summary: 'Range 请求命中，返回区间内容', detail: '分片下载、视频拖动播放的基础。必须带 Content-Range；若服务端不支持 Range 会退回 200 全量。', spec: 'RFC 9110 §15.3.7' },
  { code: 207, zh: '多状态', en: 'Multi-Status', summary: 'WebDAV：一个响应里逐条列出多个子结果', detail: 'PROPFIND/MULTIPROPSTAT 等方法的返回，body 是 XML。批量操作可能整体 207 而子项各自失败。', spec: 'RFC 4918 §11.1' },
  { code: 208, zh: '已报告', en: 'Already Reported', summary: 'WebDAV 绑定集合里成员状态已在此前报告过', detail: '避免同一集合重复返回相同状态，很少在普通接口里出现。', spec: 'RFC 5842 §7.1' },
  { code: 226, zh: '实例操作完成', en: 'IM Used', summary: '对当前实例做了 Delta-Subrequest 指定的操作', detail: 'HTTP Delta-Encoding（增量传输）配套码，实际部署里几乎遇不到。', spec: 'RFC 3229 §10.9' },
  { code: 300, zh: '多种选择', en: 'Multiple Choices', summary: '同一 URI 有多个代表，交由客户端选', detail: '内容协商失败的兜底。现代 API 更倾向直接返回 406 或固定的 300 变体列表。', spec: 'RFC 9110 §15.4.1' },
  { code: 301, zh: '永久移动', en: 'Moved Permanently', summary: '地址永久变更，可更新书签', detail: '浏览器与爬虫会缓存这个跳转，改错很难撤回（HTTPS 迁移常用它）。历史上 POST 可能被降级为 GET，要严格保方法用 308。', spec: 'RFC 9110 §15.4.2' },
  { code: 302, zh: '临时移动', en: 'Found', summary: '临时换地址，不应更新书签', detail: '最常用的跳转码，同样存在 POST→GET 降级的历史包袱。', spec: 'RFC 9110 §15.4.3' },
  { code: 303, zh: '查看其他地址', en: 'See Other', summary: '用 GET 去另一个地址取结果', detail: 'POST/PUT 之后做 PRG（Post/Redirect/Get）防止刷新重复提交的正规选择。', spec: 'RFC 9110 §15.4.4' },
  { code: 304, zh: '未修改', en: 'Not Modified', summary: '协商缓存命中，用本地副本', detail: '由 If-None-Match / If-Modified-Since 触发，响应不能带 body。看不到 304 通常说明缓存头没配好。', spec: 'RFC 9110 §15.4.5' },
  { code: 305, zh: '使用代理', en: 'Use Proxy', summary: '必须通过指定代理访问', detail: '因安全原因已在 RFC 9110 中废弃，客户端普遍不实现。', spec: 'RFC 9110（已废弃）' },
  { code: 306, zh: '切换代理', en: 'Switch Proxy', summary: '历史上要求改用另一个代理', detail: '从未被实现，RFC 9110 已把该码标记为「不使用」。', spec: 'RFC 9110（未使用）' },
  { code: 307, zh: '临时重定向', en: 'Temporary Redirect', summary: '与 302 相同但禁止把方法改成 GET', detail: '需要保留 POST 方法与请求体时用 307。缓存策略与 302 一样按头决定。', spec: 'RFC 9110 §15.4.8' },
  { code: 308, zh: '永久重定向', en: 'Permanent Redirect', summary: '永久跳转且方法与 body 都不能变', detail: '与 301 的区别就在于严格保留请求方法；API 网关做路径永久迁移时更稳。', spec: 'RFC 9110 §15.4.9' },
  { code: 400, zh: '请求错误', en: 'Bad Request', summary: '语法或参数不合法', detail: 'JSON 解析失败、必填缺失、类型不对都可能落在这里。最好带结构化的字段级错误，否则前端无从修。', spec: 'RFC 9110 §15.5.1' },
  { code: 401, zh: '未认证', en: 'Unauthorized', summary: '缺少或无效的凭据，需带 WWW-Authenticate 重试', detail: '语义上其实是「未认证」——认证失败用 401，认证通过但没权限用 403。跨域时 401 会被 CORS 拦，浏览器只看得到网络错误。', spec: 'RFC 9110 §15.5.2' },
  { code: 402, zh: '需要付款', en: 'Payment Required', summary: '预留码，尚未标准化', detail: '历史上为数字货币预留；部分服务（如 Stripe 的欠费拦截）自发使用它表示需要充值。', spec: 'RFC 9110 §15.5.3' },
  { code: 403, zh: '禁止访问', en: 'Forbidden', summary: '服务端理解请求但拒绝执行', detail: '身份明确而权限不足。若不想泄露资源是否存在，常把 404 统一成 403。', spec: 'RFC 9110 §15.5.4' },
  { code: 404, zh: '未找到', en: 'Not Found', summary: '当前地址没有对应资源', detail: 'URL 打错、资源已删都会遇到。SPA 静态托管需要 404.html 兜底才能接住深链。', spec: 'RFC 9110 §15.5.5' },
  { code: 405, zh: '方法不允许', en: 'Method Not Allowed', summary: '地址存在但该 HTTP 方法不支持', detail: '响应应带 Allow 头列出允许的方法。表单提交到只读接口最常见。', spec: 'RFC 9110 §15.5.6' },
  { code: 406, zh: '不可接受', en: 'Not Acceptable', summary: '无法提供 Accept 要求的媒体类型', detail: '内容协商失败。若服务端忽略 Accept 直接返回自己的类型，比硬返 406 更常见。', spec: 'RFC 9110 §15.5.7' },
  { code: 407, zh: '需要代理认证', en: 'Proxy Authentication Required', summary: '要通过代理鉴权', detail: '公司内网出口代理会返回它，配合 Proxy-Authenticate 头。', spec: 'RFC 9110 §15.5.8' },
  { code: 408, zh: '请求超时', en: 'Request Timeout', summary: '服务端在超时窗口内没收到完整请求', detail: '客户端网络抖动或上传太慢。该码可以安全重试（幂等前提下）。', spec: 'RFC 9110 §15.5.9' },
  { code: 409, zh: '冲突', en: 'Conflict', summary: '与资源当前状态冲突', detail: '重复注册、乐观锁版本不匹配、并发覆盖是典型场景。响应里给出当前版本能帮客户端做合并。', spec: 'RFC 9110 §15.5.10' },
  { code: 410, zh: '已永久删除', en: 'Gone', summary: '资源已永久删除，且不知道去处', detail: '比 404 更明确：告诉爬虫可以停止索引并删掉链接。', spec: 'RFC 9110 §15.5.11' },
  { code: 411, zh: '需要长度', en: 'Length Required', summary: '必须带 Content-Length', detail: '用 chunked 传输打到某些严格网关时会遇到。补上长度即可。', spec: 'RFC 9110 §15.5.12' },
  { code: 412, zh: '前提条件失败', en: 'Precondition Failed', summary: 'If-Match / If-Unmodified-Since 校验不通过', detail: '乐观并发控制的标准返回：你看到的版本已经不是最新版本。', spec: 'RFC 9110 §15.5.13' },
  { code: 413, zh: '请求体过大', en: 'Content Too Large', summary: '服务端不愿意处理这么大的请求体', detail: '旧名 Payload Too Large。上传超限、反代的 client_max_body_size 都会触发，响应可带 Retry-After。', spec: 'RFC 9110 §15.5.14' },
  { code: 414, zh: 'URI 过长', en: 'URI Too Long', summary: '请求行长度超过服务端容忍', detail: '把大量数据塞进 GET 查询串的典型后果；Nginx 默认约 8k，超限也可能直接断连。', spec: 'RFC 9110 §15.5.15' },
  { code: 415, zh: '不支持的媒体类型', en: 'Unsupported Media Type', summary: '请求体格式服务端不认', detail: '忘带 `Content-Type: application/json` 或发成 text/plain 时最容易碰到。', spec: 'RFC 9110 §15.5.16' },
  { code: 416, zh: '范围不满足', en: 'Range Not Satisfiable', summary: '请求的字节区间无法满足', detail: '分片下载越界或文件被换掉。响应应带 Content-Range: */总长度。', spec: 'RFC 9110 §15.5.17' },
  { code: 417, zh: '期望失败', en: 'Expectation Failed', summary: '无法满足 Expect 头的要求', detail: '客户端带 `Expect: 100-continue` 而服务端不支持时返回；也可能是链路上的代理所为。', spec: 'RFC 9110 §15.5.18' },
  { code: 418, zh: '我是茶壶', en: "I'm a teapot", summary: '拒绝用咖啡壶泡茶的彩蛋码', detail: '超文本咖啡壶控制协议条目，愚人节玩笑但被普遍实现，某些服务用它做健康检查或限流的趣味返回。', spec: 'RFC 2324 §2.3.2' },
  { code: 421, zh: '请求被误导向', en: 'Misdirected Request', summary: '该地址不能在当前连接上提供响应', detail: 'HTTP/2 连接复用但 SNI/证书不匹配时的标准返回，客户端可换新连接重试。', spec: 'RFC 9110 §15.5.20' },
  { code: 422, zh: '无法处理的内容', en: 'Unprocessable Content', summary: '语法正确但语义无法处理', detail: '表单校验失败的常用码（旧名 Unprocessable Entity）。与 400 的区别是「格式没错、内容不行」。', spec: 'RFC 9110 §15.5.21' },
  { code: 423, zh: '已锁定', en: 'Locked', summary: 'WebDAV 资源被锁定', detail: '配合 If: 头做编辑锁，协作文档类服务会用到。', spec: 'RFC 4918 §11.2' },
  { code: 424, zh: '依赖失败', en: 'Failed Dependency', summary: '因为前置子请求失败而无法执行', detail: 'WebDAV 批量操作中某一步失败的连带码。', spec: 'RFC 4918 §11.3' },
  { code: 425, zh: '过早', en: 'Too Early', summary: '服务端不愿承担重放风险', detail: 'TLS 1.3 的 0-RTT 早数据可能重放，服务端用它要求稍后重试。', spec: 'RFC 8470 §3' },
  { code: 426, zh: '需要升级', en: 'Upgrade Required', summary: '要求客户端换协议版本', detail: '配合 Upgrade 头，例如只接受 HTTP/2 的服务对 HTTP/1.1 请求的答复。', spec: 'RFC 9110 §15.5.23' },
  { code: 428, zh: '需要前提条件', en: 'Precondition Required', summary: '要求请求带 If-Match 之类的条件头', detail: '防止更新丢失（lost update）的强制乐观锁；中间人代理可能改写条件头，所以不宜跨代理使用。', spec: 'RFC 6585 §3' },
  { code: 429, zh: '请求过多', en: 'Too Many Requests', summary: '触发限流', detail: '应带 Retry-After 指示等待时长，客户端要按退避策略处理，否则重试风暴会放大故障。', spec: 'RFC 6585 §4' },
  { code: 431, zh: '请求头字段过大', en: 'Request Header Fields Too Large', summary: '单个头或头总量超出限制', detail: 'cookie 堆积是常见原因，清理域名下的旧 cookie 往往就能解决。', spec: 'RFC 6585 §5' },
  { code: 444, zh: '不返回任何信息', en: 'No Response (nginx)', summary: 'nginx 专用：直接关闭连接，不回任何响应', detail: '非标准。常用于拦截空 Host、扫描器与盗链，客户端看到的是连接被断开而不是 HTTP 错误。', spec: 'nginx 扩展' },
  { code: 451, zh: '因法律原因不可用', en: 'Unavailable For Legal Reasons', summary: '因审查或法律要求屏蔽', detail: '响应应带 `Link: <…>; rel="blocked-by"` 指明责任方，用于公开告知是哪一方的要求导致屏蔽。', spec: 'RFC 7725 §3' },
  { code: 499, zh: '客户端主动断开', en: 'Client Closed Request (nginx)', summary: 'nginx 记录：连接在响应发出前被客户端关闭', detail: '非标准，不会真的发给客户端。日志里大量 499 通常说明前端超时设得比后端快，或用户在等不及 abort。', spec: 'nginx 扩展' },
  { code: 500, zh: '服务器内部错误', en: 'Internal Server Error', summary: '未被明确归类的服务端异常', detail: '响应里不要回带堆栈。定位要看服务端日志与 trace id。', spec: 'RFC 9110 §15.6.1' },
  { code: 501, zh: '尚未实现', en: 'Not Implemented', summary: '服务端不支持该方法', detail: '与 502 的区别是：这是能力缺失而非上游故障，重试无用。', spec: 'RFC 9110 §15.6.2' },
  { code: 502, zh: '错误网关', en: 'Bad Gateway', summary: '从上游收到了无效响应', detail: '反代/网关的典型码：上游崩溃、返回半截响应、协议不匹配都会得到 502。可安全重试（幂等前提下）。', spec: 'RFC 9110 §15.6.3' },
  { code: 503, zh: '服务不可用', en: 'Service Unavailable', summary: '暂时过载或在维护', detail: '应带 Retry-After 做退避；配合 LB 的健康检查可以把流量摘干净。', spec: 'RFC 9110 §15.6.4' },
  { code: 504, zh: '网关超时', en: 'Gateway Timeout', summary: '上游在窗口内没响应', detail: '与 502 常一起出现。链路里最慢的那一跳决定这个码，排查看网关的 read timeout 与上游 P99。', spec: 'RFC 9110 §15.6.5' },
  { code: 505, zh: 'HTTP 版本不支持', en: 'HTTP Version Not Supported', summary: '服务端不支持请求行的 HTTP 版本', detail: '例如强制 HTTP/2 的入口收到 HTTP/1.0 请求。', spec: 'RFC 9110 §15.6.6' },
  { code: 506, zh: '变体也参与协商', en: 'Variant Also Negotiates', summary: '透明协商配置成环', detail: '内容协商的变体自身又被配置为需协商，属于服务端配置错误。', spec: 'RFC 2295 §8.1' },
  { code: 507, zh: '存储空间不足', en: 'Insufficient Storage', summary: 'WebDAV：无法完成请求，因为存储不够', detail: '磁盘写满的明确信号；不应重试同一操作，除非清理后。', spec: 'RFC 4918 §11.5' },
  { code: 508, zh: '检测到循环', en: 'Loop Detected', summary: 'WebDAV：绑定集合出现了环', detail: 'A 绑定到 B、B 又绑定回 A 时的返回。', spec: 'RFC 5842 §7.2' },
  { code: 510, zh: '未扩展', en: 'Not Extended', summary: '需要请求扩展但服务端未获得', detail: '使用了必需的扩展策略而请求里没带上，属于策略配置问题。', spec: 'RFC 2774 §7' },
  { code: 511, zh: '需要网络认证', en: 'Network Authentication Required', summary: '强制门户登录（captive portal）', detail: '酒店/机场 WiFi 的登录页常以它为语义，客户端据此弹出处方。', spec: 'RFC 6585 §6' },
  { code: 599, zh: '自定义网关错误', en: 'Custom (common convention)', summary: '部分云网关用于表示上游超时/连接失败', detail: '非标准，未在任何 RFC 或 nginx 源码里定义，只在若干云厂商文档与实践中出现。', spec: '业界约定' }
]

export const HTTP_METHODS: MethodEntry[] = [
  { name: 'GET', safe: true, idempotent: true, requestBody: false, summary: '读取资源。不应有副作用，可缓存、可收藏' },
  { name: 'HEAD', safe: true, idempotent: true, requestBody: false, summary: '只要头的 GET，用于探活、看大小与 ETag' },
  { name: 'POST', safe: false, idempotent: false, requestBody: true, summary: '提交/创建，重复提交会重复生效，需幂等键保护' },
  { name: 'PUT', safe: false, idempotent: true, requestBody: true, summary: '整体替换，同一请求重复执行结果相同' },
  { name: 'PATCH', safe: false, idempotent: false, requestBody: true, summary: '局部修改；是否幂等取决于补丁内容（如「加 1」不幂等）' },
  { name: 'DELETE', safe: false, idempotent: true, requestBody: false, summary: '删除。再删一次通常返回 404/204，状态效果一致' },
  { name: 'OPTIONS', safe: true, idempotent: true, requestBody: false, summary: '查询支持的方法与 CORS 预检' },
  { name: 'CONNECT', safe: false, idempotent: false, requestBody: false, summary: '建立到目标端的隧道，HTTPS 代理用' },
  { name: 'TRACE', safe: true, idempotent: true, requestBody: false, summary: '回显请求，XST 攻击面，服务端普遍禁用' }
]

export const MIME_TYPES: MimeEntry[] = [
  { ext: '.html', type: 'text/html', note: '网页；浏览器据此进入 HTML 渲染模式' },
  { ext: '.htm', type: 'text/html', note: '同 .html' },
  { ext: '.css', type: 'text/css', note: '样式表' },
  { ext: '.js', type: 'text/javascript', note: '脚本。旧的 application/javascript 仍被接受' },
  { ext: '.mjs', type: 'text/javascript', note: 'ESM 模块文件' },
  { ext: '.json', type: 'application/json', note: '必须是 UTF-8；带 BOM 会让部分解析器报错' },
  { ext: '.jsonld', type: 'application/ld+json', note: 'JSON-LD 结构化数据' },
  { ext: '.txt', type: 'text/plain', note: '纯文本，最保守的兜底类型' },
  { ext: '.md', type: 'text/markdown', note: '服务端常直接返回 text/plain' },
  { ext: '.xml', type: 'application/xml', note: '文本类；SVG 例外用 image/svg+xml' },
  { ext: '.csv', type: 'text/csv', note: 'Excel 打开需要 UTF-8 BOM 才不乱码' },
  { ext: '.yml', type: 'text/yaml', note: '未正式注册，实践中常用 text/yaml 或 application/x-yaml' },
  { ext: '.yaml', type: 'text/yaml', note: '同上' },
  { ext: '', type: 'application/x-www-form-urlencoded', note: '表单默认编码，无扩展名，只出现在请求体' },
  { ext: '', type: 'multipart/form-data', note: '文件上传；boundary 参数分隔各部分，无扩展名' },
  { ext: '', type: 'application/octet-stream', note: '不透明的二进制兜底，触发下载而非渲染' },
  { ext: '.png', type: 'image/png', note: '无损，适合截图与透明图' },
  { ext: '.jpg', type: 'image/jpeg', note: '有损照片格式' },
  { ext: '.jpeg', type: 'image/jpeg', note: '同 .jpg' },
  { ext: '.gif', type: 'image/gif', note: '256 色 + 动画' },
  { ext: '.webp', type: 'image/webp', note: '同画质更小，浏览器普遍支持' },
  { ext: '.avif', type: 'image/avif', note: '压缩比更高，老浏览器需要回退' },
  { ext: '.svg', type: 'image/svg+xml', note: 'XML 矢量；内容不可信时会造成 XSS' },
  { ext: '.ico', type: 'image/x-icon', note: '站点图标，历史上也写作 image/vnd.microsoft.icon' },
  { ext: '.bmp', type: 'image/bmp', note: '位图，未压缩' },
  { ext: '.mp3', type: 'audio/mpeg', note: '音频' },
  { ext: '.wav', type: 'audio/wav', note: '未压缩 PCM 音频' },
  { ext: '.ogg', type: 'audio/ogg', note: '容器；视频时是 video/ogg' },
  { ext: '.mp4', type: 'video/mp4', note: '流媒体常用，需配合 Range 才能拖动播放' },
  { ext: '.webm', type: 'video/webm', note: '开源容器' },
  { ext: '.mov', type: 'video/quicktime', note: 'Apple 容器' },
  { ext: '.woff', type: 'font/woff', note: 'Web 字体；历史上的 application/x-font-woff 已不需要' },
  { ext: '.woff2', type: 'font/woff2', note: '压缩后的 Web 字体' },
  { ext: '.ttf', type: 'font/ttf', note: 'TrueType' },
  { ext: '.otf', type: 'font/otf', note: 'OpenType' },
  { ext: '.pdf', type: 'application/pdf', note: '浏览器内置查看器依赖该类型' },
  { ext: '.zip', type: 'application/zip', note: '压缩包' },
  { ext: '.gz', type: 'application/gzip', note: 'gzip；`Content-Encoding: gzip` 与之不同，是传输层压缩' },
  { ext: '.tar', type: 'application/x-tar', note: '归档' },
  { ext: '.wasm', type: 'application/wasm', note: 'WebAssembly；缺这个类型浏览器拒绝实例化' },
  { ext: '.webmanifest', type: 'application/manifest+json', note: 'PWA 清单' },
  { ext: '.map', type: 'application/json', note: 'source map，按 JSON 传输' }
]

/** 详情页默认展示的常见码 */
export const POPULAR_STATUS_CODES = [200, 301, 302, 304, 400, 401, 403, 404, 405, 408, 409, 413, 429, 500, 502, 503, 504]

export function findStatus(code: number): StatusEntry | undefined {
  return HTTP_STATUS.find((entry) => entry.code === code)
}

function haystack(entry: StatusEntry): string {
  return `${entry.code} ${entry.zh} ${entry.en} ${entry.summary} ${entry.detail} ${entry.spec}`.toLowerCase()
}

/**
 * 混合查询：数字优先当状态码（含前缀），其余按字段权重排序。
 * 空查询返回全表，交给页面做分类筛选。
 */
export function searchStatus(query: string): StatusEntry[] {
  const text = query.trim().toLowerCase()
  if (!text) return [...HTTP_STATUS]

  const digits = text.replace(/[^0-9]/g, '')
  if (digits && digits === text) {
    const exact = HTTP_STATUS.filter((entry) => entry.code === Number(digits))
    if (exact.length) return exact
    if (digits.length >= 1) return HTTP_STATUS.filter((entry) => String(entry.code).startsWith(digits))
  }

  const scored: { entry: StatusEntry; score: number }[] = []
  for (const entry of HTTP_STATUS) {
    let score = 0
    if (String(entry.code) === text) score = 100
    else if (entry.zh.toLowerCase().includes(text)) score = 60
    else if (entry.en.toLowerCase().includes(text)) score = 55
    else if (entry.summary.toLowerCase().includes(text)) score = 25
    else if (entry.detail.toLowerCase().includes(text)) score = 15
    else if (entry.spec.toLowerCase().includes(text)) score = 10
    if (score) scored.push({ entry, score })
  }
  if (!scored.length) return HTTP_STATUS.filter((entry) => haystack(entry).includes(text))
  scored.sort((a, b) => b.score - a.score || a.entry.code - b.entry.code)
  return scored.map((item) => item.entry)
}

export function mimeOfExtension(extension: string): MimeEntry[] {
  const want = extension.trim().toLowerCase().replace(/^(?!\.)/, '.')
  return MIME_TYPES.filter((entry) => entry.ext === want)
}

export function extensionsOfType(type: string): string[] {
  const want = type.trim().toLowerCase()
  return MIME_TYPES.filter((entry) => entry.type.toLowerCase() === want).map((entry) => entry.ext).filter(Boolean)
}

export interface ContentTypeResult {
  ok: boolean
  type?: string
  subtype?: string
  params: Record<string, string>
  notes: string[]
  error?: string
}

const TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/

/** 从 `type/subtype; k=v; k2="带 ; 和 \\ 的引号串"` 里拆出类型与参数 */
export function parseContentType(header: string): ContentTypeResult {
  const notes: string[] = []
  const text = header.trim()
  if (!text) return { ok: false, params: {}, notes, error: '请输入 Content-Type 头的值' }

  const parts = splitParameters(text)
  const media = (parts[0] ?? '').trim().toLowerCase()
  const [type = '', subtype = ''] = media.split('/')
  if (!media.includes('/')) {
    return { ok: false, params: {}, notes, error: `缺少 "/"：${media || '(空)'}` }
  }
  if (!TOKEN_RE.test(type) || !TOKEN_RE.test(subtype)) {
    return { ok: false, params: {}, notes, error: `类型 ${media} 含非法字符（只允许 token 字符集）` }
  }

  const params: Record<string, string> = {}
  for (const raw of parts.slice(1)) {
    const item = raw.trim()
    if (!item) {
      notes.push('存在空参数（连续的 `;`），已跳过')
      continue
    }
    const eq = item.indexOf('=')
    if (eq < 0) {
      notes.push(`参数 ${item} 没有 "="，已跳过`)
      continue
    }
    const key = item.slice(0, eq).trim().toLowerCase()
    if (!TOKEN_RE.test(key)) {
      notes.push(`参数名 ${key} 非法，已跳过`)
      continue
    }
    const { value, quoted } = unquote(item.slice(eq + 1).trim())
    if (key in params) notes.push(`参数 ${key} 重复，后者覆盖前者（${params[key]} → ${value}）`)
    if (!quoted && /[\s;,]/.test(value)) notes.push(`参数 ${key} 的值含特殊字符但未加引号，建议写成 "${value}"`)
    params[key] = value
  }

  if (params.charset) {
    const charset = params.charset.toLowerCase()
    if (charset !== 'utf-8' && type === 'text') notes.push(`text 类型使用 ${charset}，中文环境建议统一 UTF-8`)
  }

  return { ok: true, type, subtype, params, notes }
}

/** 按分号切分，但忽略引号内部的分号 */
function splitParameters(text: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuote = false
  let escaped = false
  for (const ch of text) {
    if (escaped) {
      current += ch
      escaped = false
      continue
    }
    if (ch === '\\' && inQuote) {
      current += ch
      escaped = true
      continue
    }
    if (ch === '"') {
      inQuote = !inQuote
      current += ch
      continue
    }
    if (ch === ';' && !inQuote) {
      out.push(current)
      current = ''
      continue
    }
    current += ch
  }
  out.push(current)
  return out
}

function unquote(value: string): { value: string; quoted: boolean } {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return { value: value.slice(1, -1).replace(/\\(.)/g, '$1'), quoted: true }
  }
  return { value, quoted: false }
}
