import { ref, watch, type Ref } from 'vue'

/** 与站点其它持久化键同一命名空间，见 index.html 的 `toolbox:theme` */
const PREFIX = 'toolbox:'

/**
 * 把工具的输入 / 选项存进 localStorage。
 * 返回普通 Ref，因此在 `<script setup>` 里用 `x.value`、模板里直接写 `x`。
 */
export function useStored<T>(key: string, initial: T): Ref<T> {
  const fullKey = PREFIX + key

  const read = (): T => {
    try {
      const raw = localStorage.getItem(fullKey)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  }

  const value = ref(read()) as Ref<T>

  watch(
    value,
    (next) => {
      try {
        localStorage.setItem(fullKey, JSON.stringify(next))
      } catch {
        /* 无存储权限（隐私模式 / 配额）时退化为纯内存状态 */
      }
    },
    { deep: true }
  )

  return value
}
