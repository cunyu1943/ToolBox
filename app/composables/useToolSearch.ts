import { tools, categories } from '~/utils/tools'
import type { ToolMeta } from '~/types'

/**
 * 首页搜索 + 分类筛选逻辑。
 * - query：搜索关键词（匹配名称 / 描述 / 关键词）
 * - category：当前分类，'全部' 表示不过滤
 * 结果用 computed 缓存，纯前端同步过滤，无副作用。
 */
export function useToolSearch() {
  // query 提升为跨组件共享状态：头部搜索框与首页搜索框联动同一份关键词
  const query = useState('calc-search-query', () => '')
  const category = ref<'全部' | ToolMeta['category']>('全部')

  const filtered = computed(() => {
    const kw = query.value.trim().toLowerCase()
    return tools.filter((c) => {
      const matchCategory = category.value === '全部' || c.category === category.value
      if (!matchCategory) return false
      if (!kw) return true
      const haystack = [c.name, c.desc, c.key, ...c.keywords].join(' ').toLowerCase()
      return haystack.includes(kw)
    })
  })

  return {
    query,
    category,
    categories: ['全部', ...categories] as const,
    filtered
  }
}
