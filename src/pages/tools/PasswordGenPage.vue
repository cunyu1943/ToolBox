<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  DEFAULT_SYMBOLS,
  MAX_LENGTH,
  MIN_LENGTH,
  SIMILAR_CHARS,
  classLabel,
  defaultPasswordOptions,
  generateMany,
  generatePassword,
  powerOfTen,
  yearsLabel as yearsLabelOf,
  type CharClassName,
  type PasswordOptions
} from '~/tools/password-gen'
import { useStored } from '~/composables/useStored'

const stored = useStored<PasswordOptions>('tool.password.options', {
  ...defaultPasswordOptions,
  enabled: { ...defaultPasswordOptions.enabled }
})
const batch = useStored('tool.password.batch', 1)
const nonce = ref(0)

const length = computed<number>({
  get: () => stored.value.length,
  set: (value) => {
    stored.value.length = Math.min(Math.max(Math.trunc(Number(value) || 0), MIN_LENGTH), MAX_LENGTH)
  }
})

const classKeys: { key: CharClassName; hint: string }[] = [
  { key: 'lower', hint: 'a–z' },
  { key: 'upper', hint: 'A–Z' },
  { key: 'digits', hint: '0–9' },
  { key: 'symbols', hint: '自定义可见符号' }
]

const presets = [12, 16, 20, 32, 64]
const batchItems = [1, 3, 5, 10, 20, 50].map((count) => ({ label: `${count} 条`, value: count }))

const single = computed(() => {
  void nonce.value
  return generatePassword(stored.value)
})
const many = computed(() => {
  void nonce.value
  return batch.value > 1 ? generateMany(stored.value, batch.value).filter((item) => item.ok) : []
})

const scoreColor = computed(() => {
  const score = single.value.strength.score
  if (score <= 1) return 'bg-error'
  if (score === 2) return 'bg-warning'
  if (score === 3) return 'bg-success'
  return 'bg-primary'
})
const scoreBadge = computed(() => {
  const score = single.value.strength.score
  if (score <= 1) return 'error' as const
  if (score === 2) return 'warning' as const
  return 'success' as const
})

const yearsLabel = computed(() => yearsLabelOf(single.value.strength.yearsLog10))

function regenerate() {
  nonce.value += 1
}

function resetOptions() {
  stored.value = {
    ...defaultPasswordOptions,
    enabled: { ...defaultPasswordOptions.enabled }
  }
  batch.value = 1
}

function toggleAllClasses(enabled: boolean) {
  stored.value.enabled = { lower: enabled, upper: enabled, digits: enabled, symbols: enabled }
}
</script>

