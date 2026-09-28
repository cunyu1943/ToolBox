<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  fromUppercase, MAX_INTEGER_DIGITS, parseAmount, RMB_SAMPLES, toReading, toUppercase
} from '~/tools/rmb-uppercase'
import { useStored } from '~/composables/useStored'

const amount = useStored('tool.rmb.amount', '1234.56')
const withSuffix = useStored('tool.rmb.withSuffix', true)
const upper = useStored('tool.rmb.upper', '壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元玖角捌分')

const numericSamples = RMB_SAMPLES.filter((item) => /[0-9０-９]/.test(item.value))
const uppercaseSamples = RMB_SAMPLES.filter((item) => !/[0-9０-９]/.test(item.value))

const parsed = computed(() => parseAmount(amount.value))
const uppercase = computed(() => toUppercase(amount.value, withSuffix.value))
const reading = computed(() => toReading(amount.value))
const back = computed(() => fromUppercase(upper.value))

/** 反向核对：大写 → 数字 → 大写，两次结果一致才说明票面写法规范 */
const roundTrip = computed(() => {
  if (!back.value.ok) return null
  const again = toUppercase(back.value.decimal, withSuffix.value)
  if (!again.ok) return null
  return { ok: again.text === upper.value.trim(), text: again.text }
})
</script>

