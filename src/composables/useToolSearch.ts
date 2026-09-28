import { computed, ref } from 'vue'
import type { CategoryId, ToolDefinition } from '~/tools/registry'
import { tools } from '~/tools/registry'

export type CategoryFilter = CategoryId | 'all'

export interface ScoredTool extends ToolDefinition {
  score: number
}

const normalize = (value: string): string => value.toLowerCase().trim()

/** 单条查询词的打分：完全同名 > 前缀 > 包含 > 关键词 > 描述。0 表示不匹配。 */
function scoreToken(tool: ToolDefinition, token: string): number {
  const name = normalize(tool.name)
  const id = tool.id
  const description = normalize(tool.description)
  const keywords = tool.keywords.map(normalize)

  if (name === token || id === token) return 100
  if (name.startsWith(token) || id.startsWith(token)) return 90
  if (name.includes(token) || id.includes(token)) return 75
  if (keywords.includes(token)) return 65
  if (keywords.some((keyword) => keyword.startsWith(token))) return 55
  if (keywords.some((keyword) => keyword.includes(token))) return 45
  if (description.includes(token)) return 25
  return 0
}

export function searchTools(query: string, filter: CategoryFilter = 'all'): ScoredTool[] {
  const pool = filter === 'all' ? tools : tools.filter((tool) => tool.category === filter)
  const tokens = normalize(query).split(/\s+/).filter(Boolean)

  if (!tokens.length) return pool.map((tool) => ({ ...tool, score: 0 }))

  return pool
    .map((tool) => {
      const scores = tokens.map((token) => scoreToken(tool, token))
      if (scores.some((value) => value === 0)) return { tool: null as null | ScoredTool }
      return { tool: { ...tool, score: scores.reduce((a, b) => a + b, 0) } }
    })
    .filter((entry): entry is { tool: ScoredTool } => entry.tool !== null)
    .sort((a, b) => b.tool.score - a.tool.score || a.tool.name.localeCompare(b.tool.name, 'zh-CN'))
    .map((entry) => entry.tool)
}

export function useToolSearch(initialFilter: CategoryFilter = 'all') {
  const query = ref('')
  const filter = ref<CategoryFilter>(initialFilter)

  const results = computed(() => searchTools(query.value, filter.value))
  const hasQuery = computed(() => normalize(query.value).length > 0)

  return { query, filter, results, hasQuery }
}
