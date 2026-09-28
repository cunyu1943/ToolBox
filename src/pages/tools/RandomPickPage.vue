<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  RANDOM_DEMO_LIST,
  RANDOM_MODES,
  makeRng,
  runRandom,
  seedFromText,
  splitList,
  type RandomMode,
  type RandomResult,
  type RandomSource
} from '~/tools/random-pick'
import { useStored } from '~/composables/useStored'

const SOURCES: { label: string; value: RandomSource }[] = [
  { label: '加密级（crypto.getRandomValues）', value: 'crypto' },
  { label: '浏览器默认（Math.random）', value: 'math' },
  { label: '固定种子（可复现）', value: 'seed' }
]

const mode = useStored<RandomMode>('tool.random-pick.mode', 'pick')
const min = useStored('tool.random-pick.min', 1)
const max = useStored('tool.random-pick.max', 100)
const count = useStored('tool.random-pick.count', 1)
const sides = useStored('tool.random-pick.sides', 6)
const source = useStored<RandomSource>('tool.random-pick.source', 'crypto')
const seedText = useStored('tool.random-pick.seed', 'toolbox')
const listText = useStored('tool.random-pick.list', RANDOM_DEMO_LIST.join('\n'))
const withReplacement = useStored('tool.random-pick.replacement', false)

const result = ref<RandomResult | null>(null)
const copied = ref(false)

const items = RANDOM_MODES.map((item) => ({ label: item.label, value: item.value }))
const current = computed(() => RANDOM_MODES.find((item) => item.value === mode.value) ?? RANDOM_MODES[0]!)
const needsRange = computed(() => mode.value === 'int' || mode.value === 'unique')
const needsList = computed(() => mode.value === 'pick' || mode.value === 'shuffle')
const needsCount = computed(() => mode.value !== 'shuffle')
const listSize = computed(() => splitList(listText.value ?? '').length)

function run(): void {
  const rng = makeRng(source.value, seedFromText(seedText.value ?? ''))
  result.value = runRandom({
    mode: mode.value,
    min: min.value ?? 0,
    max: max.value ?? 0,
    count: count.value ?? 1,
    listText: listText.value ?? '',
    sides: sides.value ?? 6,
    withReplacement: withReplacement.value,
    rng
  })
}

async function copyResult(): Promise<void> {
  const text = result.value?.outputs.join('\n')
  if (!text) return
  await navigator.clipboard.writeText(text)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <ToolShell tool-id="random-pick">
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="mode" :items="items" size="lg" class="w-48" aria-label="模式" />
      <USelect v-model="source" :items="SOURCES" size="lg" class="w-72" aria-label="随机源" />
      <UFormField v-if="source === 'seed'" label="种子（同种子同结果）" class="w-40">
        <UInput v-model="seedText" size="lg" class="w-full" />
      </UFormField>
    </div>

    <p class="text-xs text-muted">{{ current.hint }}</p>

    <div class="flex flex-wrap items-end gap-2">
      <template v-if="needsRange">
        <UFormField label="最小值" class="w-32">
          <UInputNumber v-model="min" :step="1" size="lg" class="w-full" :controls="false" />
        </UFormField>
        <UFormField label="最大值" class="w-32">
          <UInputNumber v-model="max" :step="1" size="lg" class="w-full" :controls="false" />
        </UFormField>
      </template>
      <UFormField v-if="mode === 'dice'" label="骰子面数" class="w-32">
        <UInputNumber v-model="sides" :min="2" :max="1000" :step="1" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UFormField v-if="needsCount" :label="mode === 'coin' ? '抛几次' : mode === 'dice' ? '掷几枚' : '取几个 / 抽几人'" class="w-32">
        <UInputNumber v-model="count" :min="1" :step="1" size="lg" class="w-full" :controls="false" />
      </UFormField>
      <UCheckbox v-if="mode === 'pick'" v-model="withReplacement" label="有放回（同一人可中多次）" />
    </div>

    <UFormField v-if="needsList" :label="`名单（每行一个，当前 ${listSize} 项）`">
      <UTextarea v-model="listText" :rows="6" auto-resize class="w-full font-mono" placeholder="张三&#10;李四&#10;王五" />
    </UFormField>

    <div class="flex flex-wrap items-center gap-2">
      <UButton icon="lucide:play" label="开始抽取" size="lg" @click="run" />
      <UButton
        v-if="result?.ok"
        :icon="copied ? 'lucide:check' : 'lucide:copy'"
        label="复制结果"
        color="neutral"
        variant="soft"
        @click="copyResult"
      />
      <UButton
        v-if="result?.ok"
        icon="lucide:refresh-cw"
        label="再来一次"
        color="neutral"
        variant="ghost"
        @click="run"
      />
    </div>

    <UAlert
      v-if="result && !result.ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="无法生成"
      :description="result.error"
    />

    <template v-if="result?.ok">
      <p class="text-sm text-highlighted">{{ result.summary }}</p>
      <ol class="flex flex-wrap gap-2">
        <li
          v-for="(item, index) in result.outputs"
          :key="`${item}-${index}`"
          class="rounded-lg border border-default bg-default px-3 py-1.5 font-mono text-sm text-default"
        >
          {{ item }}
        </li>
      </ol>
      <ul v-if="result.notes.length" class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in result.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      默认随机源是 <code class="font-mono">crypto.getRandomValues</code>，不可预测；要「结果可复核」就切到固定种子，
      同一种子同一次序。名单与输入只存在本机 localStorage。
    </p>
  </ToolShell>
</template>
