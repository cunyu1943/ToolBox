<script setup lang="ts">
import { computed } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  CRON_FIELDS, CRON_MACROS, CRON_PRESETS, cronMatches, nextRuns, parseCron, type FieldParse
} from '~/tools/cron-parse'
import { encodeDate } from '~/tools/timestamp'
import { useStored } from '~/composables/useStored'

const countItems = [
  { label: '接下来 5 次', value: 5 },
  { label: '接下来 10 次', value: 10 },
  { label: '接下来 20 次', value: 20 }
]

const expression = useStored('tool.cron-parse.expression', '30 2 * * *')
const fromText = useStored('tool.cron-parse.from', 'now')
const count = useStored('tool.cron-parse.count', 5)

const result = computed(() => parseCron(expression.value))
const from = computed(() => encodeDate(fromText.value))
const fromMs = computed(() => (from.value.ok ? (from.value.ms ?? Date.now()) : Date.now()))
const occurrences = computed(() =>
  result.value.ok ? nextRuns(result.value, new Date(fromMs.value), count.value) : []
)
const hitsAtStart = computed(() =>
  result.value.ok ? cronMatches(result.value, new Date(fromMs.value)) : false
)

/** 展示用：把取值数组折成短句，太长时截断（语义仍以内核展开的完整集合为准） */
function valuesText(field: FieldParse): string {
  const { min, max } = field.spec
  if (field.values.length === max - min + 1) return `${min}–${max}（全部）`
  if (field.values.length <= 14) return field.values.join(', ')
  return `${field.values.slice(0, 14).join(', ')} …共 ${field.values.length} 个`
}

const macroRows = Object.entries(CRON_MACROS)

function fill(preset: string) {
  expression.value = preset
}
function clearAll() {
  expression.value = ''
  fromText.value = 'now'
}
</script>

