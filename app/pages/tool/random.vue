<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">随机整数</h2>
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <UInput v-model.number="minN" type="number" size="sm" class="w-24" />
        <span class="text-slate-400">到</span>
        <UInput v-model.number="maxN" type="number" size="sm" class="w-24" />
        <span class="text-slate-400">共</span>
        <UInput v-model.number="countN" type="number" size="sm" class="w-20" />
        <span class="text-slate-400">个</span>
        <UButton label="生成" color="primary" @click="genInts" />
      </div>
      <p v-if="intErr" class="text-sm text-red-500">{{ intErr }}</p>
      <p v-else-if="ints.length" class="font-mono text-lg text-vue-600 dark:text-vue-300">{{ ints.join('  ') }}</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">抽签（不重复抽取）</h2>
      <UTextarea v-model="candidates" :rows="4" placeholder="候选项每行一个，如：&#10;张三&#10;李四&#10;王五" autoresize :maxrows="10" class="w-full text-sm" />
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <span class="text-slate-400">抽</span>
        <UInput v-model.number="drawCount" type="number" size="sm" class="w-20" />
        <span class="text-slate-400">名（当前 {{ candidateList.length }} 个候选）</span>
        <UButton label="开始抽签" color="primary" @click="doDraw" />
      </div>
      <p v-if="drawResult.length" class="text-lg font-semibold text-vue-600 dark:text-vue-300">{{ drawResult.join('、') }}</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">掷骰子 / 抛硬币</h2>
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <UButton label="掷 1 个六面骰" color="neutral" variant="soft" @click="diceResult = rollDice(1)" />
        <UButton label="掷 3 个六面骰" color="neutral" variant="soft" @click="diceResult = rollDice(3)" />
        <UButton label="掷 1 个二十面骰" color="neutral" variant="soft" @click="diceResult = rollDice(1, 20)" />
        <UButton label="抛 1 枚硬币" color="neutral" variant="soft" @click="coinResult = flipCoins(1)" />
        <UButton label="抛 5 枚硬币" color="neutral" variant="soft" @click="coinResult = flipCoins(5)" />
      </div>
      <p v-if="diceResult.length" class="font-mono text-lg text-vue-600 dark:text-vue-300">🎲 {{ diceResult.join(' ') }}（合计 {{ diceResult.reduce((a, b) => a + b, 0) }}）</p>
      <p v-if="coinResult.length" class="font-mono text-lg text-vue-600 dark:text-vue-300">🪙 {{ coinResult.join(' ') }}</p>
    </GlassCard>
    <p class="text-xs text-slate-400">随机数由浏览器 crypto 级 Math.random 生成，本地完成、不上传任何数据。</p>
  </div>
</template>

<script setup lang="ts">
import { flipCoins, pickUnique, randInt, rollDice } from '~/utils/random-tool'

definePageMeta({ layout: 'tool' })

const minN = ref(1)
const maxN = ref(100)
const countN = ref(1)
const ints = ref<number[]>([])
const intErr = ref('')

function genInts() {
  intErr.value = ''
  const n = Math.max(1, Math.floor(countN.value || 1))
  if (!Number.isFinite(minN.value) || !Number.isFinite(maxN.value)) {
    intErr.value = '请输入有效的上下界'
    ints.value = []
    return
  }
  ints.value = Array.from({ length: n }, () => randInt(minN.value, maxN.value))
}

const candidates = ref('')
const drawCount = ref(1)
const drawResult = ref<string[]>([])

const candidateList = computed(() =>
  candidates.value.split(/\r\n|\r|\n/).map((s) => s.trim()).filter(Boolean)
)

function doDraw() {
  drawResult.value = pickUnique(candidateList.value, Math.max(1, Math.floor(drawCount.value || 1)))
}

const diceResult = ref<number[]>([])
const coinResult = ref<string[]>([])
</script>