<template>
  <ToolShell tool-id="rmb-uppercase">
    <div class="flex flex-col gap-5">
      <section class="flex flex-col gap-3">
        <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
          <label class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="text-sm text-muted">金额（数字）</span>
            <UInput
              v-model="amount"
              size="lg"
              spellcheck="false"
              :maxlength="40"
              placeholder="1234.56 / ￥1,234.50 / -88.8 / (88.80) / 12元"
              :ui="{ base: 'font-mono' }"
            />
          </label>
          <div class="inline-flex h-11 items-center gap-2 rounded-lg border border-default bg-elevated px-3">
            <USwitch v-model="withSuffix" size="sm" aria-label="补「整」字" />
            <span class="text-sm text-muted">补「整」</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in numericSamples"
            :key="sample.value"
            :label="sample.label"
            color="neutral"
            variant="subtle"
            size="sm"
            @click="amount = sample.value"
          />
        </div>

        <UAlert
          v-if="!parsed.ok"
          color="error"
          variant="subtle"
          icon="lucide:circle-alert"
          title="无法识别金额"
          :description="parsed.error"
        />

        <template v-else>
          <div v-if="parsed.warnings.length" class="flex flex-col gap-1">
            <p
              v-for="warning in parsed.warnings"
              :key="warning"
              class="text-xs leading-relaxed text-warning"
            >{{ warning }}</p>
          </div>

          <div class="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-medium text-highlighted">中文大写</h2>
              <CopyButton :text="uppercase.text" size="xs" />
            </div>
            <p class="break-all text-lg leading-relaxed font-medium text-highlighted sm:text-xl">
              {{ uppercase.text }}
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :label="`规范化数字 ${parsed.decimal}`" color="neutral" variant="subtle" class="font-mono" />
              <UBadge :label="`合计 ${parsed.cents} 分`" color="neutral" variant="subtle" class="font-mono" />
              <UBadge v-if="parsed.negative" label="负数（冲红）" color="error" variant="subtle" />
            </div>
          </div>

          <div class="flex flex-col gap-2 rounded-xl border border-default p-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-medium text-highlighted">中文读法（小写）</h2>
              <CopyButton :text="reading.text" size="xs" />
            </div>
            <p class="break-all text-lg leading-relaxed text-highlighted">{{ reading.text }}</p>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge label="小数逐位读，不四舍五入到分" color="neutral" variant="subtle" />
              <UBadge label="10–19 读作「十…十九」" color="neutral" variant="subtle" />
            </div>
          </div>

          <section v-if="parsed.groups.length > 1" class="flex flex-col gap-2">
            <h2 class="text-sm font-medium text-highlighted">分节核对</h2>
            <div class="overflow-x-auto rounded-xl border border-default">
              <table class="w-full min-w-[26rem] border-collapse text-sm">
                <caption class="sr-only">按四位一节的展开</caption>
                <thead>
                  <tr class="border-b border-default text-left text-xs text-dimmed">
                    <th scope="col" class="px-3 py-2 font-medium">节权</th>
                    <th scope="col" class="px-3 py-2 font-medium">本节 4 位</th>
                    <th scope="col" class="px-3 py-2 font-medium">读作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="group in parsed.groups"
                    :key="group.unit"
                    class="border-b border-default last:border-b-0 odd:bg-elevated/50"
                  >
                    <th scope="row" class="px-3 py-2 font-normal text-muted">{{ group.unit }}</th>
                    <td class="px-3 py-2 font-mono text-xs text-primary">{{ group.digits }}</td>
                    <td class="px-3 py-2 text-default">{{ group.chinese || '零' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-dimmed">
              整数部分最多允许 {{ MAX_INTEGER_DIGITS }} 位（即 9999 万亿余元），超出会直接报错而不是静默截断。
            </p>
          </section>
        </template>
      </section>

      <section class="flex flex-col gap-3 border-t border-default pt-5">
        <h2 class="text-sm font-medium text-highlighted">反向核对：中文金额（大写或小写）→ 数字</h2>
        <p class="text-xs text-dimmed">
          用来检查票面、合同里的大小写是否一致。异写也能读：<code class="rounded bg-elevated px-1 py-0.5 font-mono">圆</code>
          同「元」、<code class="rounded bg-elevated px-1 py-0.5 font-mono">正</code> 同「整」、
          <code class="rounded bg-elevated px-1 py-0.5 font-mono">〇</code> 同「零」、全角数字与「壹拾」式写法都接受，
          <strong class="text-muted">小写的「一千二百三十四元五角六分」同样解得开</strong>。
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in uppercaseSamples"
            :key="sample.value"
            :label="sample.label"
            color="neutral"
            variant="subtle"
            size="sm"
            @click="upper = sample.value"
          />
        </div>
        <UInput
          v-model="upper"
          size="lg"
          spellcheck="false"
          placeholder="壹仟贰佰叁拾肆元伍角陆分"
          :ui="{ base: 'font-mono' }"
        />

        <UAlert
          v-if="!back.ok"
          color="error"
          variant="subtle"
          icon="lucide:circle-alert"
          title="无法识别中文金额"
          :description="back.error"
        />

        <template v-else>
          <div v-if="back.warnings.length" class="flex flex-col gap-1">
            <p v-for="warning in back.warnings" :key="warning" class="text-xs leading-relaxed text-warning">
              {{ warning }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3 rounded-xl border border-default p-4">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-dimmed">数字金额</p>
              <p class="break-all font-mono text-lg text-highlighted">{{ back.decimal }}</p>
            </div>
            <UBadge
              v-if="roundTrip"
              :label="roundTrip.ok ? '再转回大写完全一致' : `规范写法应为 ${roundTrip.text}`"
              :color="roundTrip.ok ? 'success' : 'warning'"
              variant="subtle"
            />
            <CopyButton :text="back.decimal" size="xs" />
          </div>
        </template>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        全程以「分」为单位的 <strong class="text-muted">整数（BigInt）</strong>运算，不经过浮点，所以不会出现
        <code class="rounded bg-elevated px-1 py-0.5">0.1 + 0.2</code> 那类误差；第三位小数按票据惯例四舍五入并提示。
        节权遵循中文习惯：<strong class="text-muted">「万」嵌在「亿」里</strong>，因此 10^12 读作「壹万亿」而不是
        「壹兆」。角位为零而分位不为零时写作「元零柒分」，只有元时按惯例补「整」。<strong class="text-muted">中文读法共用同一套节权</strong>，
        只是换成小写字形，并且小数按输入逐位读、不进位到分。
      </p>
    </div>
  </ToolShell>
</template>
