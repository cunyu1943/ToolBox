<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  ATOM_GROUPS,
  ATOM_LABEL,
  KIN_PRESETS,
  KIN_TABLE,
  parseChain,
  renderChain,
  resolveChain
} from '~/tools/kinship'
import { useStored } from '~/composables/useStored'

const chainText = useStored('tool.kinship.chain', '爸爸的哥哥的儿子')
const lookup = ref('')

const parsed = computed(() => parseChain(chainText.value ?? ''))
const hit = computed(() => (parsed.value.ok ? resolveChain(parsed.value.atoms) : null))

const rows = computed(() => {
  if (!parsed.value.ok || !hit.value) return []
  return [
    { label: '规范关系链', value: hit.value.atoms.length ? renderChain(hit.value.atoms) : '自己' },
    { label: '我称呼对方', value: hit.value.terms.join(' / ') },
    { label: '对方称呼我', value: hit.value.reverse.join(' / ') }
  ]
})

function appendWord(word: string): void {
  const current = (chainText.value ?? '').trim()
  chainText.value = current ? `${current}的${word}` : word
}

function removeLast(): void {
  const parts = (chainText.value ?? '').split('的').filter(Boolean)
  parts.pop()
  chainText.value = parts.join('的')
}

function clear(): void {
  chainText.value = ''
}

const lookupResults = computed(() => {
  const keyword = lookup.value.trim()
  if (!keyword) return []
  return Object.entries(KIN_TABLE)
    .filter(([key, entry]) => key !== '' && (entry.terms.some((term) => term.includes(keyword)) || entry.reverse.some((term) => term.includes(keyword))))
    .slice(0, 40)
    .map(([key, entry]) => ({ key, entry }))
})
</script>

<template>
  <ToolShell tool-id="kinship">
    <UFormField label="关系链（用「的」连接，也可直接写一串）">
      <UInput v-model="chainText" size="lg" class="w-full font-mono" placeholder="爸爸的哥哥的儿子" />
    </UFormField>

    <div class="flex flex-wrap gap-1.5">
      <div v-for="group in ATOM_GROUPS" :key="group.title" class="flex flex-wrap items-center gap-1">
        <span class="text-xs text-dimmed">{{ group.title }}</span>
        <UButton
          v-for="atom in group.atoms"
          :key="atom"
          :label="ATOM_LABEL[atom]"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="appendWord(ATOM_LABEL[atom])"
        />
      </div>
      <UButton icon="lucide:undo-2" label="退一步" size="xs" color="neutral" variant="ghost" @click="removeLast" />
      <UButton icon="lucide:eraser" label="清空" size="xs" color="neutral" variant="ghost" @click="clear" />
    </div>

    <div class="flex flex-wrap gap-1">
      <UButton
        v-for="preset in KIN_PRESETS"
        :key="preset.label"
        :label="preset.label"
        size="xs"
        color="neutral"
        variant="outline"
        @click="chainText = preset.chain"
      />
    </div>

    <UAlert
      v-if="!parsed.ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="关系链无法解析"
      :description="parsed.error"
    />
    <UAlert
      v-else-if="!hit"
      color="warning"
      variant="subtle"
      icon="lucide:triangle-alert"
      title="这个组合不在内置关系模型里"
      description="已覆盖四类：直系血亲四代、同胞及堂表兄弟姐妹、配偶与姻亲（公婆/岳家/妯娌/连襟）、侄甥与孙辈。再婚、收养、表亲的下一代等分支需要地方性叫法，未收录。"
    />

    <template v-if="parsed.ok && hit">
      <p class="text-3xl font-bold text-highlighted">{{ hit.terms.join(' / ') }}</p>
      <p v-if="hit.ambiguous" class="text-xs text-warning">
        <UIcon name="lucide:circle-alert" class="size-3.5 align-[-2px]" />
        该组合存在多解：中文称谓区分长幼与性别，请按下表再确认。
      </p>
      <dl class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3">
        <div v-for="row in rows" :key="row.label" class="flex flex-col">
          <dt class="text-xs text-muted">{{ row.label }}</dt>
          <dd class="font-mono text-sm text-default">{{ row.value }}</dd>
        </div>
      </dl>
      <p v-if="hit.note" class="text-xs text-muted">· {{ hit.note }}</p>
      <p v-if="parsed.segments.length" class="text-xs text-dimmed">
        拆解：{{ parsed.segments.join(' → ') }}
      </p>
    </template>

    <section class="flex flex-col gap-2">
      <h2 class="text-sm font-medium text-highlighted">反向速查（按称谓查关系链）</h2>
      <UInput v-model="lookup" size="lg" class="w-full sm:w-64" placeholder="输入称谓，如 堂兄、妯娌、侄女" />
      <ul v-if="lookupResults.length" class="flex flex-col gap-1 text-xs">
        <li v-for="item in lookupResults" :key="item.key" class="flex flex-wrap gap-x-3 border-b border-default pb-1">
          <span class="w-28 shrink-0 font-medium text-highlighted">{{ item.entry.terms.join('/') }}</span>
          <span class="w-24 shrink-0 text-muted">对方称我 {{ item.entry.reverse.join('/') }}</span>
          <span class="font-mono text-dimmed">{{ item.key }}</span>
        </li>
      </ul>
      <p v-else-if="lookup.trim()" class="text-xs text-muted">没有匹配的称谓。</p>
      <p v-else class="text-xs text-dimmed">关系链用原子表示：F 爸爸、M 妈妈、S 儿子、D 女儿、HB 哥哥、LB 弟弟、HS 姐姐、LS 妹妹、H 老公、W 老婆。</p>
    </section>

    <p class="text-xs text-dimmed">
      中国亲属称谓分父系/母系、长幼、内外（堂/表/侄/甥），同一人称在不同地区还有别的叫法。
      这里给的是通行口径，不是唯一答案。
    </p>
  </ToolShell>
</template>
