export type CategoryId = 'encode' | 'format' | 'text' | 'crypto' | 'math' | 'time' | 'visual' | 'network' | 'health' | 'finance' | 'life'

export interface ToolCategory {
  id: CategoryId
  label: string
  /** Iconify 名称（`lucide:xxx`），需保证在 vite.config 的 clientBundle.icons 里 */
  icon: string
  description: string
}

export interface ToolDefinition {
  /** 同时是路由段与页面文件名约定：`json-format` → `/tools/json-format` → `pages/tools/JsonFormatPage.vue` */
  id: string
  name: string
  description: string
  /** 供搜索匹配的别名/关键词，不参与展示 */
  keywords: string[]
  category: CategoryId
  icon: string
}

export const toolCategories: ToolCategory[] = [
  { id: 'encode', label: '编码转换', icon: 'lucide:binary', description: 'Base64、URL、HTML 实体、摩尔斯与 Unicode 转义' },
  { id: 'format', label: '格式化', icon: 'lucide:braces', description: '结构化文本的美化、压缩、比对，以及表格与 HTML ⇄ Markdown' },
  { id: 'text', label: '文本处理', icon: 'lucide:type', description: '命名风格、文本统计、行处理、查找替换与正则调试' },
  { id: 'crypto', label: '哈希与生成', icon: 'lucide:hash', description: '摘要计算与随机标识生成' },
  { id: 'math', label: '数学与换算', icon: 'lucide:calculator', description: '表达式求值、单位进制换算、罗马数字与浮点位布局' },
  { id: 'time', label: '时间日期', icon: 'lucide:clock', description: '时间戳、日期间隔与 crontab 表达式' },
  { id: 'visual', label: '颜色与图像', icon: 'lucide:palette', description: '取色、色彩空间、渐变与二维码' },
  { id: 'network', label: '网络与运维', icon: 'lucide:globe', description: 'IPv4 子网、文件权限、HTTP 速查与硬盘容量分区' },
  { id: 'health', label: '健康与体能', icon: 'lucide:heart-pulse', description: 'BMI、基础代谢与每日消耗、体脂率、饮水量、靶心率区间' },
  { id: 'finance', label: '金融与理财', icon: 'lucide:piggy-bank', description: '房贷车贷分期、投资复利、五险一金与汇率换算' },
  { id: 'life', label: '生活常用', icon: 'lucide:coffee', description: '年龄生日、身份证核验、生肖星座、亲戚称谓、抽签随机数与百分比' }
]

