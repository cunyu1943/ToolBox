import type { ToolMeta } from '~/types'

/**
 * 工具统一注册表。
 * 新增一个工具 = 在此数组追加一项 + 新建对应 pages/tool/*.vue 页面。
 * 首页卡片、搜索、分类筛选全部由此驱动，无需改动核心逻辑。
 */
export const tools: ToolMeta[] = [
  {
    key: 'basic',
    name: '标准计算器',
    desc: '四则运算，支持键盘输入与精度处理',
    icon: 'mdi:calculator',
    route: '/tool/basic',
    category: '数学',
    keywords: ['计算', '加减乘除', '四则', 'calculator', '基础']
  },
  {
    key: 'mortgage',
    name: '房贷计算器',
    desc: '等额本息 / 等额本金对比，生成还款计划表',
    icon: 'mdi:home-city',
    route: '/tool/mortgage',
    category: '金融',
    keywords: ['房贷', '月供', '贷款', '利息', '公积金', 'mortgage']
  },
  {
    key: 'car-loan',
    name: '车贷计算器',
    desc: '首付比例滑杆联动，月供与落地价估算',
    icon: 'mdi:car',
    route: '/tool/car-loan',
    category: '金融',
    keywords: ['车贷', '汽车', '首付', '月供', 'loan']
  },
  {
    key: 'kinship',
    name: '亲戚称谓计算器',
    desc: '输入关系链推导标准称谓，支持反向查询',
    icon: 'mdi:account-group',
    route: '/tool/kinship',
    category: '生活',
    keywords: ['亲戚', '称谓', '辈分', '称呼', '关系', 'kinship']
  },
  {
    key: 'weight',
    name: '质量换算',
    desc: '毫克 / 克 / 千克 / 吨 / 斤 / 两 / 磅 / 盎司实时联动',
    icon: 'mdi:weight',
    route: '/tool/weight',
    category: '单位换算',
    keywords: ['质量', '重量', '换算', '公斤', '斤', '磅', 'weight']
  },
  {
    key: 'volume',
    name: '容量换算',
    desc: '毫升 / 升 / 立方米 / 加仑 / 杯 / 勺实时联动',
    icon: 'mdi:cup-water',
    route: '/tool/volume',
    category: '单位换算',
    keywords: ['容量', '体积', '换算', '升', '加仑', '杯', 'volume']
  },
  {
    key: 'bmi',
    name: 'BMI 计算器',
    desc: '身高体重求 BMI，分级可视化与健康区间建议',
    icon: 'mdi:human-male-height',
    route: '/tool/bmi',
    category: '健康',
    keywords: ['BMI', '体脂', '身高', '体重', '健康', '肥胖']
  },
  {
    key: 'programmer',
    name: '程序员计算器',
    desc: '进制转换、位运算、字长切换、ASCII 与字节换算',
    icon: 'mdi:console',
    route: '/tool/programmer',
    category: '开发',
    keywords: ['进制', '二进制', '十六进制', '位运算', 'ASCII', 'programmer']
  },
  {
    key: 'currency',
    name: '货币换算',
    desc: '内置可编辑汇率表，离线可用，标注更新时间',
    icon: 'mdi:currency-usd',
    route: '/tool/currency',
    category: '金融',
    keywords: ['货币', '汇率', '换算', '美元', '人民币', 'currency']
  },
  {
    key: 'length',
    name: '长度换算',
    desc: '毫米 / 米 / 千米 / 英尺 / 英寸 / 市尺等实时联动',
    icon: 'mdi:ruler',
    route: '/tool/length',
    category: '数据',
    keywords: ['长度', '距离', '换算', '米', '英尺', '英寸', 'length']
  },
  {
    key: 'temperature',
    name: '温度换算',
    desc: '摄氏 / 华氏 / 开尔文三温标互转，支持负温度',
    icon: 'mdi:thermometer',
    route: '/tool/temperature',
    category: '数据',
    keywords: ['温度', '摄氏', '华氏', '开尔文', '换算', 'temperature']
  },
  {
    key: 'timestamp',
    name: '时间戳转换',
    desc: '实时时间戳（可暂停/切换单位），带时区的单个与批量互转',
    icon: 'mdi:clock-time-four-outline',
    route: '/tool/timestamp',
    category: '数据',
    keywords: ['时间戳', 'unix', 'epoch', '毫秒', '转换', 'timestamp']
  },
  {
    key: 'date-calc',
    name: '日期计算',
    desc: '两日期相差天数与年月日、某日期加减天数',
    icon: 'mdi:calendar-multiple',
    route: '/tool/date-calc',
    category: '数据',
    keywords: ['日期', '天数', '相差', '加减', '星期', 'date']
  },
  {
    key: 'number-words',
    name: '数字大小写',
    desc: '阿拉伯数字转中文财务大写金额与中文读法',
    icon: 'mdi:format-text',
    route: '/tool/number-words',
    category: '数据',
    keywords: ['大写', '金额', '中文', '财务', '转换', '人民币大写']
  },
  {
    key: 'disk-partition',
    name: '硬盘分区',
    desc: '按用途方案把硬盘容量拆成各分区建议大小',
    icon: 'mdi:harddisk',
    route: '/tool/disk-partition',
    category: '数据',
    keywords: ['硬盘', '分区', 'SSD', '容量', 'C盘', 'partition']
  },
  {
    key: 'investment',
    name: '投资收益计算',
    desc: '本金 + 定投按月复利，估算期末资产与总收益',
    icon: 'mdi:chart-line',
    route: '/tool/investment',
    category: '数据',
    keywords: ['投资', '收益', '复利', '定投', '理财', '收益率']
  },
  {
    key: 'social-insurance',
    name: '五险一金计算',
    desc: '按缴费基数估算个人/单位缴纳明细与到手',
    icon: 'mdi:account-heart-outline',
    route: '/tool/social-insurance',
    category: '数据',
    keywords: ['五险一金', '社保', '公积金', '养老', '医保', '缴纳']
  },
  {
    key: 'encoding',
    name: '编码转换',
    desc: 'Base64 / Base32 / URL / HTML 实体 / Unicode 转义的编码与解码',
    icon: 'mdi:code-tags',
    route: '/tool/encoding',
    category: '编码',
    keywords: ['base64', 'base32', 'url', '编码', '解码', 'html', '实体', 'unicode', '转义', 'encoding']
  },
  {
    key: 'hash',
    name: '哈希摘要',
    desc: 'MD5 / SHA-1 / 256 / 384 / 512 文本摘要，浏览器本地计算',
    icon: 'mdi:shield-lock-outline',
    route: '/tool/hash',
    category: '编码',
    keywords: ['hash', 'sha', 'md5', '摘要', '加密', '哈希', 'digest', '校验']
  },
  {
    key: 'json',
    name: 'JSON 格式化',
    desc: 'JSON 美化、压缩与语法校验，附错误行列定位',
    icon: 'mdi:code-json',
    route: '/tool/json',
    category: '开发',
    keywords: ['json', '格式化', '美化', '压缩', '校验', 'validate', 'formatter']
  },
  {
    key: 'csv',
    name: 'CSV 转 JSON',
    desc: 'CSV 与 JSON 互转，支持引号、自定义分隔符与表头开关',
    icon: 'mdi:table-large',
    route: '/tool/csv',
    category: '开发',
    keywords: ['csv', 'json', '转换', '表格', '分隔符', '表头']
  },
  {
    key: 'jwt',
    name: 'JWT 解析',
    desc: '本地解码 JWT 的 Header 与 Payload，展示 exp/iat 时间',
    icon: 'mdi:key-variant',
    route: '/tool/jwt',
    category: '开发',
    keywords: ['jwt', 'token', '解码', 'base64url', 'authorization', '解析']
  },
  {
    key: 'uuid',
    name: 'UUID 生成',
    desc: '批量生成 v4 UUID，可切换大写、连字符与花括号',
    icon: 'mdi:fingerprint',
    route: '/tool/uuid',
    category: '开发',
    keywords: ['uuid', 'guid', '随机', '唯一标识', 'v4', '生成']
  },
  {
    key: 'text',
    name: '文本处理',
    desc: '大小写转换、去重排序去空行，附字符/词/行/字节统计',
    icon: 'mdi:format-text-variant',
    route: '/tool/text',
    category: '文本',
    keywords: ['文本', '大小写', '去重', '排序', '空行', '字数', '统计', 'text']
  },
  {
    key: 'naming',
    name: '命名风格转换',
    desc: 'camelCase / snake_case / kebab-case / CONSTANT 互转',
    icon: 'mdi:alpha-c-box-outline',
    route: '/tool/naming',
    category: '文本',
    keywords: ['命名', '驼峰', 'camel', 'snake', 'kebab', '常量', '大小写', '变量名']
  },
  {
    key: 'regex',
    name: '正则测试',
    desc: '实时匹配测试，展示命中位置、内容与捕获组',
    icon: 'mdi:regex',
    route: '/tool/regex',
    category: '文本',
    keywords: ['正则', 'regex', '匹配', '捕获组', '表达式', '校验', '替换']
  },
  {
    key: 'color',
    name: '颜色转换',
    desc: 'HEX / RGB / HSL 互转，取色器与前景可读色',
    icon: 'mdi:palette',
    route: '/tool/color',
    category: '颜色',
    keywords: ['颜色', 'hex', 'rgb', 'hsl', '取色', '色值', 'palette', 'color']
  },
  {
    key: 'gradient',
    name: 'CSS 渐变生成',
    desc: '多角度多色标的 linear-gradient 可视化生成',
    icon: 'mdi:gradient-vertical',
    route: '/tool/gradient',
    category: '颜色',
    keywords: ['渐变', 'gradient', 'css', 'linear-gradient', '色标', '背景']
  },
  {
    key: 'password',
    name: '随机密码',
    desc: '自定义长度与字符集，保证各类字符并排除易混淆',
    icon: 'mdi:form-textbox-password',
    route: '/tool/password',
    category: '开发',
    keywords: ['密码', '随机', 'password', '强密码', '生成', 'token', '密钥']
  },
  {
    key: 'password-strength',
    name: '密码强度检查',
    desc: '本地实时评估：熵估算、字符集、弱口令/连续/重复模式扣分',
    icon: 'mdi:shield-lock-outline',
    route: '/tool/password-strength',
    category: '开发',
    keywords: ['密码', '强度', '安全检查', 'password', '熵', '弱口令']
  },
  {
    key: 'ip',
    name: 'IP 地址转换',
    desc: 'IPv4 点分十进制 ⇄ 整数 ⇄ 十六进制 ⇄ 二进制',
    icon: 'mdi:ip-network',
    route: '/tool/ip',
    category: '开发',
    keywords: ['ip', 'ipv4', '子网', '进制', '网络', '地址', 'binary', 'hex']
  },
  {
    key: 'fullwidth',
    name: '全角半角转换',
    desc: 'ASCII 与全角字符双向转换，保留中文不变',
    icon: 'mdi:alphabetical-variant',
    route: '/tool/fullwidth',
    category: '文本',
    keywords: ['全角', '半角', '转换', '空格', 'ascii', 'fullwidth']
  },
  {
    key: 'morse',
    name: '摩尔斯电码',
    desc: '文本与国际摩尔斯电码互转，词以「/」分隔',
    icon: 'mdi:waveform',
    route: '/tool/morse',
    category: '编码',
    keywords: ['摩尔斯', 'morse', '电码', '无线电', '编码', '解码']
  },
  {
    key: 'url',
    name: 'URL 解析构建',
    desc: '拆解协议/主机/路径/参数/片段，编辑后重建链接',
    icon: 'mdi:link-variant',
    route: '/tool/url',
    category: '开发',
    keywords: ['url', '链接', '解析', 'query', '查询参数', '构建']
  },
  {
    key: 'roman',
    name: '罗马数字转换',
    desc: '1~3999 与罗马数字双向转换，拒绝非规范写法',
    icon: 'mdi:roman-numerals',
    route: '/tool/roman',
    category: '数学',
    keywords: ['罗马数字', 'roman', '转换', 'MCMXCIV', '世纪']
  },
  {
    key: 'cron',
    name: 'Cron 表达式解析',
    desc: '5 字段 Cron 校验、中文说明与后 5 次执行时间推算',
    icon: 'mdi:calendar-clock',
    route: '/tool/cron',
    category: '开发',
    keywords: ['cron', '定时任务', 'crontab', '表达式', '调度', '计划任务']
  },
  {
    key: 'diff',
    name: '文本差异对比',
    desc: '按行对比两段文本，标注增删与行号，可复制统一格式',
    icon: 'mdi:file-compare',
    route: '/tool/diff',
    category: '文本',
    keywords: ['diff', '对比', '差异', '比较', '行', '文本', 'unified']
  },
  {
    key: 'html-md',
    name: 'HTML ⇄ Markdown',
    desc: '常用标签子集双向转换，支持标题/列表/引用/代码块',
    icon: 'mdi:language-markdown-outline',
    route: '/tool/html-md',
    category: '文本',
    keywords: ['html', 'markdown', 'md', '转换', '标签', '富文本']
  },
  {
    key: 'subnet',
    name: '子网划分计算',
    desc: 'CIDR / 掩码求网络地址、广播地址与可用主机区间',
    icon: 'mdi:subnet',
    route: '/tool/subnet',
    category: '开发',
    keywords: ['子网', 'cidr', '掩码', '网段', '广播', 'subnet', '网络']
  },
  {
    key: 'contrast',
    name: '颜色对比度检查',
    desc: 'WCAG 2.1 相对亮度与对比度，AA/AAA 达标判定',
    icon: 'mdi:contrast-circle',
    route: '/tool/contrast',
    category: '颜色',
    keywords: ['对比度', 'wcag', '无障碍', 'accessibility', '前景', '背景', 'contrast']
  },
  {
    key: 'qrcode',
    name: '二维码生成',
    desc: '文本/链接生成二维码 SVG，可调纠错等级与颜色并导出 PNG',
    icon: 'mdi:qrcode',
    route: '/tool/qrcode',
    category: '开发',
    keywords: ['二维码', 'qr', 'qrcode', '扫码', 'svg', 'png', '链接']
  },
  {
    key: 'yaml',
    name: 'YAML ⇄ JSON',
    desc: 'js-yaml 严格解析互转，语法错误附行列定位',
    icon: 'mdi:file-tree',
    route: '/tool/yaml',
    category: '开发',
    keywords: ['yaml', 'json', '互转', '解析', '格式化', '配置']
  },
  {
    key: 'chinese',
    name: '繁简转换',
    desc: 'OpenCC 词级双向转换，支持台/港繁体变体',
    icon: 'mdi:language-chinese',
    route: '/tool/chinese',
    category: '文本',
    keywords: ['繁体', '简体', '繁简', 'opencc', '转换', '中文', 'tw', 'hk']
  },
  {
    key: 'xml',
    name: 'XML 格式化',
    desc: 'XML 美化与压缩，标签配对校验并定位错误',
    icon: 'mdi:xml',
    route: '/tool/xml',
    category: '开发',
    keywords: ['xml', '格式化', '美化', '压缩', '标签', '校验']
  },
  {
    key: 'storage',
    name: '存储单位换算',
    desc: 'bit/B 到 PB 与 KiB~TiB，十进制 SI 与二进制 IEC 双体系',
    icon: 'mdi:content-save-settings-outline',
    route: '/tool/storage',
    category: '单位换算',
    keywords: ['存储', '字节', 'kb', 'mb', 'gib', 'ti', '容量', '单位']
  },
  {
    key: 'time-units',
    name: '时间单位换算',
    desc: '纳秒到年月日实时联动，月按 30 天、年按 365 天近似',
    icon: 'mdi:clock-outline',
    route: '/tool/time-units',
    category: '单位换算',
    keywords: ['时间', '秒', '毫秒', '小时', '分钟', '单位', '换算']
  },
  {
    key: 'aes',
    name: 'AES 加解密',
    desc: 'AES-256-GCM 口令加密，PBKDF2 派生密钥，浏览器本地完成',
    icon: 'mdi:table-key',
    route: '/tool/aes',
    category: '编码',
    keywords: ['aes', 'gcm', '加密', '解密', '口令', 'pbkdf2', '对称']
  },
  {
    key: 'unicode',
    name: 'Unicode 转义',
    desc: '中文与 \\uXXXX 转义串双向转换，emoji 代理对自动配对',
    icon: 'mdi:code-braces-box',
    route: '/tool/unicode',
    category: '编码',
    keywords: ['unicode', '转义', '\\u', 'escape', '字符编码', '中文']
  },
  {
    key: 'lines',
    name: '行文本处理',
    desc: '去重、去空行、排序、反转、加序号、随机打乱，按行批量操作',
    icon: 'mdi:format-list-bulleted-type',
    route: '/tool/lines',
    category: '文本',
    keywords: ['去重', '排序', '空行', '序号', '打乱', '行', '列表']
  },
  {
    key: 'age',
    name: '年龄计算器',
    desc: '精确到年/月/日，共度过天数与下次生日倒计时',
    icon: 'mdi:cake-variant',
    route: '/tool/age',
    category: '生活',
    keywords: ['年龄', '生日', '周岁', '天数', '倒计时', '出生']
  },
  {
    key: 'http-status',
    name: 'HTTP 状态码',
    desc: '1xx~5xx 常见状态码速查，中英文说明与大类过滤',
    icon: 'mdi:server-network',
    route: '/tool/http-status',
    category: '开发',
    keywords: ['http', '状态码', '404', '500', 'status', '错误码', 'rfc']
  },
  {
    key: 'random',
    name: '随机数/抽签',
    desc: '区间随机整数、不重复抽签、掷骰抛硬币，本地生成',
    icon: 'mdi:dice-multiple',
    route: '/tool/random',
    category: '数学',
    keywords: ['随机', '抽签', '骰子', '硬币', '抽奖', 'random', '取样']
  },
  {
    key: 'image-base64',
    name: '图片 Base64',
    desc: '本地图片转 dataURL、Base64 还原图片预览，不经服务器',
    icon: 'mdi:image-sync',
    route: '/tool/image-base64',
    category: '编码',
    keywords: ['图片', 'base64', 'dataurl', 'data uri', '编码', '嵌入']
  },
  {
    key: 'zodiac',
    name: '生肖星座',
    desc: '年份查生肖、月日查星座（含边界日期与四元素）',
    icon: 'mdi:zodiac-aquarius',
    route: '/tool/zodiac',
    category: '生活',
    keywords: ['生肖', '属相', '星座', '十二宫', 'birthday', '占星']
  },
  {
    key: 'ascii',
    name: 'ASCII 码表',
    desc: '0–127 码位速查，控制字符名与中英文说明、多格式详情',
    icon: 'mdi:table-large',
    route: '/tool/ascii',
    category: '开发',
    keywords: ['ascii', '码表', '控制字符', 'unicode', '十六进制', '实体']
  },
  {
    key: 'json-ts',
    name: 'JSON 转 TypeScript 接口',
    desc: '粘贴 JSON 自动生成 interface，数组样本归并、缺席键可选',
    icon: 'mdi:language-typescript',
    route: '/tool/json-ts',
    category: '开发',
    keywords: ['json', 'typescript', 'ts', '接口', 'interface', '类型', '生成']
  },
  {
    key: 'percent',
    name: '百分比计算器',
    desc: '求百分比、一个数是另一个数的百分之几、增减幅',
    icon: 'mdi:percent',
    route: '/tool/percent',
    category: '数学',
    keywords: ['百分比', '百分率', '增幅', '降幅', 'percent', '折扣']
  },
  {
    key: 'md-table',
    name: 'Markdown 表格生成',
    desc: 'Tab/CSV/空格分隔文本转 Markdown 表格，逐列对齐与源码补白',
    icon: 'mdi:table-plus',
    route: '/tool/md-table',
    category: '文本',
    keywords: ['markdown', '表格', 'md', 'table', 'csv', 'tab']
  }
]

/** 全部可选分类（用于首页筛选标签） */
export const categories: ToolMeta['category'][] = [
  '数据',
  '编码',
  '文本',
  '颜色',
  '金融',
  '数学',
  '生活',
  '单位换算',
  '健康',
  '开发'
]
