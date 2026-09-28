import { onScopeDispose, ref } from 'vue'

/**
 * 剪贴板复制。
 * 后台标签页 / 非安全上下文里 `navigator.clipboard.writeText` 可能永远不 settle，
 * 因此加了超时竞速，失败或超时后回退到 execCommand，保证 UI 一定会给出反馈。
 */
export function useCopy(resetAfter = 1600, raceMs = 800) {
  const copied = ref(false)
  const failed = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function fallback(text: string): boolean {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'
    document.body.appendChild(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    area.remove()
    return ok
  }

  async function copy(text: string): Promise<boolean> {
    if (!text) return false
    const withTimeout = new Promise<boolean>((resolve) => {
      const id = setTimeout(() => resolve(false), raceMs)
      navigator.clipboard
        ?.writeText(text)
        .then(() => resolve(true))
        .catch(() => resolve(false))
        .finally(() => clearTimeout(id))
    })

    const ok = (await withTimeout) || fallback(text)
    copied.value = ok
    failed.value = !ok
    if (timer) clearTimeout(timer)
    if (ok) timer = setTimeout(() => (copied.value = false), resetAfter)
    return ok
  }

  onScopeDispose(() => timer && clearTimeout(timer))

  return { copied, failed, copy }
}