export const tools: ToolDefinition[] = [
  {
    id: 'json-format',
    name: 'JSON 格式化',
    description: '美化、压缩、校验 JSON，保留键序并标出出错位置',
    keywords: ['json', '格式化', '美化', '压缩', '校验', 'minify', 'pretty', 'beautify'],
    category: 'format',
    icon: 'lucide:braces'
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    description: 'Unix 秒/毫秒与本地时间双向转换，附相对时间与常用时区',
    keywords: ['timestamp', 'unix', '时间戳', '日期', 'date', '时区', 'utc'],
    category: 'time',
    icon: 'lucide:clock'
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    description: '文本与 Base64 互转，正确处理 UTF-8 与 data URL',
    keywords: ['base64', 'atob', 'btoa', '编码', '解码', 'data url', 'utf8'],
    category: 'encode',
    icon: 'lucide:binary'
  },
  {
    id: 'url',
    name: 'URL 编解码与解析',
    description: '百分号编码、查询参数拆解、协议/主机/路径分段查看',
    keywords: ['url', 'uri', 'encode', 'decode', 'query', '查询参数', '百分号', 'percent'],
    category: 'encode',
    icon: 'lucide:link'
  },
  {
    id: 'color',
    name: '颜色转换器',
    description: 'HEX / RGB / HSL 互转，附带对比度与色阶预览',
    keywords: ['color', '颜色', 'hex', 'rgb', 'hsl', '取色', '对比度', 'contrast', 'wcag'],
    category: 'visual',
    icon: 'lucide:palette'
  },
  {
    id: 'contrast',
    name: '对比度检查',
    description: '前景与背景的 WCAG 对比度判定，不达标时给出改动最小的可用前景色',
    keywords: [
      'contrast', '对比度', '无障碍', 'accessibility', 'a11y', 'wcag', 'aa', 'aaa',
      '可读性', '前景', '背景', '文字颜色', '4.5', '亮度', 'luminance'
    ],
    category: 'visual',
    icon: 'lucide:contrast'
  },
  {
    id: 'regex',
    name: '正则测试',
    description: '实时匹配高亮、捕获组与替换预览，支持常用标志位',
    keywords: ['regex', '正则', '匹配', 'match', 'replace', '捕获组', 'pattern'],
    category: 'text',
    icon: 'lucide:regex'
  },
  {
    id: 'hash',
    name: '哈希计算',
    description: 'MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512 本地摘要',
    keywords: ['hash', '哈希', '摘要', 'md5', 'sha1', 'sha256', 'sha512', 'digest', 'checksum'],
    category: 'crypto',
    icon: 'lucide:hash'
  },
  {
    id: 'uuid',
    name: 'UUID 生成器',
    description: '批量生成 v4 / v7 风格随机标识符，可选大小写与连字符',
    keywords: ['uuid', 'guid', '随机', '唯一 id', 'nanoid', 'v4', 'v7'],
    category: 'crypto',
    icon: 'lucide:fingerprint-pattern'
  },
  {
    id: 'diff',
    name: '文本对比',
    description: '逐行比对两段文本，标出新增、删除与相同行',
    keywords: ['diff', '对比', '比较', '差异', '版本', 'compare', 'patch'],
    category: 'format',
    icon: 'lucide:diff'
  },
  {
    id: 'image-base64',
    name: '图片转 Base64',
    description: '本地图片转 data URL，显示体积并可直接复制引用',
    keywords: ['image', '图片', 'data url', 'base64', 'png', 'jpg', 'svg', 'webp'],
    category: 'encode',
    icon: 'lucide:image'
  },
  {
    id: 'qr-code',
    name: '二维码生成',
    description: '文本/链接生成二维码，可调容错与尺寸，导出 SVG 或 PNG',
    keywords: ['qrcode', '二维码', '扫码', 'svg', 'png', '链接'],
    category: 'visual',
    icon: 'lucide:qr-code'
  },
  {
    id: 'case-convert',
    name: '命名风格转换',
    description: 'camelCase / snake_case / kebab-case / PascalCase / CONSTANT_CASE 互转',
    keywords: ['case', '命名', '驼峰', '下划线', '中划线', 'camel', 'snake', 'kebab', 'pascal', 'constant'],
    category: 'text',
    icon: 'lucide:case-sensitive'
  },
  {
    id: 'calculator',
    name: '表达式计算器',
    description: '四则运算、幂与函数求值，支持键盘输入、千分位与 12 位有效数字',
    keywords: ['calculator', '计算', '计算器', '表达式', '四则运算', '数学', 'sqrt', 'pow', 'expression'],
    category: 'math',
    icon: 'lucide:calculator'
  },
  {
    id: 'unit-convert',
    name: '单位换算',
    description: '长度、面积、体积、质量、温度、时间、速度、存储共 8 组单位互转',
    keywords: ['unit', '单位', '换算', '长度', '面积', '重量', '质量', '温度', '速度', '字节', '升', '英寸'],
    category: 'math',
    icon: 'lucide:ruler'
  },
  {
    id: 'number-base',
    name: '进制转换',
    description: '2–36 进制互转、Base32 与按位运算，BigInt 精确处理大数并标出移位溢出',
    keywords: [
      'base',
      '进制',
      '二进制',
      '八进制',
      '十六进制',
      'hex',
      'bin',
      'octal',
      'bigint',
      '位宽',
      'base32',
      'rfc4648',
      '按位',
      '位运算',
      'AND',
      'OR',
      'XOR',
      'NOT',
      '与',
      '或',
      '异或',
      '取反',
      '左移',
      '右移',
      '补码',
      'bitwise'
    ],
    category: 'math',
    icon: 'lucide:arrow-left-right'
  },
  {
    id: 'jwt-decode',
    name: 'JWT 解析',
    description: '拆开 header / payload / 签名，base64url 解码并标注 exp 剩余时间',
    keywords: ['jwt', 'token', '令牌', 'base64url', 'payload', 'claim', 'exp', '鉴权', '签名'],
    category: 'encode',
    icon: 'lucide:file-json'
  },
  {
    id: 'csv-json',
    name: 'CSV ↔ JSON',
    description: 'RFC 4180 逐字符解析，支持引号/换行/多分隔符，双向转换可无损往返',
    keywords: ['csv', 'json', '表格', '分隔符', '逗号', '分号', 'tab', '表头', '导入导出'],
    category: 'format',
    icon: 'lucide:table'
  },
  {
    id: 'password-gen',
    name: '随机密码生成',
    description: '用 CSPRNG 批量生成密码，实时显示熵值与离线破解时间估算',
    keywords: ['password', '密码', '随机', 'csprng', '熵', '强度', '口令', 'passphrase'],
    category: 'crypto',
    icon: 'lucide:key-round'
  },
  {
    id: 'password-strength',
    name: '密码强度评估',
    description: '给自写口令估算熵与离线破解耗时，识别弱口令、连续序列、重复段与日期结构',
    keywords: [
      'password strength', '口令', '密码强度', '强度', '熵', 'entropy', 'bit',
      '破解', 'brute force', '弱口令', '常见密码', '评估', '安全'
    ],
    category: 'crypto',
    icon: 'lucide:gauge'
  },
  {
    id: 'date-diff',
    name: '日期计算器',
    description: '日期间隔、星期与 ISO 周、按年月日推算，以及扣除周末的工作日统计',
    keywords: ['date', '日期', '间隔', '相差', '工作日', 'ISO 周', '闰年', '倒计时', '天数'],
    category: 'time',
    icon: 'lucide:calendar-range'
  },
  {
    id: 'ip-subnet',
    name: '子网计算器',
    description: 'IPv4 CIDR 与掩码互算、借位拆分、子网列表与按主机数规划前缀',
    keywords: ['ip', 'subnet', '子网', 'cidr', '掩码', '广播', '网关', 'ipv4', '网络', '内网'],
    category: 'network',
    icon: 'lucide:network'
  },
  {
    id: 'html-entity',
    name: 'HTML 实体编解码',
    description: '转义 & < > 与引号，命名实体与数字引用互转，按规范处理越界码点',
    keywords: ['html', 'entity', '实体', '转义', 'escape', 'encode', 'decode', 'amp', 'nbsp', 'xss', '字符'],
    category: 'encode',
    icon: 'lucide:ampersand'
  },
  {
    id: 'cron-parse',
    name: 'crontab 解析',
    description: '5 段表达式逐字段展开、中文摘要，并推算接下来 N 次触发时刻',
    keywords: ['cron', 'crontab', '定时', '计划任务', '调度', '表达式', 'scheduler', 'cron 表达式', 'linux'],
    category: 'time',
    icon: 'lucide:calendar-clock'
  },
  {
    id: 'float-bits',
    name: '浮点数位布局',
    description: 'IEEE 754 半/单/双精度位视图、精确十进制展开、1 ulp 与 nextUp/nextDown',
    keywords: ['float', 'double', 'ieee754', '浮点', '精度', '舍入', 'ulp', 'binary32', 'binary64', '位布局', '0.1'],
    category: 'math',
    icon: 'lucide:square-radical'
  },
  {
    id: 'rmb-uppercase',
    name: '人民币大写转换',
    description: '金额 ↔ 中文大写互转，附小写中文读法，按票据惯例补「整」，反解核对大小写是否一致',
    keywords: ['人民币', '大写', '金额', 'rmb', '票据', '支票', '财务', '元角分', 'cncc', '中文数字',
      '读法', '读作', '中文读法', '数字转中文', '小写', '一千二百三十四', 'number to chinese'],
    category: 'text',
    icon: 'lucide:banknote'
  },
  {
    id: 'text-stats',
    name: '文本统计',
    description: '字符/词/句/段统计，区分码点与 UTF-8 字节，附中英占比与阅读时长',
    keywords: ['字数', '统计', '字符数', 'word count', '字数统计', '阅读时长', 'utf8', '词频', '文本分析'],
    category: 'text',
    icon: 'lucide:scan-text'
  },
  {
    id: 'caesar-cipher',
    name: '古典密码',
    description: '凯撒 / ROT13 / Atbash / 维吉尼亚 / Beaufort 加解密，附 26 位移暴力破解',
    keywords: ['caesar', 'rot13', 'vigenere', 'atbash', 'beaufort', '凯撒', '维吉尼亚', '移位', '密码', '解密', '古典密码'],
    category: 'encode',
    icon: 'lucide:lock-keyhole'
  },
  {
    id: 'chmod-calc',
    name: '文件权限计算',
    description: 'rwx ↔ 八进制互转、逐位勾选、符号模式 u+x,g-w 逐步推演',
    keywords: ['chmod', '权限', 'rwx', '755', '644', 'octal', 'setuid', 'setgid', 'sticky', 'linux', '文件权限'],
    category: 'network',
    icon: 'lucide:file-key-2'
  },
  {
    id: 'http-status',
    name: 'HTTP 状态码速查',
    description: '66 条状态码中英对照与出处，请求方法属性表、MIME 互查与 Content-Type 解析',
    keywords: ['http', '状态码', 'status code', '400', '401', '403', '404', '405', '408', '409', '413', '429', '500', '502', '503', '504', 'mime', 'content-type', '请求方法', '媒体类型', 'rfc'],
    category: 'network',
    icon: 'lucide:server'
  },
  {
    id: 'fullwidth',
    name: '全角半角转换',
    description: 'U+FF01–FF5E 与 U+0020–007E 双向映射，全角空格与中文标点一并处理',
    keywords: [
      'fullwidth', 'halfwidth', '全角', '半角', '转换', '全角空格', 'ＡＢＣ', '１２３',
      'U+3000', 'FF01', '中文标点', '乱码排查'
    ],
    category: 'text',
    icon: 'lucide:scaling'
  },
  {
    id: 'morse',
    name: '摩尔斯电码',
    description: '文本与国际码互转，词间「/」分隔，附点划计数与 PARIS 口径发报时长',
    keywords: ['morse', '摩尔斯', '电码', '无线电', 'sos', 'cq', 'paris', '点划', 'dots', 'dahs', 'wpm', '广播'],
    category: 'encode',
    icon: 'lucide:radio-tower'
  },
  {
    id: 'roman-numeral',
    name: '罗马数字转换',
    description: '1–3999 双向转换与按符号展开，拒绝 IIII、IL 这类非规范写法',
    keywords: [
      'roman', '罗马数字', '转换', '世纪', '减记法', 'MMXXVI', 'MCMXCIV', 'IV', 'XL', 'XC', 'CM',
      'IIII', '章节编号'
    ],
    category: 'math',
    icon: 'lucide:landmark'
  },
  {
    id: 'unicode-escape',
    name: 'Unicode 转义',
    description: '\\uXXXX 与 \\u{…} 双向转换，代理对拆分、\\xNN 还原并标出非法序列位置',
    keywords: [
      'unicode', '转义', 'escape', '\\u', '\\u0041', '代理对', 'surrogate', 'emoji', '𠮷',
      'utf16', '码点', '\\x41', '中文乱码'
    ],
    category: 'encode',
    icon: 'lucide:code'
  },
  {
    id: 'ascii-table',
    name: 'ASCII 码表',
    description: '0–127 逐位速查：中英文名称、控制字符用途与 13 种进制/语境写法',
    keywords: [
      'ascii', '码表', '字符集', '控制字符', '65', '0x41', 'U+0041', 'tab', 'lf', 'cr',
      'esc', 'del', 'nul', '换行', '回车', '退格', 'entity'
    ],
    category: 'encode',
    icon: 'lucide:table-2'
  },
  {
    id: 'line-tools',
    name: '行文本处理',
    description: '按行去重、删空行、裁剪空白、排序、加序号与随机打乱，一次一步、结果可回填',
    keywords: [
      'line', '行', '去重', '重复', '空行', '裁剪', 'trim', '排序', 'sort', '序号', '编号',
      '打乱', 'shuffle', '列表整理', 'uniq'
    ],
    category: 'text',
    icon: 'lucide:list-plus'
  },
  {
    id: 'find-replace',
    name: '查找替换',
    description: '字面量与正则两种模式，全字匹配对中文有效，逐条命中带行列号',
    keywords: [
      'find', 'replace', '查找', '替换', '正则', 'regex', '全字匹配', 'word', '捕获组',
      '$1', '批量修改', '删除文字'
    ],
    category: 'text',
    icon: 'lucide:replace'
  },
  {
    id: 'html-md',
    name: 'HTML ⇄ Markdown',
    description: '双向转换：粘贴网页正文转 Markdown，或把 Markdown 渲染成 HTML 片段',
    keywords: [
      'html', 'markdown', 'md', '转换', '互转', '富文本', '网页正文', 'turndown',
      'marked', 'gfm', '表格', '引用式链接'
    ],
    category: 'format',
    icon: 'lucide:file-code-2'
  },
  {
    id: 'md-table',
    name: 'Markdown 表格',
    description: 'Markdown ⇄ CSV/TSV/JSON 互转，按显示宽度对齐补空格，支持行列互换',
    keywords: [
      'markdown', 'table', '表格', 'csv', 'tsv', 'json', '互转', '对齐', '补齐',
      '列宽', '行列互换', 'transposed', '中文宽度'
    ],
    category: 'format',
    icon: 'lucide:columns-3'
  },
  {
    id: 'gradient',
    name: 'CSS 渐变生成器',
    description: '线性/径向/锥形渐变可视化编辑，输出 CSS 与底色回退，可等距取色成色板',
    keywords: [
      'gradient', '渐变', 'css', 'linear-gradient', 'radial-gradient', 'conic-gradient',
      '色标', 'stop', '取色', '色板', '背景', '配色'
    ],
    category: 'visual',
    icon: 'lucide:blend'
  },
  {
    id: 'yaml-json',
    name: 'YAML ⇄ JSON',
    description: 'YAML 转 JSON 与 JSON 转 YAML，报错带行列，并实测往返是否一致',
    keywords: [
      'yaml', 'yml', 'json', '互转', '格式化', 'k8s', 'docker-compose', '锚点',
      '合并键', '多文档', '往返', '缩进'
    ],
    category: 'format',
    icon: 'lucide:list-tree'
  },
  {
    id: 'xml-format',
    name: 'XML 格式化',
    description: 'XML 美化、压缩与结构校验，坏标签也能恢复，并可转 JSON',
    keywords: [
      'xml', '格式化', '美化', '压缩', 'minify', 'pretty', '校验', 'xsd', 'soap',
      '命名空间', 'cdata', '实体', '转 json'
    ],
    category: 'format',
    icon: 'lucide:tags'
  },
  {
    id: 'json-ts',
    name: 'JSON 转 TS 接口',
    description: '按 JSON 样本推导 TypeScript interface，缺键标可选、同形状复用名字',
    keywords: [
      'json', 'typescript', 'ts', 'interface', '类型', '推导', '接口', '定义',
      'apidoc', 'ndjson', '元组', '字面量'
    ],
    category: 'format',
    icon: 'lucide:brackets'
  },
  {
    id: 'aes',
    name: 'AES 加解密',
    description: '口令派生密钥的 AES-256-GCM 本地加解密，载荷自带 salt 与 IV',
    keywords: [
      'aes', 'aes-256-gcm', 'pbkdf2', '加密', '解密', '口令', '对称加密', 'webcrypto',
      'salt', 'iv', 'gcm', '密码本'
    ],
    category: 'crypto',
    icon: 'lucide:lock'
  },
  {
    id: 'ip-base',
    name: 'IP 地址与进制',
    description: 'IPv4/IPv6 与十进制、十六进制、八进制写法互转，附带归属与格式速查',
    keywords: [
      'ip', 'ipv4', 'ipv6', '进制', '转换', 'inet_aton', '反向解析', 'in-addr.arpa',
      'ip6.arpa', '归类', '私有地址', '文档地址', '6to4'
    ],
    category: 'network',
    icon: 'lucide:route'
  },
  {
    id: 'bmi',
    name: 'BMI 计算器',
    description: '身高体重算 BMI，同时按 WHO 与中国标准分级并给正常体重区间',
    keywords: [
      'bmi', '身体质量指数', '体重', '身高', '肥胖', '超重', '减重', 'who', 'wst428',
      '18.5', '24', '28', '30', '磅', '英寸', 'ideal weight'
    ],
    category: 'health',
    icon: 'lucide:scale'
  },
  {
    id: 'bmr',
    name: '基础代谢与每日消耗',
    description: '四个公式对照算 BMR，再乘活动系数得 TDEE 并折算增减重摄入',
    keywords: [
      'bmr', 'rde', 'tdee', '基础代谢', '静息代谢', '每日消耗', '热量', 'kcal', '卡路里',
      'mifflin', 'st jeor', 'harris-benedict', 'katch', 'cunningham', '7700', '减脂', '增肌', '活动系数'
    ],
    category: 'health',
    icon: 'lucide:flame'
  },
  {
    id: 'body-fat',
    name: '体脂率估算',
    description: '由 BMI 与年龄估体脂率，换算脂肪量、去脂体重与目标体重，附腰围与腰高比',
    keywords: [
      '体脂', '体脂率', 'body fat', 'deurenberg', 'ace', '去脂体重', '瘦体重', 'lean mass',
      '腰围', '腰臀比', '腰高比', 'whtr', 'whr', '内脏脂肪', '必需脂肪'
    ],
    category: 'health',
    icon: 'lucide:ruler'
  },
  {
    id: 'water-intake',
    name: '每日饮水量计算',
    description: '按体重、运动、环境、妊娠哺乳与发热算每天该喝多少水，并扣掉食物供水',
    keywords: [
      '饮水', '喝水', '水量', '水', 'water', 'hydration', '35ml', '2000ml', '3.7l', 'iom',
      '运动补液', '发热', '妊娠', '哺乳', '尿色', '低钠血症', '杯'
    ],
    category: 'health',
    icon: 'lucide:glass-water'
  },
  {
    id: 'target-heart-rate',
    name: '靶心率区间',
    description: '按年龄与静息心率算最大心率，%HRmax 与 Karvonen 两种区间并排给出',
    keywords: [
      '心率', '靶心率', '最大心率', 'karvonen', '储备心率', 'hrr', 'zone', 'z1 z2 z3 z4 z5',
      '220-年龄', 'tanaka', '静息心率', '有氧', '间歇', 'rpe', '208', '燃脂区'
    ],
    category: 'health',
    icon: 'lucide:heart-pulse'
  },
  {
    id: 'mortgage',
    name: '房贷计算器',
    description: '等额本息与等额本金并排算，给年度还款汇总、逐月计划与 CSV 导出',
    keywords: [
      '房贷', '月供', '贷款', '等额本息', '等额本金', '还款计划', '总利息', '年利率',
      'LPR', '4.9', '3.1', '2.85', '30 年', '公积金贷', 'amortization', '存量房贷'
    ],
    category: 'finance',
    icon: 'lucide:house'
  },
  {
    id: 'car-loan',
    name: '车贷计算器',
    description: '首付比例与落地价估算，把 4S 店的「月费率」反解成真实年化',
    keywords: [
      '车贷', '购车', '首付', '月供', '落地价', '购置税', '上牌', '保险',
      '等本等息', '手续费', '费率', '贴息', '真实年化', 'APR', 'IRR', '0.25%'
    ],
    category: 'finance',
    icon: 'lucide:car-front'
  },
  {
    id: 'investment',
    name: '投资收益与复利',
    description: '本金加定投按月复利推演，附通胀折现、翻倍年数与达标时间反推',
    keywords: [
      '复利', '定投', '年化收益率', '终值', '投资收益', '理财', '72 法则', '翻倍',
      '通胀', '购买力', '目标金额', 'compound', '按月复利', '基金'
    ],
    category: 'finance',
    icon: 'lucide:trending-up'
  },
  {
    id: 'social-insurance',
    name: '五险一金计算器',
    description: '按缴费基数算个人与单位各项缴纳额，附公积金入账与到手对比',
    keywords: [
      '五险一金', '社保', '公积金', '养老保险', '医疗保险', '失业保险', '工伤保险', '生育保险',
      '缴费基数', '个人比例', '单位比例', '到手工资', '8%', '12%', '16%', '人力成本'
    ],
    category: 'finance',
    icon: 'lucide:shield-check'
  },
  {
    id: 'currency-convert',
    name: '货币换算',
    description: '离线可编辑汇率表做币种互算，交叉汇率由对 CNY 比值算出并标注更新时间',
    keywords: [
      '汇率', '货币', '换算', '美元', '欧元', '日元', '英镑', '港币', '韩元', '澳元', '泰铢',
      'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'currency', '结售汇', '中间价'
    ],
    category: 'finance',
    icon: 'lucide:circle-dollar-sign'
  },
  {
    id: 'disk-partition',
    name: '硬盘容量与分区',
    description: '标称 GB 与实际 GiB 的差额算法，按占比出整数分区表与 4K 对齐的起止位置',
    keywords: [
      '硬盘', '分区', '容量', 'SSD', '固态', 'GiB', 'TiB', '1TB 实际', '931',
      '4K 对齐', 'MBR', 'GPT', 'NTFS', 'ext4', 'APFS', 'diskpart'
    ],
    category: 'network',
    icon: 'lucide:hard-drive'
  },
  {
    id: 'age-calc',
    name: '年龄计算器',
    description: '精确到「岁 / 个月 / 天」，附总天数周数、下次生日倒计时与万天里程碑',
    keywords: [
      '年龄', '周岁', '虚岁', '生日', '倒计时', '下次生日', '万天', '出生', '几个月', '多少天',
      'birthday', 'age', '满月', '百天'
    ],
    category: 'life',
    icon: 'lucide:cake-slice'
  },
  {
    id: 'id-card',
    name: '身份证信息解析',
    description: '校验位核验、出生/性别/年龄推算、省级归属地，15 位可升 18 位，全程不联网',
    keywords: [
      '身份证', '身份证号', '校验位', '验证', '归属地', '区划代码', '18 位', '15 位', '升位',
      '出生日期', '性别', '周岁', 'X', 'GB 11643', 'MOD 11-2'
    ],
    category: 'life',
    icon: 'lucide:id-card'
  },
  {
    id: 'zodiac',
    name: '生肖星座查询',
    description: '按干支纪年推生肖与本命年，按出生日期定星座，附十二地支时辰与星座区间速查',
    keywords: [
      '生肖', '属相', '本命年', '干支', '甲子', '丙午', '天干地支', '五行',
      '星座', '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
      '什么座', '属什么'
    ],
    category: 'life',
    icon: 'lucide:moon-star'
  },
  {
    id: 'kinship',
    name: '亲戚称谓推算',
    description: '输入「爸爸的哥哥的儿子」得出堂兄弟，并反向给出对方怎么称呼你',
    keywords: [
      '亲戚', '称谓', '称呼', '辈分', '怎么叫', '堂哥', '表哥', '堂弟', '表弟', '侄子', '外甥', '姑姑', '舅舅', '阿姨', '伯伯', '叔叔',
      '爷爷', '奶奶', '外公', '外婆', '曾孙', '侄孙', '儿媳', '女婿', '公公', '婆婆', '岳父', '岳母', '妯娌', '连襟', '姑父', '舅妈'
    ],
    category: 'life',
    icon: 'lucide:network'
  },
  {
    id: 'random-pick',
    name: '随机数与抽签',
    description: '区间取数、不重复抽人、名单洗牌、掷骰抛硬币，可切固定种子复现结果',
    keywords: [
      '随机数', '抽签', '抽奖', '名单', '洗牌', '顺序', '骰子', '硬币', '正反面', '随机排序',
      '不重复', '随机抽取', 'random', 'dice', 'coin', 'crypto', '种子', '复现'
    ],
    category: 'life',
    icon: 'lucide:dices'
  },
  {
    id: 'percent',
    name: '百分比计算',
    description: '求占比、求一个数的百分之几、求变化率与反推原数，四种问法都给算式',
    keywords: [
      '百分比', '百分号', '占比', '概率', '百分率', '折扣', '涨幅', '跌幅', '同比', '环比',
      '百分之几', '变化率', '反推', '增值税', 'percent', '%', '15% 的 200'
    ],
    category: 'life',
    icon: 'lucide:percent'
  },
  {
    id: 'chinese-variant',
    name: '繁简转换',
    description: '字级＋词级双向转换，台式／港式用字分列，一字多形逐处可切换',
    keywords: [
      '繁简', '简体', '繁体', '简转繁', '繁转简', '汉字转换', 'opencc', '一字多形', '台式', '港式',
      '發', '後', '麵', '幹', '裡', '台', 's2t', 't2s', '繁体中文', '简体字', '繁简对照'
    ],
    category: 'text',
    icon: 'lucide:languages'
  }
]

