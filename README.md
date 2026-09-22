# ToolBox · 纯前端在线工具箱

![Deploy](https://github.com/<user>/<repo>/actions/workflows/deploy.yml/badge.svg)

纯前端、无后端、隐私友好的在线工具箱。当前共 **67 个工具 / 10 大分类**，涵盖数据换算（长度/温度/质量/容量/货币/存储单位/时间单位/面积单位/速度单位）、开发编码（程序员进制、时间戳、日期计算、数字大写、Base64/Base32/URL/HTML/Unicode 编码、MD5+SHA 哈希、JSON/XML 格式化、JSON 转 TS 接口、CSV⇄JSON、JWT 解析、UUID 生成、随机密码、密码强度检查、AES 加解密、IP 地址进制转换、URL 解析构建、Cron 表达式解析、子网划分计算、二维码生成、YAML⇄JSON、Unicode 转义、HTTP 状态码速查、图片⇄Base64、ASCII 码表）、文本处理（大小写、去重排序统计、字数统计、文本查找替换、行文本处理、命名风格转换、正则测试、全角半角转换、摩尔斯电码、文本差异对比、HTML⇄Markdown、繁简转换、Markdown 表格生成）、颜色设计（HEX/RGB/HSL 转换、CSS 渐变生成、WCAG 对比度检查）与财务/生活/数学工具（房贷/车贷/投资收益/五险一金、标准计算、百分比计算、BMI、亲戚称谓、硬盘分区、罗马数字转换、年龄计算器、生肖星座查询、随机数/抽签生成器、身份证解析）与健康工具（BMI、基础代谢率/体脂率、每日饮水量、靶心率区间）。UI 参考 [Vue 官网（VitePress 默认主题）](https://cn.vuejs.org/) 的干净观感：白/深色纯净底、细边框卡片、品牌绿点缀、首页大标题 hero + 明暗双模式，完全响应式，推送即自动发布到 GitHub Pages。

## 技术栈

Vite · Vue 3（SPA，纯客户端渲染）· TypeScript (strict) · Nuxt UI v4（以 `@nuxt/ui/vite` 插件形式接入 Vue 版）· Tailwind CSS v4（CSS-first 主题）· Iconify（图标构建期内联）· vue-router · Pinia · VueUse

> 2026-09 起从 Nuxt 迁移到纯 Vite + Vue 3：去掉 Nitro/服务端与 `.nuxt` 生成物，构建约 5s，产物是标准 `dist/` 静态目录。

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # 运行 utils 纯函数单元测试（vitest）
```

## 构建与本地预览

```bash
pnpm build      # vite build → dist/，再由 scripts/gen-pages.mjs 为每个路由生成 <route>/index.html
pnpm preview    # 本地静态预览 dist/
```

> **已验证**：`pnpm build` 产出 69 份 HTML（根 + 68 条路由），首页与全部工具页深链直出、零外部请求（图标已在构建期内联）；`pnpm test` 498 例通过。
> 深链可用的关键：`gen-pages.mjs` 把 `dist/index.html` 按路由复制成目录页，GitHub Pages 才能在没有服务端 rewrite 的情况下返回 `/<repo>/tool/xxx`。


## 部署到 GitHub Pages（自动）

推送 `main` 分支后，GitHub Actions 会执行 `pnpm build` 并把 `dist/` 发布到 `gh-pages` 分支（也可在 Actions 页手动 `workflow_dispatch` 触发）。

### 仓库一次性配置

1. **Settings → Pages → Build and deployment → Source** 选 **Deploy from a branch**；分支选 **`gh-pages`**，目录选 **`/ (root)`**。
2. 首次部署前 `gh-pages` 分支不存在属正常，workflow 会自动创建。
3. 把本 README 顶部徽章里的 `<user>/<repo>` 替换为你的真实仓库路径。

### 子路径 baseURL 说明

- 站点地址为 `https://<user>.github.io/<repo>/` 时，资源前缀必须是 `/<repo>/`。workflow 已注入 `VITE_BASE_PATH=/<repo>/`，`vite.config.ts` 的 `base` 读取它，无需手动改代码。
- **两种例外**需把 `VITE_BASE_PATH` 改为 `/`：
  - 仓库是用户/组织站点 `<user>.github.io`；
  - 使用自定义域名（在 `public/CNAME` 放置域名并将 Pages 指向该域名）。
- `vite.config.ts` 已设 `build.assetsDir: 'assets'`（避开默认 `_nuxt/` 之类的下划线目录），workflow 亦对 `dist/` 执行 `touch .nojekyll`，双重防止 Jekyll 忽略资源导致白屏。

## 目录结构

```
index.html            # Vite 入口 HTML（挂载 #app、引入 app/main.ts）
vite.config.ts        # base=VITE_BASE_PATH、~ → app/、@nuxt/ui/vite（含 autoImport/components/icon）
scripts/gen-pages.mjs # 构建后按 pages 目录生成 <route>/index.html，保证 GitHub Pages 深链可直出
app/                  # 应用源码，~ 别名指向此目录
├─ main.ts            # createApp + pinia + router + @nuxt/ui/vue-plugin
├─ router.ts          # import.meta.glob('./pages/**/*.vue') 生成路由；/tool/ 前缀 → tool 布局；afterEach 设标题
├─ app.vue            # <UApp> 根容器 + 布局映射（default / tool）+ 全局氛围背景
├─ assets/css/main.css# Tailwind v4：@import tailwind + @nuxt/ui，@theme 定义 vue 色板
├─ components/        # GlassCard / AppHeader / NumberField / ResultPanel / tools/UnitConverter ...
├─ composables/       # useToolSearch / useNumberFormat / useCopy
├─ layouts/           # default.vue · tool.vue（普通组件，用 <slot/> 承载页面）
├─ pages/*.vue        # index.vue · about.vue
├─ pages/tool/*.vue   # 工具页面（路由由文件名推导）
├─ stores/currency.ts # 可编辑汇率表（localStorage 持久化）
└─ utils/             # tools 注册表 + 各计算/处理核心纯函数
```

> 自动导入：`vue` / `vue-router` / `pinia` / `@vueuse/core` 与 `app/composables`、`app/stores` 由 `@nuxt/ui/vite` 内置的
> unplugin 提供（声明文件生成到 `types/`，已 gitignore）。**`app/utils` 不在自动导入范围内**——页面必须
> `import { fn } from '~/utils/xxx'` 显式引入（Nuxt 曾自动导入 utils，迁移后如遗漏会在运行期报 `xxx is not defined`）。

## 新增一个工具（零成本扩展）

1. 新建 `app/pages/tool/xxx.vue`（无需声明布局：路由名以 `/tool/` 开头即自动套 `tool` 布局）。
2. 在 `app/utils/tools.ts` 注册表追加一项（名称/图标/路由/分类/关键词）。图标必须是**有效的 mdi 名**：先用 `curl "https://api.iconify.design/mdi.json?icons=<name>"` 确认返回不含该名的 `not_found`，否则页面上会是空白图标。
3. 无需登记路由：`app/router.ts` 按文件生成分组、`scripts/gen-pages.mjs` 按文件生成深链 HTML。
4. 把处理逻辑写成 `utils/` 纯函数并在页面显式 `import`，在 `test/` 补单元测试，`pnpm test` 通过后再继续。
5. 同步更新本 README（功能列表 / 测试覆盖表）。

> 交付节奏约定：每新增一个功能，**先测通再继续**，并**同步更新 README**，避免返工与回归。

首页卡片、搜索、分类筛选与工具页侧边栏索引全部由注册表驱动，无需改动核心逻辑。

## 测试

计算核心均为 `utils/` 纯函数，用 **vitest** 做单元测试（`pnpm test`）。当前覆盖：

| 模块 | 被测函数 | 覆盖点 |
|---|---|---|
| 精度/格式化 | `number.ts` | 浮点误差归一、千分位、货币、未知币种降级、百分比 |
| 房贷 / 车贷 | `loan.ts` | 等额本息月供、等额本金首月/递减/末月、总利息公式、零利率与非法输入边界 |
| 质量 / 容量换算 | `units.ts` | 标准换算因子、市斤两关系、实时联动守恒 |
| BMI | `bmi.ts` | 计算值、中国标准分级边界、健康体重区间、英制换算 |
| 基础代谢率 | `bmr.ts` | Mifflin-St Jeor 男女常数项、年龄/身高/体重边界、TDEE 活动系数取整 |
| 体脂率 | `body-fat.ts` | Deurenberg 公式值、负值降级 null、ACE 男女分级边界 |
| 每日饮水量 | `water.ts` | 35ml/kg 基础值、30–40ml/kg 区间、运动 +500ml/h、杯数向上取整 |
| 靶心率区间 | `heart-rate.ts` | 220−年龄最大心率、Karvonen 五档区间值、区间连续性、静息心率边界 |
| 亲戚称谓 | `kinship-data.ts` | 双向关系网图遍历（参照 mumuy/relationship）：正向边 + 自动求逆的反向边 + 兄弟姐妹共享父母传播、按性别剪枝、多候选歧义标记、反向查询、派生称谓（侄子/爷爷…）展开为原子路径、未知/不可推导降级 |
| 标准计算器 | `calc-basic.ts` | 按键状态机：浮点归一、连续运算、除零错误态与复位、退格、正负号、百分比、小数点去重 |
| 程序员计算器 | `programmer.ts` | 字长截断、补码有符号解释、四进制解析/校验、AND/OR/XOR/NOT/移位与位数约束、字节换算 |
| 温度换算 | `temperature.ts` | 摄氏/华氏/开尔文含偏移量互转、非法输入归零 |
| 数字大小写 | `chinese-number.ts` | 财务大写元角分整、内部补零、亿级分组、负数、普通中文读法 |
| 硬盘分区 | `disk-partition.ts` | 占比向下取整、余量并入末块且总和守恒、GB→TB 展示 |
| 日期计算 | `date-calc.ts` | 闰年解析、整天差、月末加减不漂移、年月日借位差、星期、-0 归一 |
| 投资收益 | `investment.ts` | 月复利终值、定投年金终值、零利率退化、累计投入与收益率 |
| 五险一金 | `social-insurance.ts` | 个人/单位分项与合计、工伤生育个人不缴、公积金比例可调 |
| 长度换算 | `units.ts`（`lengthUnits`）| 英制/公制/市制因子、实时联动守恒 |
| 时间戳/时区 | `timezone.ts` | 基于 Intl 的时区偏移（含纽约/伦敦/悉尼 DST）、epoch↔墙上时间格式化、两遍修正往返一致、秒/毫秒归一 |
| 编码转换 | `encoding.ts` | UTF-8 安全 Base64/Base32(RFC4648) 编解码与非法向量、URL 组件、HTML 命名/数字实体转义还原、Unicode 转义含代理对 |
| 哈希摘要 | `hash.ts` | MD5（js-md5）+ Web Crypto 的 SHA-1/256/384/512 已知向量、逐字节补零十六进制、中文 UTF-8 编码影响 |
| JSON 格式化 | `json-tool.ts` | 美化/压缩/校验、自定义缩进、错误行列定位 |
| CSV 转 JSON | `csv.ts` | 引号内逗号/换行/转义双引号、CRLF、自定义分隔符、表头开关、对象数组与二维数组双向 |
| JWT 解析 | `jwt.ts` | base64url 补 padding 解码、三段结构校验、exp/iat 时间可读化 |
| UUID 生成 | `uuid.ts` | RFC 4122 v4 版本位与变体位、可注入 rng 确定性、原生 API 优先与回退 |
| 文本处理 | `text.ts` | 大小写/反转、逐行去空行去重排序反转、字符/词/行/UTF-8 字节统计 |
| 命名风格转换 | `naming.ts` | 跨 camel/snake/kebab/CONSTANT/Pascal/Title 分词与互转、缩写词切分 |
| 正则测试 | `regex.ts` | 多匹配计数、捕获组、非法模式报错、零宽匹配防死循环 |
| 颜色转换 | `color.ts` | HEX(缩写/含 alpha)⇄RGB⇄HSL 往返、负色相归一、可读前景、随机色 |
| CSS 渐变生成 | `gradient.ts` | linear-gradient 拼接、角度/位置归一钳制、空色标过滤 |
| 随机密码 | `password.ts` | 长度/字符集组合、每类至少一个、Fisher-Yates 洗牌、排除易混淆、可注入 rng |
| IP 地址转换 | `ip.ts` | IPv4 合法性、点分⇄32 位无符号整数⇄十六进制⇄二进制、越界抛错 |
| 全角半角转换 | `fullwidth.ts` | ASCII 区(含空格)⇄全角双向、非 ASCII 保持不变 |
| 摩尔斯电码 | `morse.ts` | 国际表 26+10+标点双向编解码、词边界「/」、未知字符降级上报 |
| URL 解析构建 | `url-tool.ts` | 协议/主机/端口/路径/参数/片段拆解与重建、无协议补全、重复键保留、编解码往返一致 |
| 罗马数字 | `roman.ts` | 1~3999 双向转换、越界抛错、IIII/IL 等非规范写法拒绝 |
| Cron 表达式 | `cron.ts` | 5 字段解析（列表/范围/步长/周 7 归一）、日周同受限取「或」、后 N 次执行时间、非法字段报错 |
| 文本差异对比 | `diff.ts` | 行级 LCS（公共前后缀裁剪、超规模退化）、增删统计与双侧行号、统一格式输出 |
| HTML ⇄ Markdown | `html-md.ts` | 常用标签子集双向转换（标题/列表/引用/代码块/链接图片），HTML 侧输出转义 |
| 子网划分 | `subnet.ts` | CIDR/点分掩码解析（非连续掩码拒绝）、网络/广播/通配符/可用主机区间、/31 与 /32 特例 |
| 颜色对比度 | `contrast.ts` | WCAG 2.1 相对亮度与对比度、普通/大文本 AA/AAA 四档判定 |
| 二维码 | `qrcode-tool.ts` | qrcode 生成 SVG（等级/颜色可调）、PNG 导出、超容量报错 |
| YAML 互转 | `yaml-tool.ts` | js-yaml 严格解析 YAML⇄JSON、错误行列定位、往返稳定 |
| 繁简转换 | `chinese-convert.ts` | OpenCC 词级双向转换，台/港变体、转换器实例缓存 |
| XML 格式化 | `xml-tool.ts` | 手写词法分析美化/压缩、标签配对与交叉错误定位、CDATA/注释/声明保留 |
| 存储单位换算 | `units.ts`（`storageUnits`）| 十进制 SI（KB~PB）与二进制 IEC（KiB~TiB）双体系、bit⇄B、1GiB=1073741824B |
| AES 加解密 | `aes-tool.ts` | Web Crypto AES-256-GCM + PBKDF2（十万轮、随机 salt/IV）、密文格式与前缀/长度/篡改分类报错 |
| Unicode 转义 | `unicode-tool.ts` | 中文⇄\uXXXX 双向、emoji 代理对自动拆分配对、非法序列原样保留 |
| 行文本处理 | `lines-tool.ts` | 去重/去空行/trim/升降序/反转/加序号/打乱，兼容 \n \r\n \r |
| 年龄计算器 | `age-tool.ts` | 精确年月日、总天数、下次生日倒计时，2/29 平年按 3/1 计 |
| HTTP 状态码 | `http-status.ts` | 48 个常见码中英说明速查，码号/名称/中文模糊搜索 + 大类过滤 |
| 随机数/抽签 | `random-tool.ts` | 区间随机、不重复抽样（部分 Fisher-Yates）、掷骰抛硬币，rng 可注入测试 |
| 图片 Base64 | `image-base64-tool.ts` | dataURL 解析/字节数估算/可读大小三档，图片不经服务器；输出截断预览 + 输入解析 300ms 防抖防卡顿 |
| 生肖星座 | `zodiac-tool.ts` | 12 年循环生肖、12 星座边界日期与四元素，非法月日校验 |
| ASCII 码表 | `ascii-table.ts` | 0–127 全码位，33 控制字符名+中文说明，支持码号/0x十六进制/字符/名称搜索 |
| 时间单位换算 | `units.ts`（`timeUnits`）| 纳秒~年实时联动，月按 30 天、年按 365 天近似，性能计时场景 |
| JSON 转 TS 接口 | `json-ts.ts` | 递归生成 interface、数组样本键合并（缺席加 ?）、重名接口加序号、非法键加引号 |
| 密码强度检查 | `password-strength.ts` | 熵估算（长度×log2字符集）、弱口令/连续/键盘序列/重复段惩罚、0~4 级评分 |
| 百分比计算器 | `percent-tool.ts` | 求百分比/占比/增减幅三问，除零与非法输入防护，浮点归一 |
| Markdown 表格生成 | `markdown-table.ts` | Tab/CSV/分号/竖线/连续空格自动识别、复用 parseCsv、逐列对齐、竖线转义、换行转 `<br>`、源码补白 |
| 面积单位换算 | `units.ts`（`areaUnits`）| m²/公顷/亩/km²/英亩/ft² 实时联动，1 公顷=10000m²=15 亩 |
| 速度单位换算 | `units.ts`（`speedUnits`）| m/s、km/h、mph、节、ft/s 互转，1 节≈1.852 km/h |
| 字数统计 | `count-text.ts` | 字符/中文/英文词/行/句/段计数（码点级，emoji 计 1），阅读时长估算，300ms 防抖 |
| 身份证验证 | `id-card.ts` | GB 11643 校验位核验、出生日期/性别/年龄/归属地码解析，非法日期拦截 |
| 文本查找替换 | `find-replace.ts` | 普通/正则双模式、大小写敏感、全字匹配，正则替换串支持 $1~$9 分组引用 |

> 全部工具的核心逻辑均为 `utils/` 纯函数（`pnpm test` 共 498 例通过），页面组件直接调用，测试与线上代码同源。

## 设计说明

- **导航与全局交互**：
  - **Logo 返回首页**：`AppHeader` 的 Logo 是 `<RouterLink to="/">`，任意页点击均回首页；已在首页时再点平滑回到顶部。
  - **返回顶部**：`components/BackToTop.vue` 挂在 `app.vue` 全局，滚动超过 400px 右下角浮现，点击平滑回顶。
  - **头部搜索（与首页大搜索二选一）**：`AppHeader.vue` 仅在首页且向下滚动越过 260px 后淡入紧凑搜索框，同时首页的大搜索淡出隐藏；两处绑定 `composables/useToolSearch.ts` 里同一个模块级 `query` ref，关键词与结果实时联动；`UInput` v4 无内置清除属性，改由 `#trailing` 插槽自绘「输入非空时出现」的清除按钮。
  - **GitHub 入口**：`AppHeader` 在明暗切换按钮左侧，`showGithub` 为真且地址非空时展示。地址取 `import.meta.env.VITE_GITHUB_URL`（workflow 自动注入当前仓库），本地未注入时回落到 README 里的仓库地址；清空该变量即隐藏按钮。
  - **明暗模式**：`ColorModeToggle.vue` 用 VueUse `useDark()`（`localStorage` 键 `vueuse-color-scheme`，跟随系统偏好初始化），`@nuxt/ui/vite` 的 colorMode 插件在应用挂载前把 `.dark` 类写到 `<html>`，因此 Tailwind 的 `dark:` 变体与刷新后一致、无闪烁。
  - **侧边栏工具索引**：`components/ToolSidebar.vue` 由 `utils/tools.ts` 注册表驱动，按 10 大分类列出全部工具、当前页品牌绿高亮，各分类组头可点击折叠/展开（导航到折叠分组内工具时自动展开）；`layouts/tool.vue` 桌面端（≥lg）显示粘性左侧栏，移动端折叠为「工具目录」`<details>` 面板。新增工具注册后侧边栏自动出现，无需额外维护。
- **视觉**：对齐 Vue 官网（VitePress 默认主题）——正文色 `#213547` / 深色底 `#1b1b1f`，卡片为细边框浅阴影（`GlassCard` 共享组件），导航为置顶半透明毛玻璃条，首页为大字 hero（绿色渐变高亮）。改样式只需调整 `GlassCard.vue` 与 `assets/css/main.css`，各工具页自动继承。
- **精度**：所有浮点计算经 `utils/number.ts` 的 `roundFloat` 归一，避免 `0.1+0.2` 误差。
- **货币**：默认内置可手动编辑的汇率表，存 localStorage，无网络请求；结果标注「仅供参考」与最后更新时间。
- **可访问性**：表单含 `<label>`，交互元素含 `aria-label`，结果区使用 `aria-live="polite"`，遵循 `prefers-reduced-motion`。
