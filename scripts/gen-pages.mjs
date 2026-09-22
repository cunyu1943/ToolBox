// 构建后为每个路由生成 <route>/index.html（内容与 dist/index.html 相同），
// 保持 GitHub Pages 深链可用（等价于原 Nuxt 逐路由预渲染）。
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const pagesDir = join(process.cwd(), 'app', 'pages')
const distDir = join(process.cwd(), 'dist')
const template = join(distDir, 'index.html')

if (!existsSync(template)) {
  console.error('dist/index.html 不存在，请先执行 vite build')
  process.exit(1)
}

function walk(dir, prefix = '') {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = prefix ? `${prefix}/${name}` : name
    if (statSync(full).isDirectory()) out.push(...walk(full, rel))
    else if (name.endsWith('.vue')) out.push(rel.replace(/\.vue$/, ''))
  }
  return out
}

const paths = walk(pagesDir).map((p) => (p === 'index' ? '/' : `/${p}`))
let count = 0
for (const p of paths) {
  if (p === '/') continue
  const dir = join(distDir, p)
  mkdirSync(dir, { recursive: true })
  copyFileSync(template, join(dir, 'index.html'))
  count++
}
console.log(`gen-pages: ${count} 个路由页 + 根 index.html 共 ${count + 1} 份`)