export const categoryLabel = (id: CategoryId): string =>
  toolCategories.find((category) => category.id === id)?.label ?? id

/** 用于校验 URL query 里的 `?category=` 取值 */
export const isCategoryId = (value: unknown): value is CategoryId =>
  typeof value === 'string' && toolCategories.some((category) => category.id === value)

export const findTool = (id: string): ToolDefinition | undefined =>
  tools.find((tool) => tool.id === id)

export const toolsOfCategory = (id: CategoryId): ToolDefinition[] =>
  tools.filter((tool) => tool.category === id)

/** `json-format` → `JsonFormat`，用于定位 pages/tools 下的页面文件 */
export const pageNameOf = (id: string): string =>
  id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')

/** 运行时（router afterEach）与构建期（静态壳）共用，避免两种来源的标题/描述漂移 */
export const pageTitle = (tool: ToolDefinition): string => `${tool.name} · ToolBox`

export const pageDescription = (tool: ToolDefinition): string =>
  `${tool.name}：${tool.description}。纯前端实现，输入内容不会离开浏览器。`

/** 所有图标名，交给 vite 的 icon.clientBundle.icons 做构建期内联 */
export const registryIcons: string[] = [
  ...tools.map((tool) => tool.icon),
  ...toolCategories.map((category) => category.icon)
]
