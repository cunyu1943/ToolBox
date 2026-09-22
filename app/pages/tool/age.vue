<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap items-end gap-4">
        <label class="space-y-1 text-sm">
          <span class="text-xs text-slate-400">出生日期</span>
          <UInput v-model="birth" type="date" class="block" placeholder="YYYY-MM-DD" />
        </label>
        <label class="space-y-1 text-sm">
          <span class="text-xs text-slate-400">计算基准日</span>
          <UInput v-model="refDate" type="date" class="block" placeholder="YYYY-MM-DD" />
        </label>
        <UButton label="回到今天" color="neutral" variant="soft" size="sm" @click="refDate = todayStr()" />
      </div>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    </GlassCard>

    <GlassCard v-if="result" custom-class="p-5 space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-lg bg-slate-50 p-4 text-center dark:bg-white/5">
          <p class="text-xs text-slate-400">周岁</p>
          <p class="mt-1 text-2xl font-semibold text-vue-600 dark:text-vue-300">{{ result.years }} 岁</p>
          <p class="text-xs text-slate-400">另 {{ result.months }} 个月 {{ result.days }} 天</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-4 text-center dark:bg-white/5">
          <p class="text-xs text-slate-400">共度过</p>
          <p class="mt-1 text-2xl font-semibold text-vue-600 dark:text-vue-300">{{ result.totalDays.toLocaleString() }} 天</p>
          <p class="text-xs text-slate-400">约 {{ Math.floor(result.totalDays / 7).toLocaleString() }} 周</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-4 text-center dark:bg-white/5">
          <p class="text-xs text-slate-400">距下次生日</p>
          <p class="mt-1 text-2xl font-semibold text-vue-600 dark:text-vue-300">{{ result.daysToNextBirthday === 0 ? '就是今天 🎂' : `${result.daysToNextBirthday} 天` }}</p>
          <p v-if="result.daysToNextBirthday > 0" class="text-xs text-slate-400">届时 {{ result.nextBirthdayAge }} 周岁</p>
        </div>
      </div>
      <p class="text-xs text-slate-400">出生日是{{ weekdays[result.birthWeekday] }}。2 月 29 日出生者在平年按 3 月 1 日计生日。</p>
    </GlassCard>
    <p v-else-if="!error" class="text-xs text-slate-400">选择出生日期即可计算，全部在浏览器本地完成。</p>
  </div>
</template>

<script setup lang="ts">
import type { AgeResult } from '~/utils/age-tool'
import { calcAge, parseDate } from '~/utils/age-tool'


const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

const birth = ref('')
const refDate = ref(todayStr())
const error = ref('')
const result = computed<AgeResult | null>(() => {
  error.value = ''
  const b = parseDate(birth.value)
  const r = parseDate(refDate.value)
  if (!b || !r) {
    if (birth.value || refDate.value) error.value = '日期格式不正确或不存在，请使用 YYYY-MM-DD'
    return null
  }
  if (b > r) {
    error.value = '出生日期不能晚于计算基准日'
    return null
  }
  return calcAge(b, r)
})
</script>
