import { onScopeDispose } from 'vue'

export function isSearchHotkey(event: KeyboardEvent): boolean {
  return (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)
}

/** 全局快捷键：绑定在 window 上，作用域销毁时自动解绑。 */
export function useHotkey(
  matcher: (event: KeyboardEvent) => boolean,
  handler: (event: KeyboardEvent) => void
) {
  const listener = (event: KeyboardEvent) => {
    if (matcher(event)) handler(event)
  }
  window.addEventListener('keydown', listener)
  onScopeDispose(() => window.removeEventListener('keydown', listener))
}
