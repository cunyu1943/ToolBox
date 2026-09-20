# ToolBox · 纯前端在线工具箱

![Deploy](https://github.com/<user>/<repo>/actions/workflows/deploy.yml/badge.svg)

纯前端、无后端、隐私友好的在线工具箱。当前共 **31 个工具 / 10 大分类**，涵盖数据换算（长度/温度/质量/容量/货币）、开发编码（程序员进制、时间戳、日期计算、数字大写、Base64/Base32/URL/HTML/Unicode 编码、SHA 哈希、JSON 格式化、CSV⇄JSON、JWT 解析、UUID 生成、随机密码、IP 地址进制转换）、文本处理（大小写、去重排序统计、命名风格转换、正则测试、全角半角转换）、颜色设计（HEX/RGB/HSL 转换、CSS 渐变生成）与财务/生活工具（房贷/车贷/投资收益/五险一金、标准计算、BMI、亲戚称谓、硬盘分区）。UI 参考 [Vue 官网（VitePress 默认主题）](https://cn.vuejs.org/) 的干净观感：白/深色纯净底、细边框卡片、品牌绿点缀、首页大标题 hero + 明暗双模式，完全响应式，推送即自动发布到 GitHub Pages。

## 技术栈

Nuxt 4（SPA，`ssr:false`）· TypeScript (strict) · Nuxt UI v4 · Tailwind CSS v4（CSS-first 主题）· Iconify · Pinia · VueUse

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # 运行 utils 纯函数单元测试（vitest）
```

## 构建与本地预览

```bash
pnpm generate   # 产出静态站点到 .output/public/
pnpm dlx serve .output/public -l 3000
# 验证子路径：浏览器打开 http://localhost:3000/<repo>/
```

> **已验证**：升级到 Nuxt 4 后，Windows 本地 `pnpm build` / `pnpm generate` 的全部路由预渲染均已跑通
> （旧版 `@nuxt/icon` 在 Windows + Node ≥ 22.12 的 `createRequire('file:///_entry.js')` 问题已随 Nitro 更新消失）。
> CI 的 `pnpm generate`（Linux + Node 20）同样正常。


## 部署到 GitHub Pages（自动）

推送 `main` 分支后，GitHub Actions 会执行 `pnpm generate` 并把 `dist/` 发布到 `gh-pages` 分支（也可在 Actions 页手动 `workflow_dispatch` 触发）。

### 仓库一次性配置

1. **Settings → Pages → Build and deployment → Source** 选 **Deploy from a branch**；分支选 **`gh-pages`**，目录选 **`/ (root)`**。
2. 首次部署前 `gh-pages` 分支不存在属正常，workflow 会自动创建。
3. 把本 README 顶部徽章里的 `<user>/<repo>` 替换为你的真实仓库路径。

### 子路径 baseURL 说明

- 站点地址为 `https://<user>.github.io/<repo>/` 时，`baseURL` 必须是 `/<repo>/`。workflow 已通过环境变量 `NUXT_APP_BASE_URL` 自动注入，无需手动改代码。
- **两种例外**需把 `NUXT_APP_BASE_URL` 改为 `/`：
  - 仓库是用户/组织站点 `<user>.github.io`；
  - 使用自定义域名（在 `public/CNAME` 放置域名并将 Pages 指向该域名）。
- `nuxt.config.ts` 已设 `buildAssetsDir: '/assets'`（避开默认 `_nuxt` 下划线目录），workflow 亦对 `.output/public` 执行 `touch .nojekyll`，双重防止 Jekyll 忽略资源导致白屏。

## 目录结构

```
app/                  # Nuxt 4 srcDir，~ 别名指向此目录
├─ app.config.ts      # 主题：ui.colors.primary=vue 绿
├─ app.vue            # <UApp> 根容器 + 全局氛围背景
├─ assets/css/main.css# Tailwind v4：@import tailwind + @nuxt/ui，@theme 定义 vue 色板
├─ components/        # GlassCard / AppHeader / NumberField / ResultPanel ...
├─ composables/       # useToolSearch / useNumberFormat
├─ layouts/           # default（首页/关于）· tool（工具页，复用同一 AppHeader，工具标题在内容区顶部）
├─ pages/tool/*.vue   # 工具页面
├─ stores/currency.ts # 可编辑汇率表（localStorage 持久化）
└─ utils/             # tools 注册表 + 各计算/处理核心纯函数
nuxt.config.ts        # ssr:false、baseURL、prerender 路由（位于项目根）
```

## 新增一个工具（零成本扩展）

1. 新建 `pages/tool/xxx.vue`（`definePageMeta({ layout: 'tool' })`）。
2. 在 `utils/tools.ts` 注册表追加一项（名称/图标/路由/分类/关键词）。
3. 在 `nuxt.config.ts` 的 `nitro.prerender.routes` 增加 `/tool/xxx`。
4. 把处理逻辑写成 `utils/` 纯函数，并在 `test/` 补单元测试，`pnpm test` 通过后再继续。
5. 同步更新本 README（功能列表 / 测试覆盖表）。

> 交付节奏约定：每新增一个功能，**先测通再继续**，并**同步更新 README**，避免返工与回归。

首页卡片、搜索、分类筛选全部由注册表驱动，无需改动核心逻辑。

## 测试

计算核心均为 `utils/` 纯函数，用 **vitest** 做单元测试（`pnpm test`）。当前覆盖：

| 模块 | 被测函数 | 覆盖点 |
|---|---|---|
| 精度/格式化 | `number.ts` | 浮点误差归一、千分位、货币、未知币种降级、百分比 |
| 房贷 / 车贷 | `loan.ts` | 等额本息月供、等额本金首月/递减/末月、总利息公式、零利率与非法输入边界 |
| 质量 / 容量换算 | `units.ts` | 标准换算因子、市斤两关系、实时联动守恒 |
| BMI | `bmi.ts` | 计算值、中国标准分级边界、健康体重区间、英制换算 |
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
| 哈希摘要 | `hash.ts` | Web Crypto 的 SHA-1/256/384/512 已知向量、逐字节补零十六进制、中文 UTF-8 编码影响 |
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

> 全部工具的核心逻辑均为 `utils/` 纯函数（`pnpm test` 共 249 例通过），页面组件直接调用，测试与线上代码同源。

## 设计说明

- **导航与全局交互**：
  - **Logo 返回首页**：`AppHeader` 的 Logo 是 `<NuxtLink to="/">`，任意页点击均回首页；已在首页时再点平滑回到顶部。
  - **返回顶部**：`components/BackToTop.vue` 挂在 `app.vue` 全局，滚动超过 400px 右下角浮现，点击平滑回顶。
  - **头部搜索（与首页大搜索二选一）**：`AppHeader.vue` 仅在首页且向下滚动越过 260px 后淡入紧凑搜索框，同时首页的大搜索淡出隐藏；两处绑定同一份 `useState('calc-search-query')`，关键词与结果实时联动；`UInput` v4 无内置清除属性，改由 `#trailing` 插槽自绘「输入非空时出现」的清除按钮。
  - **GitHub 入口**：`AppHeader` 在明暗切换按钮左侧，按 `runtimeConfig.public.showGithub` 且 `githubUrl` 非空时展示。配置方式二选一：直接改 `nuxt.config.ts` 的 `runtimeConfig.public.githubUrl`，或部署时注入环境变量 `NUXT_PUBLIC_GITHUB_URL`（Nuxt 自动覆盖同名公开配置）。
- **视觉**：对齐 Vue 官网（VitePress 默认主题）——正文色 `#213547` / 深色底 `#1b1b1f`，卡片为细边框浅阴影（`GlassCard` 共享组件），导航为置顶半透明毛玻璃条，首页为大字 hero（绿色渐变高亮）。改样式只需调整 `GlassCard.vue` 与 `assets/css/main.css`，各工具页自动继承。
- **精度**：所有浮点计算经 `utils/number.ts` 的 `roundFloat` 归一，避免 `0.1+0.2` 误差。
- **货币**：默认内置可手动编辑的汇率表，存 localStorage，无网络请求；结果标注「仅供参考」与最后更新时间。
- **可访问性**：表单含 `<label>`，交互元素含 `aria-label`，结果区使用 `aria-live="polite"`，遵循 `prefers-reduced-motion`。
