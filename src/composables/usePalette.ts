import { ref } from 'vue'

/** 命令面板的开关与查询词跨组件共享（顶栏按钮、首页搜索框、全局快捷键），故为模块级单例。 */
const open = ref(false)
const searchTerm = ref('')

export function usePalette() {
  function show() {
    open.value = true
  }
  function hide() {
    open.value = false
  }
  function toggle() {
    open.value = !open.value
  }

  return {
    /** 暴露原始 ref，方便 `v-model:open` / `v-model:search-term` 双向绑定 */
    open,
    searchTerm,
    show,
    hide,
    toggle
  }
}