<template>
  <ToolShell tool-id="cron-parse">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">crontab 表达式（5 段：分 时 日 月 周）</span>
          <UInput
            v-model="expression"
            size="lg"
            spellcheck="false"
            placeholder="*/5 9-17 1,15 jan-jun mon-fri"
            :ui="{ base: 'font-mono' }"
          />
        </label>
        <div class="flex flex-wrap items-end gap-3">
          <label class="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-72">
            <span class="text-sm text-muted">起算时间（也用于「此刻是否命中」）</span>
            <UInput
              v-model="fromText"
              size="lg"
              spellcheck="false"
              placeholder="now 或 2026-09-23 08:30:00"
              :ui="{ base: 'font-mono' }"
            />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-sm text-muted">次数</span>
            <USelect v-model="count" :items="countItems" size="lg" class="w-36" aria-label="推算次数" />
          </label>
          <div class="ms-auto flex items-center gap-2">
            <UButton icon="lucide:calendar-clock" label="此刻起算" color="neutral" variant="ghost" @click="fromText = 'now'" />
            <UButton icon="lucide:eraser" label="清空" color="neutral" variant="ghost" @click="clearAll" />
          </div>
        </div>
        <p v-if="!from.ok" class="text-xs text-error">{{ from.error }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="preset in CRON_PRESETS"
          :key="preset.value"
          :label="preset.label"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="fill(preset.value)"
        />
      </div>

      <UAlert
        v-if="!result.ok && expression.trim()"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        title="无法解析"
        :description="result.errors.join(' ')"
      />

      <section v-if="result.ok" class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <p class="text-base font-medium text-highlighted sm:text-lg">{{ result.summary }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge :label="`展开为 ${result.expression}`" color="neutral" variant="subtle" class="font-mono" />
          <UBadge
            :label="hitsAtStart ? '起算时刻正好命中' : '起算时刻不触发'"
            :color="hitsAtStart ? 'success' : 'neutral'"
            variant="subtle"
          />
          <UBadge
            v-for="note in result.notes"
            :key="note"
            :label="note"
            color="warning"
            variant="subtle"
            icon="lucide:triangle-alert"
          />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[34rem] border-collapse text-sm">
            <caption class="sr-only">逐字段展开结果</caption>
            <thead>
              <tr class="border-b border-default text-left text-xs text-dimmed">
                <th scope="col" class="py-2 pr-3 font-medium">字段</th>
                <th scope="col" class="py-2 pr-3 font-medium">写法</th>
                <th scope="col" class="py-2 font-medium">取值</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="field in result.fields"
                :key="field.spec.key"
                class="border-b border-default align-top last:border-b-0"
              >
                <th scope="row" class="py-2 pr-3 font-normal">
                  <span class="text-default">{{ field.spec.cn }}</span>
                  <span class="ms-1 text-xs text-dimmed">{{ field.spec.label }}</span>
                </th>
                <td class="py-2 pr-3 font-mono text-xs text-primary">{{ field.source }}</td>
                <td class="py-2 font-mono text-xs leading-relaxed text-muted">
                  {{ valuesText(field) }}
                  <span v-if="!field.restricted" class="ms-1 text-dimmed">（未限定）</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs leading-relaxed text-dimmed">
          注意「日」与「周」都被限定时按 Vixie cron 取<strong class="text-muted">并集</strong>：任一命中即触发。
        </p>
      </section>

      <section v-if="occurrences.length" class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">接下来的触发时刻（本地时间）</h2>
        <ol class="flex flex-col overflow-hidden rounded-xl border border-default">
          <li
            v-for="(item, index) in occurrences"
            :key="item.label"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0 odd:bg-elevated/50"
          >
            <span class="w-6 shrink-0 font-mono text-xs text-dimmed">{{ index + 1 }}</span>
            <span class="font-mono text-sm text-highlighted">{{ item.label }}</span>
            <UBadge :label="item.weekday" color="neutral" variant="subtle" size="sm" />
            <span class="ms-auto text-xs text-muted">{{ item.relative }}</span>
          </li>
        </ol>
      </section>

      <section
        v-else-if="result.ok"
        class="flex flex-col gap-1 rounded-xl border border-default p-4"
      >
        <h2 class="text-sm font-medium text-highlighted">往后 5 年内没有触发时刻</h2>
        <p class="text-xs leading-relaxed text-muted">
          这类表达式通常是日期字段自相矛盾，例如
          <code class="rounded bg-elevated px-1 py-0.5 font-mono">{{ result.expression }}</code>
          要求「2 月 30 日」，公历里不存在这一天。
        </p>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">写法速查</h2>
        <ul class="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs leading-relaxed sm:grid-cols-2">
          <li v-for="spec in CRON_FIELDS" :key="spec.key" class="flex gap-2">
            <span class="w-8 shrink-0 text-dimmed">{{ spec.cn }}</span>
            <code class="font-mono text-primary">{{ spec.min }}–{{ spec.max }}</code>
          </li>
          <li class="flex gap-2 sm:col-span-2">
            <span class="w-8 shrink-0 text-dimmed">通配</span>
            <span class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <code class="font-mono text-primary">*</code>
              <span class="text-muted">全部</span>
              <code class="font-mono text-primary">5-20/3</code>
              <span class="text-muted">区间带步长</span>
              <code class="font-mono text-primary">5/10</code>
              <span class="text-muted">等价于 5–末/10</span>
              <code class="font-mono text-primary">?</code>
              <span class="text-muted">按 * 处理</span>
            </span>
          </li>
          <li class="flex gap-2 sm:col-span-2">
            <span class="w-8 shrink-0 text-dimmed">缩写</span>
            <span class="text-muted">月 <code class="font-mono text-primary">jan…dec</code>、周
              <code class="font-mono text-primary">sun…sat</code>（数字周日可写 0 或 7）</span>
          </li>
          <li class="flex flex-wrap gap-x-4 gap-y-1 sm:col-span-2">
            <span class="w-8 shrink-0 text-dimmed">宏</span>
            <code
              v-for="[name, expanded] in macroRows"
              :key="name"
              class="font-mono text-primary"
            >{{ name }} = {{ expanded }}</code>
          </li>
        </ul>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        触发时间按<strong class="text-muted">浏览器本地墙上时钟</strong>计算，不做时区换算；服务器若在别的时区，
        请把上面的结果当作「本地时间下的形状」来读。秒级 crontab（6 段、Quartz 的
        <code class="rounded bg-elevated px-1 py-0.5">day-of-week ?</code> 与
        <code class="rounded bg-elevated px-1 py-0.5">L</code> /
        <code class="rounded bg-elevated px-1 py-0.5">#</code>）不在支持范围内，会直接提示而不是猜。
      </p>
    </div>
  </ToolShell>
</template>
