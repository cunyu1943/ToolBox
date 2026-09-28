import { computed, readonly, ref } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'

const THEME_KEY = 'toolbox:theme'
/** @nuxt/ui 的 vue-plugin 安装时会调用 @vueuse 的 useDark() 来切换 .dark 类，
 *  该键必须写入与我们解析一致的结果，否则两套逻辑会互相覆盖。 */
const VUEUSE_DARK_KEY = 'vueuse-color-scheme'
const ORDER: ThemeMode[] = ['system', 'light', 'dark']

const media = window.matchMedia('(prefers-color-scheme: dark)')

function readStoredMode(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* 隐私模式下 localStorage 不可用，退回跟随系统 */
  }
  return 'system'
}

const mode = ref<ThemeMode>(readStoredMode())

function resolveDark(): boolean {
  return mode.value === 'dark' || (mode.value === 'system' && media.matches)
}

function apply() {
  const dark = resolveDark()
  const el = document.documentElement
  el.classList.toggle('dark', dark)
  el.style.colorScheme = dark ? 'dark' : 'light'
  try {
    localStorage.setItem(VUEUSE_DARK_KEY, dark ? 'dark' : 'light')
  } catch {
    /* 忽略写入失败，主题本身仍生效 */
  }
}

function setMode(next: ThemeMode) {
  mode.value = next
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    /* 忽略写入失败 */
  }
  apply()
}

function cycle() {
  setMode(ORDER[(ORDER.indexOf(mode.value) + 1) % ORDER.length])
}

// 「跟随系统」下系统偏好变化时实时重算；用户显式选择时不响应
media.addEventListener('change', () => {
  if (mode.value === 'system') apply()
})

apply()

export function useTheme() {
  return {
    mode: readonly(mode),
    isDark: computed(resolveDark),
    label: computed(() => ({ system: '跟随系统', light: '明亮', dark: '黑暗' })[mode.value]),
    setMode,
    cycle
  }
}