<template>
  <ToolShell tool-id="password-gen">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="flex items-start gap-3">
          <p
            v-if="single.ok"
            class="min-w-0 flex-1 break-all font-mono text-xl leading-relaxed text-highlighted sm:text-2xl"
            aria-live="polite"
          >
            {{ single.value }}
          </p>
          <p v-else class="min-w-0 flex-1 text-lg text-error">{{ single.error }}</p>
          <div class="flex shrink-0 items-center gap-2">
            <UButton
              icon="lucide:refresh-cw"
              label="换一个"
              color="neutral"
              variant="outline"
              :disabled="!single.ok"
              @click="regenerate"
            />
            <CopyButton :text="single.value" :disabled="!single.ok" />
          </div>
        </div>

        <div v-if="single.ok" class="flex items-center gap-2">
          <span class="flex flex-1 items-center gap-1.5" aria-hidden="true">
            <span
              v-for="step in 4"
              :key="step"
              class="h-1.5 flex-1 rounded-full transition-colors"
              :class="step <= single.strength.score + 1 ? scoreColor : 'bg-[var(--ui-border)]'"
            />
          </span>
          <UBadge :color="scoreBadge" variant="subtle" :label="`强度：${single.strength.label}`" />
        </div>

        <div v-if="single.ok" class="flex flex-wrap items-center gap-2 text-xs">
          <UBadge :label="`长度 ${single.length}`" color="neutral" variant="subtle" />
          <UBadge :label="`字符集 ${single.poolSize}`" color="neutral" variant="subtle" />
          <UBadge :label="`熵 ${single.entropyBits.toFixed(1)} bit`" color="neutral" variant="subtle" />
          <UBadge :label="`平均尝试 ${powerOfTen(single.strength.guessesLog10)} 次`" color="neutral" variant="subtle" />
          <UBadge :label="`离线破解 ≈ ${yearsLabel}`" color="neutral" variant="subtle" />
        </div>
        <p v-if="single.ok" class="text-xs text-dimmed">{{ single.strength.hint }}</p>
      </section>

      <div class="flex flex-col gap-4 rounded-xl border border-default bg-elevated p-4">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-muted">长度</span>
            <span class="font-mono text-sm text-highlighted">{{ length }}</span>
          </div>
          <input v-model.number="length" type="range" :min="MIN_LENGTH" :max="MAX_LENGTH" class="w-full accent-[var(--ui-primary)]" aria-label="密码长度" />
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-for="preset in presets"
              :key="preset"
              :label="String(preset)"
              size="xs"
              :color="length === preset ? 'primary' : 'neutral'"
              :variant="length === preset ? 'soft' : 'outline'"
              @click="length = preset"
            />
            <input
              v-model.number="length"
              type="number"
              :min="MIN_LENGTH"
              :max="MAX_LENGTH"
              class="h-8 w-20 rounded-lg border border-default px-2 font-mono text-sm text-default outline-none focus:border-primary/50"
              aria-label="精确长度"
            />
          </div>
        </div>

        <ul class="grid gap-2 sm:grid-cols-2">
          <li v-for="item in classKeys" :key="item.key" class="flex items-center gap-2.5">
            <USwitch v-model="stored.enabled[item.key]" size="sm" :aria-label="classLabel(item.key)" />
            <span class="text-sm text-muted">{{ classLabel(item.key) }}</span>
            <span class="text-xs text-dimmed">{{ item.hint }}</span>
          </li>
        </ul>
        <div class="flex flex-wrap items-center gap-2">
          <UButton label="全部启用" size="xs" color="neutral" variant="outline" @click="toggleAllClasses(true)" />
          <UButton label="全部关闭" size="xs" color="neutral" variant="ghost" @click="toggleAllClasses(false)" />
        </div>

        <div class="flex flex-col gap-3">
          <label class="flex items-center gap-2.5">
            <USwitch v-model="stored.avoidSimilar" size="sm" aria-label="避免易混淆字符" />
            <span class="text-sm text-muted">避免易混淆字符</span>
            <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs text-dimmed">{{ SIMILAR_CHARS }}</code>
          </label>
          <label class="flex items-center gap-2.5">
            <USwitch v-model="stored.everyClass" size="sm" aria-label="每类至少一个" />
            <span class="text-sm text-muted">每类至少出现一次（已洗牌，位置不固定）</span>
          </label>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex min-w-0 flex-col gap-1.5">
            <span class="text-sm text-muted">符号集合</span>
            <UInput
              v-model="stored.symbols"
              size="lg"
              spellcheck="false"
              autocomplete="off"
              :placeholder="DEFAULT_SYMBOLS"
              :ui="{ base: 'font-mono text-sm' }"
            />
          </label>
          <label class="flex min-w-0 flex-col gap-1.5">
            <span class="text-sm text-muted">额外排除的字符</span>
            <UInput
              v-model="stored.exclude"
              size="lg"
              spellcheck="false"
              autocomplete="off"
              placeholder="如你的姓名首字母、易错的 6g"
              :ui="{ base: 'font-mono text-sm' }"
            />
          </label>
        </div>

        <div class="flex flex-wrap items-end gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-sm text-muted">批量条数</span>
            <USelect
              v-model="batch"
              :items="batchItems"
              size="lg"
              class="w-28"
              aria-label="批量条数"
            />
          </label>
          <UButton icon="lucide:eraser" label="恢复默认" color="neutral" variant="ghost" @click="resetOptions" />
        </div>

        <ul v-if="many.length" class="flex flex-col overflow-hidden rounded-xl border border-default">
          <li
            v-for="(item, index) in many"
            :key="`${nonce}-${index}`"
            class="flex items-center gap-3 border-b border-default px-3 py-2 last:border-b-0"
          >
            <span class="w-8 shrink-0 text-xs text-dimmed">{{ index + 1 }}</span>
            <code class="min-w-0 flex-1 break-all font-mono text-sm text-default">{{ item.value }}</code>
            <CopyButton :text="item.value" label="" size="xs" />
          </li>
        </ul>
      </div>

      <p class="text-xs leading-relaxed text-dimmed">
        随机源是浏览器内置的 <code class="rounded bg-elevated px-1 py-0.5">crypto.getRandomValues()</code>（CSPRNG），
        取数用拒绝采样消除取模偏差，洗牌用 Fisher–Yates，全程不产生任何可预测序列，也不联网。
        熵按「长度 × log₂(字符集)」计算，是空间上界：勾选「每类至少出现一次」会略微减少真实熵。
        破解耗时假设攻击者离线且每秒尝试 10¹¹ 次，在线撞库实际会更慢，但别把这条曲线当保底。
      </p>
    </div>
  </ToolShell>
</template>
