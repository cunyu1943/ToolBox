import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// 单元测试配置：解析 ~/ 别名，直接测试 utils 纯函数（不依赖浏览器 / Nuxt 运行时）
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts']
  },
  resolve: {
    alias: {
      // Nuxt 4 srcDir 为 app/，与运行时 ~/ 保持一致
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})
