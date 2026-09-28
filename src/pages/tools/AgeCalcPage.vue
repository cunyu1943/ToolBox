<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import { AGE_SAMPLES, computeAge } from '~/tools/age-calc'
import { WEEKDAY_LABELS, formatIso, parseDateText, partsOf } from '~/tools/date-diff'
import { useStored } from '~/composables/useStored'

const birthText = useStored('tool.age-calc.birth', '1996-09-24')
const refText = useStored('tool.age-calc.ref', formatIso(partsOf(Date.now())))

const birth = computed(() => parseDateText(birthText.value ?? ''))
const ref = computed(() => parseDateText(refText.value ?? ''))

const result = computed(() => {
  if (!birth.value.ok || !birth.value.parts) {
    return { ok: false, error: birth.value.error ?? '出生日期无法识别', notes: [] as string[] } as const
  }
  if (!ref.value.ok || !ref.value.parts) {
    return { ok: false, error: ref.value.error ?? '参考日期无法识别', notes: [] as string[] } as const
  }
  return computeAge(birth.value.parts, ref.value.parts)
})

const ok = computed(() => (result.value.ok ? result.value : null))

const stats = computed(() => {
  if (!ok.value) return []
  return [
    { label: '合计天数', value: ok.value.totalDays.toLocaleString('zh-CN') },
    { label: '合计周数', value: ok.value.totalWeeks.toLocaleString('zh-CN') },
    { label: '合计整月', value: `${ok.value.totalMonths} 个月` },
    { label: '出生那天', value: WEEKDAY_LABELS[ok.value.birthWeekday] },
    { label: '上次生日', value: formatIso(ok.value.lastBirthday) },
    { label: '下次生日', value: `${formatIso(ok.value.nextBirthday)} · 满 ${ok.value.nextAge} 岁` }
  ]
})

function useSample(birthValue: string, refValue: string): void {
  birthText.value = birthValue
  refText.value = refValue
}

const todayHint = computed(() => formatIso(partsOf(Date.now())))
</script>

<template>
  <ToolShell tool-id="age-calc">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="出生日期" class="w-48">
        <UInput v-model="birthText" size="lg" class="w-full font-mono" placeholder="1996-09-24" />
      </UFormField>
      <UFormField label="参考日期" class="w-48">
        <UInput v-model="refText" size="lg" class="w-full font-mono" :placeholder="todayHint" />
      </UFormField>
      <UButton
        v-for="sample in AGE_SAMPLES"
        :key="sample.label"
        :label="sample.label"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="useSample(sample.birth, sample.ref)"
      />
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
      <div class="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p class="text-xs text-muted">精确年龄</p>
          <p class="text-4xl font-bold text-highlighted">{{ ok.label }}</p>
        </div>
        <div class="flex items-end gap-1">
          <p class="text-xs text-muted">距下次生日</p>
          <p class="text-2xl font-semibold tabular-nums text-primary">{{ ok.daysToNextBirthday }}</p>
          <p class="text-xs text-muted">天（满 {{ ok.nextAge }} 岁）</p>
        </div>
      </div>

      <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div v-for="item in stats" :key="item.label" class="flex flex-col">
          <dt class="text-xs text-muted">{{ item.label }}</dt>
          <dd class="font-mono text-default">{{ item.value }}</dd>
        </div>
      </dl>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">天数里程碑</h2>
        <ul class="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="milestone in ok.milestones"
            :key="milestone.atDays"
            class="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
            :class="milestone.passed ? 'border-default text-muted' : 'border-primary/40 bg-primary/10 text-highlighted'"
          >
            <span class="font-mono">第 {{ milestone.atDays.toLocaleString('zh-CN') }} 天</span>
            <span class="font-mono">{{ formatIso(milestone.date) }}</span>
            <span>{{ milestone.passed ? '已过' : '未来' }}</span>
          </li>
        </ul>
      </section>

      <ul v-if="ok.notes.length" class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      日期可写 1996-09-24、1996/9/24、1996年9月24日。按日历日计算，跨时区不产生误差；
      出生与参考两格都存在浏览器本地。
    </p>
  </ToolShell>
</template>
