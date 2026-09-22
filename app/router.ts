import { createRouter, createWebHistory } from 'vue-router'

// pages 目录即路由：./pages/tool/bmr.vue → /tool/bmr；index.vue → /
const pages = import.meta.glob<{ default: unknown }>('./pages/**/*.vue')

const routes = Object.entries(pages).map(([key, loader]) => {
  const path = key.replace('./pages', '').replace(/\.vue$/, '') === '/index'
    ? '/'
    : key.replace('./pages', '').replace(/\.vue$/, '')
  return {
    path,
    component: loader,
    meta: { layout: path.startsWith('/tool/') ? 'tool' : 'default' }
  }
})

export const DEFAULT_TITLE = 'ToolBox · 在线工具箱'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...routes,
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
})

router.afterEach((to) => {
  document.title = to.path === '/about' ? '关于 · ToolBox' : DEFAULT_TITLE
})

export default router
