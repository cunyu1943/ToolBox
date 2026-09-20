<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <NumberField v-model="base" label="缴费基数" unit="元" :min="0" />
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">
          公积金缴存比例：<span class="tabular-nums">{{ fundRate }}%</span>
        </label>
        <USlider v-model="fundRate" :min="5" :max="12" :step="0.5" />
        <p class="mt-1 text-xs text-slate-400">个人与单位通常同档，常见区间 5%~12%。</p>
      </div>
    </GlassCard>

    <GlassCard custom-class="p-5">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        缴纳明细
      </h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-slate-400">
            <th class="py-1 font-medium">项目</th>
            <th class="py-1 text-right font-medium">个人</th>
            <th class="py-1 text-right font-medium">单位</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200/60 dark:divide-white/10">
          <tr v-for="r in result.rows" :key="r.label">
            <td class="py-1.5 text-slate-600 dark:text-slate-300">{{ r.label }}</td>
            <td class="py-1.5 text-right tabular-nums text-slate-800 dark:text-slate-100">{{ money(r.personal) }}</td>
            <td class="py-1.5 text-right tabular-nums text-slate-800 dark:text-slate-100">{{ money(r.company) }}</td>
          </tr>
          <tr class="font-semibold">
            <td class="py-1.5 text-slate-700 dark:text-slate-200">合计</td>
            <td class="py-1.5 text-right tabular-nums text-vue-700 dark:text-vue-300">{{ money(result.personalTotal) }}</td>
            <td class="py-1.5 text-right tabular-nums text-vue-700 dark:text-vue-300">{{ money(result.companyTotal) }}</td>
          </tr>
        </tbody>
      </table>
    </GlassCard>

    <ResultPanel
      title="月度估算"
      :value="money(result.takeHome) + ' 元'"
      value-label="扣除个人缴纳后（未计个税）"
      :rows="summaryRows"
      note="比例为大陆常见档位，实际缴纳以参保地最新政策与单位基数上下限为准。"
      :copy-text="copyText"
    />
  </div>
</template>

<script setup lang="ts">
import { computeInsurance } from '~/utils/social-insurance'
import { formatNumber } from '~/utils/number'

definePageMeta({ layout: 'tool' })

const base = ref<number | null>(10000)
const fundRate = ref(12)

function money(v: number): string {
  return formatNumber(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const result = computed(() => computeInsurance(base.value ?? 0, fundRate.value))

const summaryRows = computed(() => [
  { label: '个人缴纳合计', value: `${money(result.value.personalTotal)} 元` },
  { label: '单位缴纳合计', value: `${money(result.value.companyTotal)} 元` },
  { label: '个人 + 单位总计', value: `${money(result.value.personalTotal + result.value.companyTotal)} 元` }
])

const copyText = computed(() =>
  [
    `缴费基数：${money(base.value ?? 0)} 元`,
    ...result.value.rows.map((r) => `${r.label}：个人 ${money(r.personal)} / 单位 ${money(r.company)}`),
    `个人合计：${money(result.value.personalTotal)} 元`,
    `单位合计：${money(result.value.companyTotal)} 元`
  ].join('\n')
)
</script>
