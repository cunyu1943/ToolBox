import path from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import ui from '@nuxt/ui/vite'
import { pageDescription, pageTitle, registryIcons, tools } from './src/tools/registry.ts'

/**
 * 静态托管适配（无 Node 服务端）：
 * 1. index.html 里补 og / theme-color，并给出 <noscript> 工具清单，便于爬虫与禁用 JS 的场景；
 * 2. 构建结束后为每个工具路由写出 `dist/tools/<id>/index.html`，
 *    这样 GitHub Pages 这类没有 SPA fallback 的静态主机也能直接打开深链；
 * 3. 同时写一份 `dist/404.html`，支持 404-fallback 的主机可以把任意路径接回 SPA。
 */
function staticHosting(): Plugin {
  let outDir = 'dist'
  let base = '/'

  return {
    name: 'toolbox:static-hosting',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
      base = config.base
    },
    transformIndexHtml(html) {
      // og 的初值给「无 JS 的首页抓取方」用；进工具页后由 router.afterEach 覆写
      const siteTitle = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'ToolBox · 在线工具箱'
      const siteDescription = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''
      const meta = [
        '<meta name="theme-color" content="#42b883" media="(prefers-color-scheme: light)" />',
        '<meta name="theme-color" content="#42d392" media="(prefers-color-scheme: dark)" />',
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="ToolBox" />',
        `<meta property="og:title" content="${siteTitle}" />`,
        `<meta property="og:description" content="${siteDescription}" />`,
        '<meta name="twitter:card" content="summary" />'
      ].join('\n    ')
      const list = tools
        .map((tool) => `<a href="${base}tools/${tool.id}">${tool.name}</a>`)
        .join(' · ')
      return html
        .replace('</title>', `</title>\n    ${meta}`)
        .replace(
          '<div id="app"></div>',
          `<div id="app"></div>\n    <noscript><p>需要启用 JavaScript 才能使用工具。工具清单：<br />${list}</p></noscript>`
        )
    },
    closeBundle() {
      const shell = readFileSync(path.join(outDir, 'index.html'), 'utf8')
      const esc = (value: string): string =>
        value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

      for (const tool of tools) {
        const dir = path.join(outDir, 'tools', tool.id)
        mkdirSync(dir, { recursive: true })
        const title = pageTitle(tool)
        const description = pageDescription(tool)
        // 深链的静态壳逐页改写 title/description/og，禁用 JS 的抓取方也能拿到正确元信息。
        // og:url 需要绝对地址，构建期拿不到域名，交给运行时 afterEach 写入。
        const page = shell
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
          .replace(
            /(<meta name="description" content=")[^"]*(")/,
            `$1${esc(description)}$2`
          )
          .replace(
            /(<meta property="og:title" content=")[^"]*(")/,
            `$1${esc(title)}$2`
          )
          .replace(
            /(<meta property="og:description" content=")[^"]*(")/,
            `$1${esc(description)}$2`
          )
        writeFileSync(path.join(dir, 'index.html'), page)
      }
      writeFileSync(path.join(outDir, '404.html'), shell)
    }
  }
}

/** 界面骨架用到的图标；工具与分类图标由 src/tools/registry.ts 自动汇入 */
const chromeIcons = [
  'lucide:toolbox',
  'lucide:menu',
  'lucide:search',
  'lucide:command',
  'lucide:github',
  'lucide:sun',
  'lucide:moon',
  'lucide:monitor',
  'lucide:x',
  'lucide:arrow-left',
  'lucide:arrow-left-right',
  'lucide:arrow-up',
  'lucide:chevron-right',
  'lucide:chevron-up',
  'lucide:chevron-down',
  'lucide:copy',
  'lucide:check',
  'lucide:circle-alert',
  'lucide:info',
  'lucide:eraser',
  'lucide:refresh-cw',
  'lucide:plus',
  'lucide:download',
  'lucide:upload',
  'lucide:play',
  'lucide:file-text',
  'lucide:clipboard-list',
  'lucide:gallery-thumbnails',
  'lucide:sparkles',
  'lucide:triangle-alert',
  'lucide:delete',
  'lucide:equal',
  'lucide:arrow-down',
  // 第 2 批工具页里以字符串传入的图标（scan 只认 i-* 类名）
  'lucide:arrow-down-to-line',
  'lucide:square-function',
  'lucide:text',
  'lucide:arrow-right',
  'lucide:undo-2',
  'lucide:shuffle',
  'lucide:dices',
  'lucide:trash',
  // 第 3 批：AES 页里用三元表达式动态传入的显隐口令图标
  'lucide:eye',
  'lucide:eye-off',
  // 第 5 批：金融批两页的「展开比例设置」三元写法与「恢复默认」按钮（同为动态传入，scan 抓不到）
  'lucide:sliders-horizontal',
  'lucide:rotate-ccw'
]

export default defineConfig({
  // GitHub Pages 项目站点是 <user>.github.io/<repo>/ 子路径，构建期要用 VITE_BASE_PATH 注入
  // `/ToolBox/`；router 侧读 import.meta.env.BASE_URL、staticHosting 侧读 config.base，
  // 两端共用这一个开关，本地 dev/preview 保持默认 `/`。
  base: process.env.VITE_BASE_PATH ?? '/',
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  plugins: [
    vue(),
    tailwindcss(),
    // @nuxt/ui v4 的 vite 插件内置 unplugin-auto-import / unplugin-vue-components，
    // 再单独注册这两个插件实例会被其检测报错，因此统一走下面的选项配置。
    ui({
      // 颜色主题别名：brand / ink 色阶定义在 src/assets/css/main.css 的 @theme 中
      ui: { colors: { primary: 'brand', secondary: 'ink', neutral: 'slate' } },
      // 构建期把用到的图标从本地 @iconify-json 集合内联，避免运行时向 Iconify API 请求（离线可用）。
      // scan 只识别模板里的 i-* 类名，以字符串动态传入的图标需在 icons 里显式列出。
      icon: {
        clientBundle: {
          scan: true,
          sizeLimitKb: 512,
          icons: [...new Set([...chromeIcons, ...registryIcons])]
        }
      },
      dts: false,
      autoImport: {
        imports: ['vue', 'vue-router'],
        dirs: ['src/composables'],
        dts: 'types/auto-imports.d.ts',
        vueTemplate: true
      },
      components: {
        dirs: ['src/components'],
        // src/components/tools/Foo.vue → <ToolsFoo>
        directoryAsNamespace: true,
        dts: 'types/components.d.ts'
      }
    }),
    // 放在最后：closeBundle 里要读已写出的 dist/index.html 来生成各路由的静态壳
    staticHosting()
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    // strictPort：端口被占用时直接报错，不静默换端口（避免与同工作区其他项目串台）
    port: 5173,
    strictPort: true
  }
})
