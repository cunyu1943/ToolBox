import { createApp } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import router from './router'
import './assets/css/main.css'

// @nuxt/ui/vue-plugin 只有类型入口，运行时由 vite.config.ts 里的 @nuxt/ui/vite 插件解析
createApp(App).use(router).use(ui).mount('#app')
