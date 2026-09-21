/**
 * 共享剪贴板复制：成功/失败均通过全局 toast 给出可见反馈。
 * 注意：useToast 依赖 setup 上下文，本函数必须在 <script setup> 顶层调用。
 */
export function useCopy() {
  const toast = useToast()

  async function copy(text: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: '已复制到剪贴板', color: 'success', icon: 'i-lucide-circle-check' })
    } catch {
      toast.add({ title: '复制失败，请手动选择复制', color: 'error', icon: 'i-lucide-circle-x' })
    }
  }

  return { copy }
}
