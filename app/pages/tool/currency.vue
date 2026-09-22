<template>
  <div class="space-y-4">
    <!-- 换算主区 -->
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="amount" label="金额" :min="0" />
      <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">从</label>
          <USelect v-model="from" :items="currencyOptions" class="w-full" />
        </div>
        <UButton
          icon="i-lucide-arrow-left-right"
          color="neutral"
          variant="soft"
          square
          aria-label="交换币种"
          class="mb-0.5"
          @click="swap"
        />
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">到</label>
          <USelect v-model="to" :items="currencyOptions" class="w-full" />
        </div>
      </div>
    </GlassCard>

    <ResultPanel
      v-if="converted !== null"
      title="换算结果"
      :value="resultText"
      :value-label="`${amount ?? 0} ${from} =`"
      :rows="[{ label: '所用汇率', value: `1 ${from} = ${roundStr(ratePerFromTo)} ${to}` }]"
      :note="`汇率仅供参考 · 更新于 ${store.updatedAt}`"
      :copy-text="`${amount ?? 0} ${from} = ${resultText}`"
    />

    <!-- 可编辑汇率表 -->
    <GlassCard custom-class="p-5">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="font-medium">汇率设置（1 单位折合 CNY）</h3>
        <UButton label="恢复默认" icon="i-lucide-rotate-ccw" color="neutral" variant="ghost" size="sm" @click="store.reset()" />
      </div>
      <div class="space-y-2">
        <div v-for="c in store.currencies" :key="c.code" class="flex items-center gap-3">
          <span class="w-12 font-mono text-sm">{{ c.code }}</span>
          <span class="flex-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ c.name }}</span>
          <UInput
            :model-value="String(c.rateToCny)"
            type="number"
            size="sm"
            class="w-28"
            @update:model-value="(v: string) => store.setRate(c.code, Number(v))"
          />
        </div>
      </div>
      <div class="mt-4 flex items-center gap-3">
        <label class="text-sm text-slate-500 dark:text-slate-400">最后更新</label>
        <UInput v-model="updatedModel" type="date" size="sm" class="w-44" />
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { useCurrencyStore } from '~/stores/currency'
import { formatCurrency } from '~/utils/number'


const store = useCurrencyStore()

const amount = ref<number | null>(100)
const from = ref('USD')
const to = ref('CNY')

const currencyOptions = computed(() => store.currencies.map((c) => ({ label: `${c.code} ${c.name}`, value: c.code })))

const converted = computed(() => store.convert(amount.value ?? 0, from.value, to.value))
const ratePerFromTo = computed(() => store.convert(1, from.value, to.value) ?? 0)

function roundStr(n: number): string {
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 6 })
}

const resultText = computed(() => {
  if (converted.value === null) return ''
  const c = store.byCode(to.value)
  return formatCurrency(converted.value, to.value) + (c ? ` (${c.symbol})` : '')
})

function swap() {
  ;[from.value, to.value] = [to.value, from.value]
}

const updatedModel = computed({
  get: () => store.updatedAt,
  set: (v: string) => store.setUpdatedAt(v)
})
</script>
