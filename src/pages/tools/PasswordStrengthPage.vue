<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import { powerOfTen, yearsLabel } from '~/tools/password-gen'
import { STRENGTH_SAMPLES, analyzePassword, COMMON_PASSWORDS } from '~/tools/password-strength'

/** 刻意用 ref 而不是 useStored：待评估的口令一个字符都不落 localStorage */
const pwd = ref('')
const visible = ref(false)
const result = computed(() => analyzePassword(pwd.value))

const barColor = computed(() => {
  const score = result.value.strength.score
  if (score <= 1) return 'bg-error'
  if (score === 2) return 'bg-warning'
  if (score === 3) return 'bg-success'
  return 'bg-primary'
})
const badgeColor = computed(() => {
  const score = result.value.strength.score
  if (score <= 1) return 'error' as const
  if (score === 2) return 'warning' as const
  return 'success' as const
})
const guessLabel = computed(() => powerOfTen(result.value.strength.guessesLog10))
const cracked = computed(() => yearsLabel(result.value.strength.yearsLog10))
const discounted = computed(() => result.value.rawEntropy - result.value.effectiveEntropy >= 0.1)

function useSample(value: string): void {
  pwd.value = value
  visible.value = true
}
</script>

<template>
  <ToolShell tool-id="password-strength">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="flex items-center gap-2">
          <UInput
            v-model="pwd"
            :type="visible ? 'text' : 'password'"
            placeholder="输入要评估的口令，实时出结果"
            autocomplete="new-password"
            spellcheck="false"
            class="min-w-0 flex-1 font-mono"
            aria-label="待评估的口令"
          />
          <UButton
            :icon="visible ? 'lucide:eye-off' : 'lucide:eye'"
            color="neutral"
            variant="outline"
            size="sm"
            :aria-label="visible ? '隐藏口令' : '显示口令'"
            @click="visible = !visible"
          />
        </div>

        <div v-if="result.ok" class="flex items-center gap-2">
          <span class="flex flex-1 items-center gap-1.5" aria-hidden="true">
            <span
              v-for="step in 4"
              :key="step"
              class="h-1.5 flex-1 rounded-full transition-colors"
              :class="step <= result.strength.score + 1 ? barColor : 'bg-[var(--ui-border)]'"
            />
          </span>
          <UBadge :color="badgeColor" variant="subtle" :label="`强度：${result.strength.label}`" />
        </div>

        <div v-if="result.ok" class="flex flex-wrap items-center gap-2 text-xs">
          <UBadge :label="`长度 ${result.length}`" color="neutral" variant="subtle" />
          <UBadge :label="`字符集 ${result.poolSize}`" color="neutral" variant="subtle" />
          <UBadge :label="`理论 ${result.rawEntropy} bit`" color="neutral" variant="subtle" />
          <UBadge
            :label="`判级 ${result.effectiveEntropy} bit`"
            :color="discounted ? 'warning' : 'neutral'"
            variant="subtle"
          />
          <UBadge :label="`平均尝试 ${guessLabel} 次`" color="neutral" variant="subtle" />
          <UBadge :label="`离线破解 ≈ ${cracked}`" color="neutral" variant="subtle" />
        </div>

        <p v-if="result.ok" class="text-xs text-muted">命中的字符类：{{ result.classes.join('、') }}</p>
        <p class="text-sm text-highlighted">{{ result.suggestion }}</p>
      </section>

      <section v-if="result.warnings.length" class="flex flex-col gap-2">
        <h2 class="flex items-center gap-1.5 text-sm font-medium text-highlighted">
          <UIcon name="lucide:triangle-alert" class="size-4 text-warning" />
          评估要点
        </h2>
        <ul class="flex flex-col gap-1 text-xs text-muted">
          <li v-for="line in result.warnings" :key="line">· {{ line }}</li>
        </ul>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">试试这些</h2>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in STRENGTH_SAMPLES"
            :key="sample.label"
            :label="`${sample.label}（${sample.expect}）`"
            size="xs"
            color="neutral"
            variant="outline"
            @click="useSample(sample.value)"
          />
        </div>
        <p class="text-xs text-dimmed">点样本会把口令显示出来，只是为了看清被评估的是什么；输入框里始终可以换成你自己的。</p>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">这些数字怎么来的</h2>
        <ul class="flex flex-col gap-1 text-xs text-muted">
          <li>· 理论熵 = 长度 × log2(字符集大小)，其中小写 26、大写 26、数字 10、可见符号 33、空格 1、汉字 3500（《通用规范汉字表》一级字表）、其他非 ASCII 100。</li>
          <li>· 这个式子只对「每个字符均匀随机」成立。人能写出的结构都远低于它，所以命中下列模式时会改按该模式自己的空间计熵，并在「评估要点」里说明折损了多少：常见弱口令表（{{ COMMON_PASSWORDS.length }} 条，支持内嵌命中）、码点连续与键盘行序列、整段重复、日期与年份（整串或内嵌）。</li>
          <li>· 判级带与破解耗时都用「判级熵」：28 / 45 / 64 / 80 / 100 bit 五档，与「随机密码生成」页共用同一个函数，同一个熵值在两页得到同一等级。</li>
          <li>· 破解耗时按离线每秒 10¹¹ 次尝试估算（高端 GPU 集群跑无盐快哈希的量级），平均只需试完一半空间，故用 熵 − 1。站点若用 bcrypt / scrypt / Argon2 这类慢哈希，同一口令的抵抗时间要长几个数量级；反之「在线试几次就锁号」的场景不用看这个数。</li>
          <li>· 检测不到的是「语义可猜性」：姓名、宠物名、方言拼音、「吃火锅」这类高度可猜的词在字符空间上仍然算得很大。含汉字的口令普遍估算偏高，请把它当下界看。</li>
          <li>· 口令只在浏览器内存里参与计算，不写 localStorage、不发任何网络请求。</li>
        </ul>
      </section>
    </div>
  </ToolShell>
</template>
