import { defineNuxtConfig } from 'nuxt/config'

// GitHub Pages 子路径：CI 通过 NUXT_APP_BASE_URL 注入 /<repo>/，本地回落为 /
// 若使用自定义域名（<user>.github.io 或 CNAME），baseURL 应为 /，见 README 说明。
const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false, // 纯前端 SPA，可静态部署
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt'],

  // @nuxt/ui v4 依赖的 @nuxt/fonts 默认会联网抓取 Google 字体；离线/受限环境会超时抛错。
  // 禁用远程字体 provider，仅用系统字体，图标仍由 @nuxt/icon（本地）提供。
  fonts: {
    providers: {
      google: false,
      googleicons: false,
      bunny: false
    }
  },

  css: ['~/assets/css/main.css'],

  // 运行时公开配置：是否展示 GitHub 入口及其地址。
  // CI 可通过 NUXT_PUBLIC_GITHUB_URL 注入真实仓库地址；为空时按钮不显示。
  runtimeConfig: {
    public: {
      showGithub: true,
      githubUrl: 'https://github.com/cunyu1943/ToolBox'
    }
  },

  app: {
    baseURL,
    buildAssetsDir: '/assets', // 避开默认的 _nuxt 下划线目录，双保险防 Jekyll 忽略
    head: {
      title: 'ToolBox · 在线工具箱',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: '纯前端在线工具箱：编码加解密/JSON格式化/时间戳/单位换算/房贷/车贷/BMI/进制/货币/日期/数字大写等常用工具，本地处理不上传数据'
        }
      ]
    }
  },

  colorMode: {
    classSuffix: '', // dark class 用 .dark / .light，兼容 Tailwind darkMode: 'class'
    preference: 'system',
    fallback: 'light'
  },

  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: false,
      routes: [
        '/',
        '/about',
        '/tool/basic',
        '/tool/mortgage',
        '/tool/car-loan',
        '/tool/kinship',
        '/tool/weight',
        '/tool/volume',
        '/tool/bmi',
        '/tool/programmer',
        '/tool/currency',
        '/tool/length',
        '/tool/temperature',
        '/tool/number-words',
        '/tool/disk-partition',
        '/tool/timestamp',
        '/tool/date-calc',
        '/tool/investment',
        '/tool/social-insurance',
        '/tool/encoding',
        '/tool/hash',
        '/tool/json',
        '/tool/csv',
        '/tool/jwt',
        '/tool/uuid',
        '/tool/text',
        '/tool/naming',
        '/tool/regex',
        '/tool/color',
        '/tool/gradient',
        '/tool/password',
        '/tool/ip',
        '/tool/fullwidth',
        '/tool/morse',
        '/tool/url',
        '/tool/roman',
        '/tool/cron',
        '/tool/diff',
        '/tool/html-md',
        '/tool/subnet',
        '/tool/contrast',
        '/tool/qrcode',
        '/tool/yaml',
        '/tool/chinese'
      ]
    }
  },

  typescript: {
    strict: true
  },

  devtools: { enabled: false }
})
