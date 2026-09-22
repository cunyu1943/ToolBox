import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import ui from '@nuxt/ui/vite'
import { tools } from './app/utils/tools.ts'

// GitHub Pages 子路径：CI 注入 VITE_BASE_PATH=/<repo>/，本地回落为 /
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) }
  },
  plugins: [
    vue(),
    tailwindcss(),
    // @nuxt/ui v4 的 vite 插件内置 unplugin-auto-import / unplugin-vue-components，
    // 再单独注册实例会被其检测报错，因此统一通过 autoImport/components 选项配置。
    ui({
      ui: { colors: { primary: 'vue', neutral: 'slate' } },
      // 构建期把用到的图标从本地 @iconify-json 集合内联，避免运行时向 iconify API 拉取（离线可用）。
      // scan 只识别模板里的 i-* 类名，注册表里以字符串动态传的图标需显式列出。
      icon: { clientBundle: { scan: true, sizeLimitKb: 512, icons: tools.map((t) => t.icon) } },
      dts: false,
      autoImport: {
        imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        dirs: ['app/composables', 'app/stores'],
        dts: 'types/auto-imports.d.ts',
        vueTemplate: true
      },
      components: {
        dirs: ['app/components'],
        // app/components/tools/UnitConverter.vue → <ToolsUnitConverter>（7 个换算页依赖此前缀）
        directoryAsNamespace: true,
        dts: 'types/components.d.ts'
      }
    })
  ],
  build: {
    outDir: 'dist',
    // 避开默认 _nuxt/ 下划线目录，双保险防 GitHub Pages 的 Jekyll 忽略
    assetsDir: 'assets'
  }
})
