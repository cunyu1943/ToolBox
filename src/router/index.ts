import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import HomePage from '~/pages/HomePage.vue'
import NotFoundPage from '~/pages/NotFoundPage.vue'
import { pageDescription, pageTitle, pageNameOf, tools } from '~/tools/registry'

/**
 * 工具页一律懒加载：注册表决定路由表，页面文件按 `<PascalId>Page.vue` 约定命名。
 * glob 的键相对本文件，注册了缺页的工具会在开发期直接抛错，避免留下死链。
 */
const toolViews = import.meta.glob<{ default: Component }>('../pages/tools/*Page.vue')

const toolRoutes: RouteRecordRaw[] = tools.flatMap((tool) => {
  const file = `../pages/tools/${pageNameOf(tool.id)}Page.vue`
  const view = toolViews[file]
  if (!view) throw new Error(`[registry] 工具「${tool.name}」缺少页面 src/${file.replace('../', '')}`)
  return [
    {
      path: `/tools/${tool.id}`,
      name: `tool-${tool.id}`,
      component: view,
      meta: {
        title: pageTitle(tool),
        description: pageDescription(tool)
      }
    }
  ]
})

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: {
      title: 'ToolBox · 在线工具箱',
      description: `ToolBox 在线工具箱：${tools.length} 个常用开发小工具（编码转换、格式化、文本处理、哈希、时间日期、颜色与图像），全部在浏览器本地完成，不上传任何数据。`
    }
  },
  ...toolRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
    meta: { title: '页面不存在 · ToolBox' }
  }
]

export const router = createRouter({
  // BASE_URL 由 vite build --base=/子路径/ 注入，保证子目录部署时深链可用
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 }
})

function useMeta(key: string, content: string): void {
  // og:* 是 Open Graph 属性，必须写进 property；构建期的静态壳也是按 property 注入的
  const attribute = key.startsWith('og:') ? 'property' : 'name'
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

router.afterEach((to) => {
  const title = to.meta.title
  document.title = typeof title === 'string' && title ? title : 'ToolBox · 在线工具箱'

  const description = to.meta.description
  if (typeof description === 'string' && description) {
    useMeta('description', description)
    useMeta('og:title', document.title)
    useMeta('og:description', description)
    // location.pathname 已含部署子路径，比拿 to.path 拼更准
    useMeta('og:url', window.location.origin + window.location.pathname)
  }
})

export default router
