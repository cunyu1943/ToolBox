<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import CopyButton from '~/components/CopyButton.vue'
import { useStored } from '~/composables/useStored'
import {
  INVESTMENT_SAMPLES,
  TIMING_LABELS,
  computeInvestment,
  type ContributionTiming,
  type InvestmentResult
} from '~/tools/investment'

const principal = useStored('tool.investment.principal', 10000)
const annualRatePct = useStored('tool.investment.rate', 8)
const years = useStored('tool.investment.years', 20)
const monthlyContribution = useStored('tool.investment.monthly', 2000)
const timing = useStored<ContributionTiming>('tool.investment.timing', 'end')
const inflationPct = useStored<number | null>('tool.investment.inflation', 2.5)
const target = useStored<number | null>('tool.investment.target', null)

const result = computed<InvestmentResult>(() =>
  computeInvestment({
    principal: principal.value ?? 0,
    annualRatePct: annualRatePct.value ?? 0,
    years: years.value ?? 0,
    monthlyContribution: monthlyContribution.value ?? 0,
    timing: timing.value,
    inflationPct: inflationPct.value ?? null,
    target: target.value ?? null
  })
)
const ok = computed(() => (result.value.ok ? result.value : null))

const money = (value: number): string =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 大数用「万」再看一眼，表格里 8 位数字不容易读 */
const wan = (value: number): string => (value / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

const yearsLabel = (months: number | null): string =>
  months === null ? '—' : `${Math.floor(months / 12)} 年 ${months % 12} 个月`

const copyText = computed(() => {
  const r = ok.value
  if (!r) return ''
  return [
    `期末总资产：${money(r.finalValue)} 元`,
    `累计投入：${money(r.contributed)} 元`,
    `累计收益：${money(r.totalGain)} 元（${r.returnPct}%，${r.multiple} 倍）`,
    r.realValue !== null ? `折算今天购买力：${money(r.realValue)} 元` : '',
    r.monthsToTarget !== null ? `达到目标需要：${yearsLabel(r.monthsToTarget)}` : '',
    r.requiredMonthly !== null ? `期限内达标每月需投：${money(r.requiredMonthly)} 元` : ''
  ]
    .filter(Boolean)
    .join('\n')
})

function fillSample(label: string): void {
  const sample = INVESTMENT_SAMPLES.find((item) => item.label === label)
  if (!sample) return
  principal.value = sample.input.principal
  annualRatePct.value = sample.input.annualRatePct
  years.value = sample.input.years
  monthlyContribution.value = sample.input.monthlyContribution
  timing.value = sample.input.timing
  inflationPct.value = sample.input.inflationPct
  target.value = sample.input.target
}
</script>

<template>
  <ToolShell tool-id="investment">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="初始本金（元）" class="w-40">
        <UInputNumber v-model="principal" :step="1000" :min="0" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="每月定投（元）" class="w-36">
        <UInputNumber v-model="monthlyContribution" :step="500" :min="0" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="预期年化（%）" class="w-32">
        <UInputNumber v-model="annualRatePct" :step="0.5" :min="-100" :max="100" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="年限（年）" class="w-28">
        <UInputNumber v-model="years" :step="1" :min="0" :max="70" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="年化通胀（%）" class="w-32">
        <UInputNumber v-model="inflationPct" :step="0.5" :min="-100" :max="100" size="lg" class="w-full" placeholder="不折现留空" />
      </UFormField>
      <UFormField label="目标金额（元）" class="w-40">
        <UInputNumber v-model="target" :step="100000" :min="0" size="lg" class="w-full" placeholder="反推需要多久" />
      </UFormField>
      <UButton
        v-for="sample in INVESTMENT_SAMPLES"
        :key="sample.label"
        :label="sample.label"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="fillSample(sample.label)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted">定投时点</span>
      <UButton
        v-for="item in TIMING_LABELS"
        :key="item.value"
        :label="item.label"
        size="xs"
        :color="timing === item.value ? 'primary' : 'neutral'"
        :variant="timing === item.value ? 'subtle' : 'outline'"
        @click="timing = item.value"
      />
      <span class="min-w-0 basis-full text-xs text-dimmed">
        {{ TIMING_LABELS.find((item) => item.value === timing)?.detail }}
      </span>
    </div>

    <UAlert
      v-if="!ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="无法计算"
      :description="result.error"
    />

    <template v-if="ok">
      <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p class="text-xs text-muted">{{ ok.months }} 个月后期末总资产</p>
          <p class="text-4xl font-bold tabular-nums text-highlighted">{{ money(ok.finalValue) }} 元</p>
        </div>
        <div class="flex flex-col gap-1 text-xs">
          <UBadge :label="`累计投入 ${money(ok.contributed)} 元`" color="neutral" variant="ghost" />
          <UBadge :label="`收益 ${money(ok.totalGain)} 元（${ok.returnPct}%）`" color="primary" variant="subtle" />
          <UBadge v-if="ok.realValue !== null" :label="`折合今天 ${money(ok.realValue)} 元`" color="warning" variant="subtle" />
        </div>
      </div>

      <dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <div class="flex gap-1.5">
          <dt class="text-muted">资产倍数</dt>
          <dd class="font-mono text-default">{{ ok.multiple }}×</dd>
        </div>
        <div v-if="ok.ruleOf72Years !== null" class="flex gap-1.5">
          <dt class="text-muted">翻倍用时</dt>
          <dd class="font-mono text-default">72 法则 {{ ok.ruleOf72Years }} 年 / 精确 {{ ok.exactDoublingYears }} 年</dd>
        </div>
        <div v-if="target" class="flex gap-1.5">
          <dt class="text-muted">达标所需时间</dt>
          <dd class="font-mono text-default">{{ yearsLabel(ok.monthsToTarget) }}</dd>
        </div>
        <div v-if="ok.requiredMonthly !== null" class="flex gap-1.5">
          <dt class="text-muted">按当前年限每月需投</dt>
          <dd class="font-mono text-default">{{ money(ok.requiredMonthly) }} 元</dd>
        </div>
      </dl>

      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">逐年推演</h2>
          <CopyButton :text="copyText" label="复制结果" size="xs" />
        </div>
        <div class="max-h-96 overflow-auto rounded-xl border border-default">
          <table class="w-full min-w-105 text-right text-xs tabular-nums">
            <thead class="sticky top-0 bg-elevated text-muted">
              <tr>
                <th class="p-2 text-left font-medium">年份</th>
                <th class="p-2 font-medium">本年投入</th>
                <th class="p-2 font-medium">本年收益</th>
                <th class="p-2 font-medium">年末资产</th>
                <th class="p-2 font-medium">折合万元</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in ok.years" :key="row.year" class="border-t border-default">
                <td class="p-2 text-left font-medium text-default">第 {{ row.year }} 年</td>
                <td class="p-2">{{ money(row.contributed) }}</td>
                <td class="p-2 text-success">{{ money(row.gain) }}</td>
                <td class="p-2">{{ money(row.value) }}</td>
                <td class="p-2 text-muted">{{ wan(row.value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>
  </ToolShell>
</template>
