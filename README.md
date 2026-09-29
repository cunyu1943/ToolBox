# ToolBox · 纯前端在线工具箱

聚合常用小工具的纯静态站点：**63 个工具 / 11 个分类**，一个工具一个页面，打开即用。
所有计算与转换都在浏览器本地完成，**不请求任何后端接口、没有埋点、没有第三方脚本**，偏好与输入只写 `localStorage`。

- 线上地址：<https://cunyu1943.site/ToolBox/>
- 源码仓库：<https://github.com/cunyu1943/ToolBox>

## 目录

- [一、特性](#一特性)
- [二、快速开始](#二快速开始)
- [三、技术栈](#三技术栈)
- [四、目录结构](#四目录结构)
- [五、工具清单](#五工具清单)
- [六、开发指南](#六开发指南)
- [七、构建与部署](#七构建与部署)
- [八、体积预算](#八体积预算)
- [九、维护约定（踩坑沉淀）](#九维护约定踩坑沉淀)
- [十、License 与第三方出处](#十license-与第三方出处)

## 一、特性

### 站点级（所有页面共用）

- **深链可分享**：路由是 `/tools/<id>`，构建期为每页生成 `dist/tools/<id>/index.html` 静态壳并逐页改写
  `<title>` / `description` / `og:*`，因此 GitHub Pages、OSS、Nginx 这类纯静态主机直接就能访问深链，不需要 rewrite 规则。
- **搜索一处写、三处用**：顶栏入口、首页搜索框、`Cmd`/`Ctrl`+`K` 命令面板共用同一份打分函数
  （名称 / `id` / 关键词 / 描述 / 分类 / 图标都参与，多词按空格切分、AND 语义）。
- **分类深链**：`/?category=crypto` 直接落到某一类；芯片、抽屉、卡片计数全部由注册表派生，不重复维护。
- **明暗三态**：跟随系统 / 亮 / 暗，选择持久化；`index.html` 里的前置脚本在首帧之前上色，不闪白。
- **外观**：品牌绿 `#42b883`（暗色 `#42d392`）+ 全站毛玻璃 + 8px 细滚动条 + 卡片等高 + 返回顶部浮动按钮；
  375 / 768 / 1440 三档实测零水平溢出。
- **离线可用**：lucide 图标字形在构建期内联进产物，运行时不请求 Iconify API。
- **可配置的站点外壳**：站名、页脚文案、页脚自定义 HTML、仓库地址、年份都集中在 `src/site.config.ts`。
- **推送即发布**：`main` 有 push → CI 构建 → 校验产物 → 发到 `gh-pages`。

### 工具级（11 个分类 / 63 个工具）

分类与数量由 `src/tools/registry.ts` 的 `category` 逐条数出，与首页芯片读数一致；逐工具说明见[工具清单](#五工具清单)。

| 分类 | 数量 | 工具 |
| --- | --- | --- |
| 编码转换 | 9 | Base64 编解码、URL 编解码与解析、图片转 Base64、JWT 解析、HTML 实体编解码、古典密码、摩尔斯电码、Unicode 转义、ASCII 码表 |
| 格式化 | 8 | JSON 格式化、文本对比、CSV ↔ JSON、HTML ⇄ Markdown、Markdown 表格、YAML ⇄ JSON、XML 格式化、JSON → TS 接口 |
| 文本处理 | 8 | 正则测试、命名风格转换、人民币大写转换、文本统计、全角半角转换、行文本处理、查找替换、繁简转换 |
| 哈希与生成 | 5 | 哈希计算、UUID 生成器、随机密码生成、密码强度评估、AES 加解密 |
| 数学与换算 | 5 | 表达式计算器、单位换算（8 组 65 个单位）、进制转换、浮点数位布局、罗马数字转换 |
| 时间日期 | 3 | 时间戳转换、日期计算器、crontab 解析 |
| 颜色与图像 | 4 | 颜色转换器、对比度检查、二维码生成、CSS 渐变生成器 |
| 网络与运维 | 5 | 子网计算器、文件权限计算、HTTP 状态码速查、IP 地址与进制、硬盘容量与分区 |
| 健康与体能 | 5 | BMI 计算器、基础代谢与每日消耗、体脂率估算、每日饮水量计算、靶心率区间 |
| 金融与理财 | 5 | 房贷计算器、车贷计算器、投资收益与复利、五险一金计算器、货币换算 |
| 生活常用 | 6 | 年龄计算器、身份证信息解析、生肖星座查询、亲戚称谓推算、随机数与抽签、百分比计算 |

### 明确不做

无后端、无数据库、无账号与云同步，不做任何服务端计算或数据采集。**所有计算都在浏览器本地完成，这是它唯一的卖点。**

> **已知遗留项**：旧站的深链是 `/ToolBox/tool/<id>`（单数），本站是 `/ToolBox/tools/<id>`，所以旧链接会落到 SPA 兜底 404 页
> （`NotFoundPage.vue`，不是白屏、也不是硬 404）。要平滑过渡需在发布分支额外生成一张 `tool/ → tools/` 重定向表（63 个 meta-refresh 壳）。
> 另外旧站 67 页与本站 63 页不是一一对应：八个单位换算页并成 `unit-convert`，`encoding` / `programmer` 拆成 `number-base` / `base64` / `html-entity`，
> `text` 分给 `line-tools` / `case-convert` / `text-stats`，`number-words` 并入 `rmb-uppercase`；本站反向多出 `float-bits` / `caesar-cipher` / `chmod-calc`。
> 映射关系要比对注册表与页面文件，别按 id 直映。

## 二、快速开始

运行环境只需要 Node 与 pnpm（`packageManager` 已锁定，**禁用 npm / yarn**）：

```bash
pnpm install     # 首次安装依赖
pnpm dev         # 开发服务器 http://localhost:5173
pnpm typecheck   # vue-tsc 类型检查
pnpm build       # 类型检查 + 产物输出到 dist/（已含深链静态壳与 404.html）
pnpm preview     # 本地预览构建产物（默认 4173）
```

端口在 `vite.config.ts` 里以 `strictPort` 固定为 5173，避免与同工作区其他项目串台。

两条运行时依赖决定了**必须走安全上下文**：`crypto.subtle`（哈希、AES 两页）与 `navigator.clipboard`（各页复制按钮）只在
`http://localhost` 或 HTTPS 下可用。不可用时复制会退回 `execCommand` 并提示「请手动复制」，不会静默失败。

## 三、技术栈

| 能力 | 选型 | 版本 |
| --- | --- | --- |
| 框架 | Vue 3（`<script setup>` + TypeScript） | `vue ^3.5.42` |
| 构建 | Vite | `vite ^8.3.0` |
| 路由 | Vue Router（`createWebHistory`，懒加载工具页） | `vue-router ^5.3.1` |
| UI 组件 | Nuxt UI v4（Vue 模式，非 Nuxt 项目） | `@nuxt/ui ^4.11.1` |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`，CSS-first 主题） | `tailwindcss ^4.3.3` |
| 图标 | Iconify，写作 `<UIcon name="lucide:xxx" />`，构建期内联 | `@iconify-json/lucide ^1.2.135` |
| 二维码编码 | 功能型第三方依赖，只在二维码页按需加载 | `qrcode ^1.5.4` |
| YAML 编解码 | 功能型第三方依赖，只在 YAML ⇄ JSON 页按需加载 | `js-yaml ^5.4.2` |
| 类型检查 | `pnpm build` = `vue-tsc -b && vite build`，类型不过就不出产物 | `typescript ~6.0.2`、`vue-tsc ^3.3.11` |
| 包管理 | pnpm | `pnpm 12.4.2` |

**功能型第三方依赖只有 `qrcode` 与 `js-yaml` 两个**，都只被各自那一页 `import`，因此进的是路由懒加载块、不进首屏。
其余工具一律基于浏览器与 JS 原生 API 自研（`TextEncoder`、`crypto.subtle`、`crypto.getRandomValues`、`crypto.randomUUID`、
`URL` / `URLSearchParams`、`Date.UTC`、`FileReader`、`DataView`、`BigInt`、`String.fromCodePoint`、`<canvas>`），零额外依赖。
几个刻意的取舍：AES 直接走 `crypto.subtle` 的 PBKDF2 + AES-256-GCM（不引 `crypto-js`）；XML 解析器与 JSON→TS 类型推断是手写内核；
繁简转换自研离线字表（`opencc-js` 压缩后 498 kB，超体积预算）。

`pnpm-lock.yaml` 是唯一的版本锁定来源，CI 用 `pnpm install --frozen-lockfile`。

## 四、目录结构

```
toolbox/
├─ index.html                 # 入口 HTML，<head> 内联前置主题脚本（首帧上色，防闪白）
├─ vite.config.ts             # vue + tailwindcss + @nuxt/ui/vite + staticHosting 四个插件、base、~ 别名
├─ pnpm-workspace.yaml        # nodeLinker: hoisted（Nuxt UI 子路径解析必需）
├─ LICENSE / NOTICE           # 标准 MIT 全文 / 第三方数据与字形出处声明
├─ public/                    # favicon.svg（由 lucide:toolbox 字形生成）、.nojekyll
├─ scripts/                   # 构建期代码生成器（不参与 pnpm build）：繁简字表的唯一来源
├─ types/                     # 插件生成的自动导入 / 组件类型声明
└─ src/
   ├─ main.ts                 # createApp + vue-router + @nuxt/ui/vue-plugin
   ├─ App.vue                 # 三段式骨架：AppHeader → main(RouterView) → AppFooter，外加命令面板与返回顶部
   ├─ site.config.ts          # 站点级构建期配置（站名 / 页脚 / 仓库地址 / 年份），页脚组件唯一读取方
   ├─ assets/css/main.css     # 品牌色板 @theme static、--ui-* 语义 token、毛玻璃 @utility、细滚动条、卡片滚动动画、@source not 排除
   ├─ composables/
   │  ├─ useTheme.ts          # 明暗三态，模块级单例，持久化 toolbox:theme
   │  ├─ useToolSearch.ts     # 搜索打分与排序（registry 的唯一消费入口）
   │  ├─ usePalette.ts        # 命令面板开关 / 查询词
   │  ├─ useHotkey.ts         # 作用域销毁自动解绑的快捷键（Cmd/Ctrl+K）
   │  ├─ useStored.ts         # ref ↔ localStorage（JSON 序列化 + deep watch，读写异常退化为内存值）
   │  └─ useCopy.ts           # 复制：clipboard 与超时竞速，失败回退 execCommand
   ├─ components/             # AppHeader / AppFooter / AppCommandPalette / ToolCard / BackToTop / ToolShell / CopyButton / AppThemeToggle
   ├─ pages/
   │  ├─ HomePage.vue         # hero + 搜索框 + 分类芯片 + 1/2/3/4 列卡片栅格
   │  ├─ NotFoundPage.vue     # 404
   │  └─ tools/<Name>Page.vue # 63 个工具页，文件名 = registry id 的 PascalCase + Page
   ├─ router/index.ts         # 由 registry 生成的路由表 + 每页 title/description + og 同步
   └─ tools/
      ├─ registry.ts          # 唯一事实来源：分类、工具元信息、id→页面名约定、图标清单
      └─ <tool-id>/index.ts   # 纯函数内核（无 Vue 依赖），页面只负责交互与展示
```

约定：**内核逻辑一律放 `src/tools/<id>/index.ts`，是可脱离 DOM 调用的纯函数**；工具页只做输入绑定、结果展示与本地持久化。
新增工具只需 ① 注册 ② 建内核 ③ 建页面，路由、搜索、卡片、抽屉、图标、深链壳全部自动跟上。

## 五、工具清单

逻辑在 `src/tools/<id>/index.ts`，页面在 `src/pages/tools/`。以下按分类列出（工具名 → 路由 → 要点）。

**编码转换（9）**

- **Base64 编解码** `/tools/base64`：文本与 Base64 互转，正确处理 UTF-8（`TextEncoder`，不是逐字符 `charCodeAt`），支持 URL 安全字符表与 data URL 剥离。
- **URL 编解码与解析** `/tools/url`：`encodeURIComponent` 语义的分段编解码 + 查询参数拆解重组（`URLSearchParams`），协议/主机/端口/路径分段展示。
- **图片转 Base64** `/tools/image-base64`：拖拽或选择本地图片转 data URL，探测尺寸与体积，生成 HTML/CSS/Markdown 引用片段；>5 MB 拒绝、>2 MB 警告。
- **JWT 解析** `/tools/jwt-decode`：base64url 拆 header/payload（UTF-8 严格解码，中文 claim 正常），`exp/iat/nbf` 转本地时间并标「已过期 / 尚未生效」，容忍 `Bearer ` 前缀；**只解码不验签**。
- **HTML 实体编解码** `/tools/html-entity`：文本与属性两种模式，可把非 ASCII 转数字引用；解码内置 167 个命名实体 + 数字引用，按规范把 NUL / 代理区 / 越界码点替换为 `U+FFFD`，支持 `&amp` 这类历史无分号写法。
- **古典密码** `/tools/caesar-cipher`：凯撒 / ROT13 / Atbash / 维吉尼亚 / Beaufort 双向加解密，只变换 ASCII 字母并保留大小写，附 26 位移暴力破解（按英文单字母频率排序）。
- **摩尔斯电码** `/tools/morse`：51 个字符的 ITU 表（26 字母 + 10 数字 + 15 标点），解码前先归一 `·` `–` `|` 等等价符号，按 PARIS 标准给点划计数与发报时长。
- **Unicode 转义** `/tools/unicode-escape`：`\uXXXX`（逐 UTF-16 码元）与 `\u{…}` 双向，代理对拆分、`\xNN` 还原，非法序列逐条定位并原样保留。
- **ASCII 码表** `/tools/ascii-table`：0–127 全表，33 个控制字符给名称与用途，查询框认 6 种写法与英文名/中文子串；选中一行展开 13 种记法（十进制到 CSS 转义、URL 百分号、UTF-8 字节）并逐条注明坑。

**格式化（8）**

- **JSON 格式化** `/tools/json-format`：美化 / 压缩 / 校验，保留键序、可选按键名排序，报错给出行列与上下文；标准解析失败后走容错解析（剥行/块注释、尾随逗号）。
- **文本对比** `/tools/diff`：逐行 LCS 差异，忽略空白 / 大小写、仅显示差异，可复制 unified patch。
- **CSV ↔ JSON** `/tools/csv-json`：按 RFC 4180 逐字符状态机解析（引号包裹、`""` 转义、字段内逗号与换行、CRLF、前导零保留），分隔符自动识别或手选；**CSV → JSON → CSV 无损往返**。
- **HTML ⇄ Markdown** `/tools/html-md`：宽容解析器（标签不闭合自动补），表格转管道表、复杂表降级为代码块；反向支持 GFM 表格、任务列表、删除线、引用式链接等开关。结果区只作纯文本展示，不 `v-html`。
- **Markdown 表格** `/tools/md-table`：Markdown ⇄ CSV / TSV / JSON 互转与行列互换，补空格按**显示宽度**算（中日韩与 emoji 记 2 格），对齐后的竖线在编辑器里真是齐的。
- **YAML ⇄ JSON** `/tools/yaml-json`：`loadAll` 支持多文档，报错带行列；可调缩进、`flowLevel`、键排序、强制引号；**每次转换都实测一次往返**，不一致就点名是哪个键。
- **XML 格式化** `/tools/xml-format`：自研宽容解析器不抛异常，坏 XML 也能格式化并把问题列成带行列号的清单；统计元素/属性/文本/注释/CDATA/最大深度，可转 JSON。
- **JSON → TS 接口** `/tools/json-ts`：支持多份样本（NDJSON）合并推断，缺键才标可选、`null` 并进联合而不是当可选，同形状对象复用同一个具名接口。

**文本处理（8）**

- **正则测试** `/tools/regex`：实时匹配高亮、捕获组明细、替换预览、常用标志位，非法表达式即时报错。
- **命名风格转换** `/tools/case-convert`：camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE / Title Case 互转，按词切分保留数字与缩写边界。
- **人民币大写转换** `/tools/rmb-uppercase`：金额 ↔ 中文大写双向（吸收 `1,234.5`、`￥1234.50`、全角、`(12.30)` 会计负数等写法），节权按「万嵌在亿里」递归；同页附**小写中文读法**与反解核对，标出写法是否规范。
- **文本统计** `/tools/text-stats`：字符（按码点）/ 不含空白 / UTF-8 字节 / UTF-16 单元 / 词 / 句 / 段 / 行八项计数，附中英占比、空白构成、高频词与阅读时长。
- **全角半角转换** `/tools/fullwidth`：`U+FF01–FF5E` 与 `U+0020–007E` 双向映射，中文标点另立显式对照表走开关，实时给全角/半角/未转换计数。
- **行文本处理** `/tools/line-tools`：按行去重、删空行、裁剪空白、排序、加序号、随机打乱，一步一个操作且结果可回填。
- **查找替换** `/tools/find-replace`：字面量与正则两种模式，带大小写与全字匹配开关；**全字匹配对中文有效**（用前后瞻而不是 `\b`），逐条命中给出行列号。
- **繁简转换** `/tools/chinese-variant`：字级 + 词级双向，台式 / 港式用字分列，**一字多形逐处可切换**并可按整词统一改；字表为离线生成的自研数据（见[繁简转换的字表是怎么来的](#繁简转换的字表是怎么来的)）。

**哈希与生成（5）**

- **哈希计算** `/tools/hash`：MD5（本地实现，Web Crypto 不提供）+ SHA-1/256/384/512（`crypto.subtle`），一次给出全部摘要与位数。
- **UUID 生成器** `/tools/uuid`：`crypto.randomUUID` 批量 v4、自实现 v7（时间有序），可选大小写、去连字符与分隔符。
- **随机密码生成** `/tools/password-gen`：`crypto.getRandomValues` + 拒绝采样消除取模偏差，Fisher–Yates 保证「每类至少一个」，实时给字符集大小、熵、平均尝试次数与离线破解时间。
- **密码强度评估** `/tools/password-strength`：给自写口令估算熵并做模式折损（常见弱口令、键盘行与连续序列、重复段、日期年份），逐条写明「理论 X bit → 判级用 Y bit」；口令不落盘。
- **AES 加解密** `/tools/aes`：`crypto.subtle` 的 PBKDF2-SHA256（默认 210 000 次迭代）+ AES-256-GCM，载荷自带 salt 与 IV 并写成 6 段点分字段，解密前做载荷自检（格式错与口令错分开报）。

**数学与换算（5）**

- **表达式计算器** `/tools/calculator`：递归下降解析 `+ - * / % ^ ( )`、一元负号与 13 个函数，全角 `（）×÷` 与千分位先归一；结果按 12 位有效数字舍入，>1e12 或 <1e-6 转科学计数法，带 24 键面板与历史记录。
- **单位换算** `/tools/unit-convert`：8 组 65 个单位（长度/面积/体积/质量/温度/时间/速度/存储），线性单位按倍率、温度走偏移公式，存储同时给 1000 与 1024 两套。
- **进制转换** `/tools/number-base`：2–36 进制互转，`BigInt` 逐位累加不受 2⁵³−1 限制，展示位宽/字节数/按权展开；**另含两块并入功能**：RFC 4648 字母表的 Base32 双向，与 8/16/32/64 位定点按位运算。
- **浮点数位布局** `/tools/float-bits`：十进制 ↔ IEEE 754 位串，一次给出 binary16 / binary32 / binary64 三视图（位布局着色、精确十进制展开、最短往返值、1 ulp、nextUp/nextDown）。
- **罗马数字转换** `/tools/roman-numeral`：1–3999 双向，负数为 `-XIV`；非规范写法（`IIII`、`IL`）照样给值，同时指出违背了哪条规则并给出规范写法。

**时间日期（3）**

- **时间戳转换** `/tools/timestamp`：Unix 秒/毫秒与本地时间互转，自动判定单位，附相对时间与常用时区一览。
- **日期计算器** `/tools/date-diff`：全部按 UTC 日历日计算，支持多种日期写法；输出相差天数/周/整月/「N 年 M 月 D 天」、星期、ISO 周、年内第几天、季度，附扣除周末与自定义节假日的工作日统计。
- **crontab 解析** `/tools/cron-parse`：5 段表达式逐字段展开、中文摘要，并推算接下来 5/10/20 次触发时刻（5 年上限，故 `0 0 30 2 *` 能正确报「永不触发」）；6 段与 `L` / `#` 明确提示不支持而不猜。

**颜色与图像（4）**

- **颜色转换器** `/tools/color`：HEX / RGB / HSL 互转（含 alpha 的 4/8 位十六进制），WCAG 对比度与 AA/AAA 判定、10 级色阶点击复制。
- **对比度检查** `/tools/contrast`：前景与背景各吃 HEX / RGB / HSL，带 alpha 的前景先按 alpha 合成再算比值；五条判定 + 三档实时预览，不达标时给**改动最小的可用前景色**。
- **二维码生成** `/tools/qr-code`：容错等级 L/M/Q/H、边距、前后景色、256/512/1024 宽度；导出 PNG 与 SVG，超容量时给中文提示。
- **CSS 渐变生成器** `/tools/gradient`：线性 / 径向 / 锥形可视化编辑，色标增删排序，输出 `background-image` 与底色回退两行，可从现有 CSS 反解回填、也可等距取样成色板。

**网络与运维（5）**

- **子网计算器** `/tools/ip-subnet`：CIDR 与掩码互算、网络/广播/可用地址、地址总数与可用主机数、特殊用途段标注、借位拆分与「需要 N 台主机」规划器。
- **文件权限计算** `/tools/chmod-calc`：12 位 mode 全景视图，一个输入框吃八进制与 9/10 位符号串，逐位勾选与 `u+x,g-w` 符号模式逐步推演，附特殊位语义与 10 个预设。
- **HTTP 状态码速查** `/tools/http-status`：66 条状态码（RFC 9110 为主线，另收 WebDAV 与 nginx/IIS 扩展并标出处），附 9 个请求方法属性表、42 条扩展名 ↔ 媒体类型互查与 `Content-Type` 解析器。
- **IP 地址与进制** `/tools/ip-base`：IPv4/IPv6 与十进制/十六进制/逐段八进制二进制互转，IPv4 简写按 `inet_aton` 规则展开，IPv6 压缩按 RFC 5952，附归属段与 `in-addr.arpa` / `ip6.arpa` 反向域。
- **硬盘容量与分区** `/tools/disk-partition`：先解释「1 TB 只有 931 GiB」的 6.87% 恒定损耗，再按百分比出整数 GiB 分区表与 4K 对齐的起止位置，附各文件系统注意事项。

**健康与体能（5）**

- **BMI 计算器** `/tools/bmi`：公制与英制两套输入，**同时按 WHO 与中国 WS/T 428—2013 两套标准分级**（结论不同会明确写出），另给正常体重区间、BMI Prime 与 Ponderal 指数。
- **基础代谢与每日消耗** `/tools/bmr`：四个公式并排（Mifflin–St Jeor / Harris–Benedict 修订 / Katch–McArdle / Cunningham），乘 ACSM 五档活动系数得 TDEE 并折算增减重摄入。
- **体脂率估算** `/tools/body-fat`：有实测值就用实测，否则走 Deurenberg 回归；由体脂率反算脂肪量与去脂体重，并给六档目标体重与腰围 / 腰高比 / 腰臀比风险提示。
- **每日饮水量计算** `/tools/water-intake`：`35 ml/kg` 起算，按运动、环境、妊娠哺乳、发热逐项加成，**最后扣掉约 20% 的食物供水**，附 IOM 对照与全天分配建议。
- **靶心率区间** `/tools/target-heart-rate`：四个最大心率估算式对照（默认 Tanaka），%HRmax 与 Karvonen 两种区间算法并排，Z1–Z5 各带主观感受与用途。

**金融与理财（5）**

- **房贷计算器** `/tools/mortgage`：等额本息与等额本金**并排**计算，末期用剩余本金结算以吸收分级残差，附年度汇总、逐月明细、收入门槛与 CSV 导出。
- **车贷计算器** `/tools/car-loan`：等额本息与「等本等息」分期费率两种模式，后者用 IRR 反解出**真实年化**（月费率 0.25% 的真实年化约为标称的 1.8–1.9 倍），落地价含购置税 / 保险 / 上牌估算。
- **投资收益与复利** `/tools/investment`：逐月推演（区分期初 / 期末定投），附通胀折现、72 法则与精确翻倍年数对照、达标时间与所需月投额反解。
- **五险一金计算器** `/tools/social-insurance`：六项比例按常见口径预置且**每项都能就地改**，给个人 / 单位 / 合计与公积金入账，附 5%–12% 八档阶梯与逐月表。
- **货币换算** `/tools/currency-convert`：16 个币种以对 CNY 的比值存一份**离线快照**，交叉汇率现算（不会出现两套互相矛盾的汇率）；汇率表可就地改，页面标明快照日期与「不是实时行情」。

**生活常用（6）**

- **年龄计算器** `/tools/age-calc`：精确到「岁 / 个月 / 天」，生日对应日按「当月没有该日取月末」处理；附总天数周数、下次生日倒计时与万天里程碑。
- **身份证信息解析** `/tools/id-card`：GB 11643 的 MOD 11-2 校验位、省级归属地、出生日与性别、周岁；**校验位不符时仍继续解析**并把期望值写出来，15 位可升 18 位。号码打码显示且不落盘。
- **生肖星座查询** `/tools/zodiac`：生肖走干支纪年一条公式（`n = mod(year − 1984, 60)`）推出干支、生肖、五行与本命年；星座按月切点表判定，附十二地支时辰与星座区间速查。
- **亲戚称谓推算** `/tools/kinship`：自研原子模型（10 个原子 + 5 条链尾重写规则 + 规范链表），输入「爸爸的哥哥的儿子」得堂兄弟，也能反向给出对方怎么称呼你；多解如实返回。
- **随机数与抽签** `/tools/random-pick`：区间取数、不重复抽号、名单抽签、名单洗牌、掷骰、抛硬币；默认 `crypto.getRandomValues`，可切固定种子复现。
- **百分比计算** `/tools/percent`：四种问法各一个模式，**每一步都把算式原文渲染出来**，并在变化率旁提示「涨 25% 与跌 20% 不对称」这类常见误读。

## 六、开发指南

### 新增一个工具（六步）

1. **内核**：`src/tools/<id>/index.ts` 只写纯函数 —— 不 import Vue、不碰 DOM、不发请求。这样断言脚本能直接在 node 里跑。
2. **注册**：在 `src/tools/registry.ts` 的 `tools` 数组加一条 `ToolDefinition`（`id` / `name` / `description` / `keywords` / `category` / `icon`）。
   `id` 一处决定四件事：路由 `/tools/<id>`、页面文件名、每页 SEO 文案、构建期静态壳。要新开分类得同时改 `CategoryId` 与 `toolCategories`。
   **注册了却没有对应页面文件会在模块初始化时直接抛错**（`router/index.ts` 里的显式检查）—— 宁可启动即失败，也不留一张 404 死卡片。
3. **页面**：`src/pages/tools/<PascalId>Page.vue`（`json-format` → `JsonFormatPage.vue`，按 `pageNameOf()` 约定解析）。
   外壳统一用 `<ToolShell tool-id="<id>">`，输入与选项用 `useStored('tool.<id>.<field>', 默认值)`，复制用 `<CopyButton :text="…" />`。
   **结果区不用 `v-html`**；敏感输入（口令、证件号）不接 `useStored`。
4. **图标**：只用 Iconify。新名字先在 `node_modules/@iconify-json/lucide/icons.json` 的 `icons` + `aliases` 两键里核对存在
   （`bitwise`、`fraction`、`approximate` 就不在 lucide 里）。注册表图标经 `registryIcons` 自动进包，模板里以**字面量**传入的图标构建期扫描能抓到，
   **运行时拼出来的名字（`'lucide:' + v`）必须手登记进 `vite.config.ts` 的 `chromeIcons`**，否则离线渲染为空白。
5. **验证**：临时断言脚本（`node --experimental-strip-types` 跑，绿了删）→ `pnpm typecheck && pnpm build`
   → 在 `pnpm dev` 走一遍黄金路径 → 再用同源 iframe 对 `pnpm preview` 的产物做 390 / 768 / 1280 三档溢出复测。
   **判据必须落在页面内容上**（例如先断言 `h1` 与输入框数量），只看 `scrollWidth` 会量到一页 404。
6. **文档**：本文档同步 —— 工具清单加一行、分类计数更新、体积表按当次构建改。

### 注册表与搜索

`src/tools/registry.ts` 是唯一事实来源，`ToolDefinition.id` 一处决定四件事：路由、搜索与展示、每页 SEO（`pageTitle()` / `pageDescription()` 被运行时
`afterEach` 与构建期静态壳共用，避免两处文案漂移）、构建产物（`staticHosting()` 按 `tools` 逐个写深链壳）。

搜索打分在 `useToolSearch.ts`：按空格切词，多词取「全部命中之和」，任一词不命中即整体排除（AND 语义）。单词优先级为
`名称/id 完全相等 100 > 前缀 90 > 包含 75 > 关键词全等 65 > 关键词前缀 55 > 关键词包含 45 > 描述包含 25`，同分按中文名 `localeCompare('zh-CN')`。
命令面板与首页共用同一份打分函数，因此三处结果一致；`?category=` 参与过滤但不改变打分。

### 存储与隐私

- 站内一切持久化都在 `localStorage`，键前缀 `toolbox:`；工具键经 `useStored` 写入，值是 `JSON.stringify` 过的。
  唯一的例外是主题键 `toolbox:theme`，它存的是裸字符串（`system` / `light` / `dark`）。
- **三类敏感内容一个字符都不落盘**：身份证号、AES 的口令与明文、待评估的（自己写的）口令。这几处用普通 `ref` 而非 `useStored`，
  "刷新即丢"是特性不是缺陷。评审新页面时按这条检查。
- `useStored(key, 常量)` 在没有存档时会把常量本身当作 ref 的当前值，页面里的就地改写会污染那个常量，初始值必须深拷贝。

### 主题与外观

- 品牌色定义在 `src/assets/css/main.css` 的 `@theme static`（`brand` 绿 + `ink` 深蓝灰），再由 `vite.config.ts` 的
  `ui({ ui: { colors: { primary: 'brand', secondary: 'ink', neutral: 'slate' } } })` 挂到 Nuxt UI 别名上。**改品牌色要同时改这两处**，
  且必须写 `@theme static` —— Tailwind v4 默认会摇掉没有被工具类直接引用的 theme 变量，导致 `--ui-primary` 解析为空（按钮变透明且不报错）。
- 页面底色与文字色不写死在组件里，统一覆盖 Nuxt UI 的语义变量：

  | token | 亮色 | 暗色 |
  | --- | --- | --- |
  | `--ui-bg`（画布） | `#ffffff` | `#161618` |
  | `--ui-bg-elevated`（卡片 / 浮层） | `#f7f8fa` | `#1f1f24` |
  | `--ui-text`（正文） | `#213547` | `#f6f6f7` |
  | `--ui-text-highlighted`（标题） | `#101d2b` | `#ffffff` |
  | `--ui-text-muted`（次要文字） | `#5f6f7f` | `#aab2bd` |

  实测 WCAG 对比度全部 ≥ 4.5:1（正文 12.61 / 16.73，次要 5.16 / 8.44，按钮文字 6.16 / 9.32）。亮色下还额外覆盖了实心主色按钮的文字色。
- **毛玻璃**：token（`--glass-bg` / `--glass-elevated-bg` / `--glass-blur`）由语义变量 `color-mix` 推导，组件里只写 `glass` / `glass-card`
  两个 `@utility`。`body::before` 是一层固定的品牌色径向渐变，给 `backdrop-filter` 提供可透视的背景；
  `prefers-reduced-transparency: reduce` 下自动换成不透明实色。
- **滚动条**：8px 轨道 + 4px 圆角滑块，颜色由 `--ui-text-muted` 推导；标准属性只写在 `@supports (-moz-appearance: none)` 里
  （Chrome 一旦看到非 `auto` 的 `scrollbar-width` 就会整套忽略 `::-webkit-scrollbar`，反之 Firefox 不认 webkit 伪元素）。
- **明暗三态**：`useTheme.ts` 是模块级单例，持久化键 `toolbox:theme`；`index.html` 的前置脚本在任何渲染之前完成同样判定（防首帧闪烁），
  并把结果同步写进 `vueuse-color-scheme`，避免与 Nuxt UI 内置 `useDark()` 互相覆盖。
- **卡片**：`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`；卡片内标题与简介各占一行、**同宽度档内严格等高**，
  长文本用 `container-type: inline-size` + `translateX(min(0px, calc(100cqi - 100%)))` 在悬停 / 聚焦时横向滚出，
  触屏与 `prefers-reduced-motion` 下改为手动横滑。完整介绍由 `ToolShell` 的头部承载。

### 布局与站点配置

- 三段式骨架在 `App.vue`：`AppHeader`（sticky）→ `main`（`max-w-6xl`）→ `AppFooter`，外加全局的 `AppCommandPalette` 与 `BackToTop`。
- 站名、页脚文案、自定义 HTML、仓库地址、年份集中在 `src/site.config.ts`，改完重新构建即可，不需要动组件。
  `footerLine` / `footerHtml` 支持 `{year}` / `{name}` 占位符，留空则整块不渲染。
- **安全边界**：`footerHtml` 走 `v-html`，但它只可能来自这个构建期常量文件，不参与任何运行时输入。哪天要把它接成远端数据，
  必须先过 DOMPurify 之类的净化，否则等于自造 XSS 通道。

### 繁简转换的字表是怎么来的

繁简转换是全站第一个「数据型工具」，也是构建期生成 + 体积核算的唯一样本：

- **数据来源**：OpenCC 1.4.2 随 `opencc-js` 发布的官方字典，只借数据、不引包（`opencc-js` 压缩后 498 kB，超预算）。
  生成脚本 `scripts/gen-chinese-variant-table.mjs` 按 OpenCC 自己的流水线口径合成 11 张导出表。
- **复跑方式**：`pnpm exec node scripts/gen-chinese-variant-table.mjs`（字典目录可用 `OPENCC_DIR` 覆盖）。
  脚本不参与 `pnpm build`，`dist` 里也不含它；实测加不加这个 `scripts/` 目录，产物各块 hash 与字节都不变。
- **`src/tools/chinese-variant/table.ts` 是生成物，不要手改**（文件头已注明）。
- 产出体积：字表内容 100 059 B、逐表 gzip 合计 50 989 B，约是 `opencc-js` 压缩体积的 10.2%。

## 七、构建与部署

```bash
pnpm build                       # 产物在 dist/，假设部署在域名根
pnpm build --base=/toolbox/      # 部署到子目录（GitHub Pages 项目页等）
# CI 里不方便传 CLI 参数时改用环境变量，两者等价（CLI 优先）：
VITE_BASE_PATH=/ToolBox/ pnpm build
```

`vite.config.ts` 里的 `staticHosting()` 插件（`apply: 'build'`，注册在最后一个，因为 `closeBundle` 要读已写出的 `dist/index.html`）做三件事，
让**没有任何 Node 服务端**的静态主机也能正确工作：

1. `transformIndexHtml`：补 `theme-color`、`og:*`、`twitter:card`，并写入 `<noscript>` 里的 63 条工具链接（禁用 JS 或爬虫仍能看到内容）。
2. `closeBundle`：为每个注册工具写一份 `dist/tools/<id>/index.html`，并逐页改写 `<title>` / `description` / `og:title` / `og:description`。
3. `closeBundle`：额外写 `dist/404.html`，支持 404-fallback 的主机把任意路径接回 SPA；`public/.nojekyll` 避免 Pages 的 Jekyll 步骤丢掉 `_` 开头文件。

路由用 `createWebHistory(import.meta.env.BASE_URL)`，与 `--base` 联动；运行时元信息由 `router.afterEach` 写入（`og:*` 用 `property=`，其余用 `name=`，
按同名属性查找，所以客户端来回切换不会产生重复标签）。

> `vite preview` 对未知路径是服务端 SPA fallback（返回 200 + index.html），而 GitHub Pages / OSS 是 **404 + `404.html`**，
> 两者行为不同，别拿 preview 的 200 当作托管方行为的证明。

### CI

`.github/workflows/deploy.yml` 监听 `push: branches: [main]`（也可手动触发）：
`pnpm install --frozen-lockfile` → 以 `VITE_BASE_PATH=/<仓库名>/` 构建 →
**校验 `dist/index.html`、`dist/tools/json-format/index.html`、`dist/404.html` 都在且资源前缀确实是 `/ToolBox/`**（缺产物直接 fail，免得把空白页部署上线）→
`touch dist/.nojekyll` → `peaceiris/actions-gh-pages@v4` 发到 `gh-pages`（`force_orphan: true`）。

**核对线上是否就是这一版**：比 CSS 与共享块的 hash + 未压缩字节，再比清单（`tools/` 壳数、`404.html`、`.nojekyll`、`<noscript>` 链接数、资源前缀）。
**不要拿入口 JS 的 hash 当判据** —— CI 把 base 烘进产物，入口与各页块的 hash 必变、字节会差十几字节。

## 八、体积预算

以下数字来自当前 `dist/`（`base: '/'` 的本地构建，Vite 十进制 kB、gzip 用 `zlib.gzipSync(level: 9)` 复算）：

| 产物 | 原始 | gzip | 说明 |
| --- | --- | --- | --- |
| `assets/index-*.js` | 269.79 kB | 80.02 kB | 入口：Vue + vue-router + Nuxt UI 插件 + 应用外壳 + registry + 内联图标表 |
| `assets/Badge-*.js` | 244.67 kB | 85.47 kB | 复用最广的 Nuxt UI 共享块（`UButton` / `UBadge` / 图标运行时，**以及 registry 的工具元信息文本**） |
| `assets/index-*.css` | 216.82 kB | 28.13 kB | Tailwind v4 + Nuxt UI 主题变量 + 毛玻璃 + 细滚动条 + 卡片滚动动画 |
| 其余 3 个 preload 块 | 9.51 kB | 4.44 kB | `dist` / `ConfigProvider` / `VisuallyHidden` |
| **首屏合计（上面 6 项）** | **740.78 kB** | **198.06 kB** | 首页 `index.html` 实际引用的 6 个静态文件，**不含 `index.html` 自身**（5.74 kB / 2.44 kB） |

工具页全部按路由懒加载，首页不加载任何一个。当前偏大的几页：繁简转换 111.75 kB（89% 是字表数据）、HTML ⇄ Markdown 84.10 kB（两个方向的完整实现）、
YAML ⇄ JSON 67.99 kB（主要是 `js-yaml` 本体）、HTTP 状态码速查 35.71 kB（装的是 66 条状态码与 42 条 MIME 表本身）、
二维码页 30.89 kB（含完整 `qrcode` 库）。

**测量纪律**：不以「上一轮表头 + 本批增量」的方式累加，每次改动都重新实测；做 A/B 时把**注册表条目与页面 `.vue` 一起**移出 `src/`
（只改注册表会让 Tailwind 的 CSS 增量假报为 0），输出目录一律用 `dist-a` / `dist-b` 这种命中排除规则的名字，备份与产物分两条命令删。
改根目录下的非 `src/` 文本文件（workflow、文档）之后，做一次「同源码重跑构建比 hash」——它们可能被 Tailwind 当成内容源。

## 九、维护约定（踩坑沉淀）

按主题归类的高频纪律，都是本项目真实踩过的：

**构建与测量**

1. Tailwind v4 的自动内容扫描会把**构建产物与根目录文本**当源码读。`main.css` 里已有三条排除：`dist*`、`README.md`、`.github`。
   少一条 `dist*`，同一份源码连跑两次 build 的 CSS 就会从 214.63 kB 涨到 222.39 kB；少 `README.md` 则每次改文档都换掉样式表 hash（实测 1757 B 死规则）。
   路径相对 CSS 文件本身（`src/assets/css` → 三级才是项目根）。
2. Vite 打印的 kB 是十进制且两位小数是**截断**，与 `wc -c` 的字节数不可直接对账，统一 ÷1000。Vite 打印的 gzip 列也不等于 node 的任何一档，
   体积表以 `zlib.gzipSync(level: 9)` 为准。
3. 体积「首屏」必须写明口径（几项、含不含 `index.html`），清单从 `dist/index.html` 的实际引用里抓，别凭记忆数块。
4. `vite preview` 会占用 `dist/`（Windows 下 EBUSY），构建一律 `--outDir dist-check` 之类的备用目录。

**Vue 与 Nuxt UI**

5. 模板里的内联事件不能写多条语句（`@click="a = ''; b = false"` 是编译期错误），抽成具名函数。
6. `v-model` 与 `:value` 不能挂在同一个元素上，`vue-tsc` 不报但 dev 下直接 500；新页面按 `curl -s <dev URL>/src/pages/tools/XxxPage.vue | grep -o '"message":"[^"]*"'` 逐个查一遍。
7. `v-model` 绑到「数组里的 ref」不会自动解包（数组不是 `reactive`），两侧对称的模板直接写两块显式代码更省心。
8. `UTextarea` 没有 `autogrow` / `resize`，真实 props 是 `rows` / `maxrows` / `autoresize` / `fixed`；要可拖高用 `:ui="{ base: 'resize-y' }"`。
9. 不要单独注册 `unplugin-auto-import` / `unplugin-vue-components`（`@nuxt/ui/vite` 已内置，重复注册会报错）。
10. `USelect` 的 `[role=option]` 用脚本 `click()` 不生效（Reka 听 pointer 序列）；要验证这类分支最省事的是直接写对应的 `localStorage` 键再 reload。
11. 一条上游 dev 噪音：含 `USelect` 的页面会报 `Invalid prop: type check failed for prop "ariaHidden"`，调用栈全在 Nuxt UI / reka-ui 内部，生产构建不执行，
    不要为它改页面。控制台核查时先排除它；`list_console_messages` 记得关掉 stack，否则一次能拉进几万 token。

**浏览器环境**

12. 后台标签页里 `setTimeout` 被节流、`requestAnimationFrame` 完全不触发：探针要改成「一次调用只做一次动作 + 全同步读 DOM」，
    组件里的「下一帧再执行」要用 `nextTick()` 而不是 `rAF`。
13. 后台文档不派发 `scroll` 事件、`<Transition>` 的 leave 也不会结束。验证「随滚动出现」的组件要自己 `dispatchEvent(new Event('scroll'))`；
    也正因如此，`leave-active-class` 必须带 `pointer-events-none`（否则留下一个看不见但点得到的按钮）。
14. `navigator.clipboard.writeText` 在后台标签页可能永不 settle，所以 `useCopy` 用超时竞速 + `execCommand` 兜底。
15. 同源 iframe 探针必须与父页同源，且 dev 下并发不超过 2–3 个；`onload` 后要轮询等 `h1` 出现，固定 `setTimeout` 会误判「没渲染」。
    判溢出以 `documentElement.scrollWidth === clientWidth` 为准（`overflow-x-auto` 容器内的宽表不是缺陷），
    另外单跑一条「`clientWidth < 40 && scrollWidth > 60`」的细条探测。
16. 别用 `scrollWidth` 判断带 `text-overflow: ellipsis` 的标题是否被裁（Chrome 会虚高），要量文字本体的 `getBoundingClientRect().width`。

**数据与算法**

17. 日期差不要用「借位」算月日（会得到负数天），改成迭代累加整月直到越过终点；「下次生日」按年求对应日，不能复用按月锚点。
18. 位运算在 JS 里是 32 位有符号：`1 << 52` 等于 `1 << (52 % 32)`，64 位场景一律走 `BigInt`。
19. `BigInt('FF')` 会抛错，任意进制解析要按位累加（顺带在此处校验非法字符）；`Number` 超过 2⁵³ 就静默失真，金额一律 `BigInt` 分单位。
20. `crypto.subtle.digest` 的算法名必须带连字符（`'SHA-256'`），写成 `'SHA256'` 会报 `Unrecognized name`。
21. 随机数取值要用拒绝采样消除取模偏差，别直接 `random() % n`。
22. 中文数字是**「万」嵌在「亿」里**的嵌套节权，平铺成固定节权表会在 10¹² 处算错；写这类逻辑要配「不出现连续两个零、不以零结尾、节权不重复」的不变式。
23. 改整数分配算法必须断言「各部分之和 == 总量」（余数归最后一份的写法最容易吃掉整盘而页面看不出异常）。
24. 实体解码的正则要一起吃掉分号，并把「历史无分号」写成最长前缀匹配；`\` 自身在「只转非 ASCII」时也要转义，否则会吃掉后面的 `\uXXXX`。
25. 内核里的自然语言文案不要写 Markdown 的 `**…**`（结果区按纯文本渲染，星号会上屏，typecheck / build / 断言都发现不了）。
26. 自建关系表要配两条全域断言：每条表项能被自己的链推出、每个派生词都能解析出非 null。示例按钮的文案也是一种断言，要和实算结果连起来测。
27. 「数字 + 一句长说明」的混排行里，说明项不要给 `flex-1`（窄屏会被挤成细条并撑破页面），用 `basis-full` 或给明确 `min-w-*`。

## 十、License 与第三方出处

**许可证：MIT。** 仓库根目录的 `LICENSE` 是**一字不改的标准 MIT 文本**（版权人 `cunyu1943`，年份 2026），
第三方数据的出处声明单独放在 `NOTICE`（把附加条款接在 MIT 正文后面，实测会让 GitHub 的许可证识别退化成 `Other` / `NOASSERTION`）；
`package.json` 同步写了 `"license": "MIT"`，`"private": true` 只用来挡住误发 npm。

MIT 覆盖的是**本仓库自研的源码**，下面这张表与两处出处它一概不改写（版本与 `license` 字段实读自 `node_modules/*/package.json`，
`pnpm-lock.yaml` 为锁定来源）：

| 依赖 | 版本 | 许可证 | 用途 |
| --- | --- | --- | --- |
| `vue` / `vue-router` | 3.5.43 / 5.3.1 | MIT | 框架与路由 |
| `@nuxt/ui` | 4.11.1 | MIT | UI 组件（Vue 模式） |
| `tailwindcss` / `@tailwindcss/vite` | 4.3.3 | MIT | 样式 |
| `vite` / `@vitejs/plugin-vue` | 8.3.0 / 6.0.9 | MIT | 构建 |
| `typescript` | 6.0.3 | **Apache-2.0** | 类型检查（仅开发期，不进产物） |
| `vue-tsc` / `@vue/tsconfig` / `@types/node` | 3.3.11 / 0.9.1 / 24.13.6 | MIT | 开发期工具与类型 |
| `qrcode` | 1.5.4 | MIT | 二维码编码（仅该页按需加载） |
| `js-yaml` | 5.4.2 | MIT | YAML ⇄ JSON（仅该页按需加载） |
| `@iconify-json/lucide` | 1.2.135 | **ISC** | 图标字形（构建期内联，运行时不请求 Iconify API） |

两处出处需要单独声明：

- **繁简转换的字表是派生数据**：`src/tools/chinese-variant/table.ts` 由生成脚本从 **OpenCC（Apache-2.0）** 的字典裁切生成，
  Apache-2.0 要求保留版权声明与许可证文本，所以 MIT 不重新授权这张表 —— 声明写在根目录 `NOTICE` 与 `table.ts` 的文件头。
- **图标是 ISC 授权的数据**：整站图标一律来自 Iconify 的 lucide 集合，连 `public/favicon.svg` 也是用 node 读取 `toolbox` 字形生成的（不是手画 SVG）。

除上表两个功能型依赖外，其余 60 多个工具的内核**全部是本仓库自研**，只用了浏览器与 JS 原生 API。
复刻旧站（同所有者名下的 `multicalc/`）时**只参照了功能范围与口径，没有搬任何源码文件**。
