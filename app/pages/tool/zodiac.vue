<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap items-end gap-4">
        <label class="space-y-1 text-sm">
          <span class="text-xs text-slate-400">出生年份</span>
          <UInput v-model.number="year" type="number" placeholder="如 1998" class="block w-32" />
        </label>
        <label class="space-y-1 text-sm">
          <span class="text-xs text-slate-400">生日（月-日）</span>
          <div class="flex items-center gap-2">
            <UInput v-model.number="month" type="number" placeholder="月" class="block w-20" min="1" max="12" />
            <span class="text-slate-400">-</span>
            <UInput v-model.number="day" type="number" placeholder="日" class="block w-20" min="1" max="31" />
          </div>
        </label>
      </div>
      <p v-if="dateErr" class="text-sm text-red-500">{{ dateErr }}</p>
    </GlassCard>

    <div v-if="animal || sign" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <GlassCard v-if="animal" custom-class="p-5 text-center">
        <p class="text-xs text-slate-400">生肖</p>
        <p class="mt-2 text-4xl">{{ animalEmoji }}</p>
        <p class="mt-2 text-xl font-semibold text-vue-600 dark:text-vue-300">{{ year }} · {{ animal }}年</p>
      </GlassCard>
      <GlassCard v-if="sign" custom-class="p-5 text-center">
        <p class="text-xs text-slate-400">星座</p>
        <p class="mt-2 text-4xl">{{ signEmoji }}</p>
        <p class="mt-2 text-xl font-semibold text-vue-600 dark:text-vue-300">{{ sign.name }} {{ sign.en }}</p>
        <p class="mt-1 text-xs text-slate-400">{{ sign.element }}</p>
      </GlassCard>
    </div>
    <p v-else class="text-xs text-slate-400">输入出生年份查生肖，补充月-日可同时查星座。</p>
    <p class="text-xs text-slate-400">生肖按公历年份近似（未精确到春节交界）；星座按通用日期区间，交界日可能因年份有一两天浮动。</p>
  </div>
</template>

<script setup lang="ts">
import { chineseZodiac, westernZodiac } from '~/utils/zodiac-tool'


const year = ref<number | null>(null)
const month = ref<number | null>(null)
const day = ref<number | null>(null)

const animal = computed(() => (year.value ? chineseZodiac(year.value) : ''))
const animalEmoji = computed(() => ({ 鼠: '🐭', 牛: '🐂', 虎: '🐯', 兔: '🐰', 龙: '🐲', 蛇: '🐍', 马: '🐴', 羊: '🐑', 猴: '🐵', 鸡: '🐔', 狗: '🐶', 猪: '🐷' }[animal.value] || '✨'))

const sign = computed(() => {
  if (!month.value || !day.value) return null
  return westernZodiac(month.value, day.value)
})
const signEmoji = computed(() => ({ 摩羯座: '♑', 水瓶座: '♒', 双鱼座: '♓', 白羊座: '♈', 金牛座: '♉', 双子座: '♊', 巨蟹座: '♋', 狮子座: '♌', 处女座: '♍', 天秤座: '♎', 天蝎座: '♏', 射手座: '♐' }[sign.value?.name || ''] || '⭐'))

const dateErr = computed(() => {
  if (month.value && !sign.value) return '该月不存在这一天，请检查月/日'
  return ''
})
</script>
