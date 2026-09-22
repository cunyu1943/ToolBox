<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <UInput v-model="id" placeholder="输入 18 位身份证号" class="w-72 font-mono" autofocus @update:model-value="id = id.toUpperCase()">
          <template v-if="id" #trailing>
            <UButton icon="i-lucide-x" :padded="false" color="neutral" variant="ghost" tabindex="-1" @click="id = ''" />
          </template>
        </UInput>
        <UButton label="填充示例" color="neutral" variant="soft" size="sm" @click="id = EXAMPLE" />
      </div>
      <p class="text-xs text-slate-400">仅在浏览器本地解析校验，不上传、不存储；示例号码为教学用虚构号段。</p>
    </GlassCard>

    <GlassCard v-if="error" custom-class="p-5">
      <div class="flex items-center gap-2 text-sm text-red-500">
        <UIcon name="i-lucide-circle-alert" class="h-4 w-4" />
        {{ error }}
      </div>
    </GlassCard>

    <GlassCard v-else-if="info.valid" custom-class="p-5 space-y-4">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-circle-check" class="h-5 w-5 text-green-500" />
        <span class="text-sm font-semibold text-green-600 dark:text-green-400">身份证号格式与校验位均有效</span>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p class="text-xs text-slate-400">出生日期</p>
          <p class="mt-1 text-base font-semibold tabular-nums">{{ info.birthday }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p class="text-xs text-slate-400">周岁（今日）</p>
          <p class="mt-1 text-base font-semibold tabular-nums">{{ info.age }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p class="text-xs text-slate-400">性别</p>
          <p class="mt-1 text-base font-semibold">{{ info.gender }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
          <p class="text-xs text-slate-400">归属地代码</p>
          <p class="mt-1 text-base font-semibold tabular-nums">{{ info.regionCode }}</p>
        </div>
      </div>
      <p class="text-xs text-slate-400">归属地代码前两位为省份：11 北京、12 天津、31 上海、44 广东、51 四川等，完整区划请对照国家统计局区划代码。</p>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { parseIdCard, type IdCardInfo } from '~/utils/id-card'

definePageMeta({ layout: 'tool' })

const EXAMPLE = '110105199001010010'

const id = ref('')
const trimmed = computed(() => id.value.trim())

const INVALID: IdCardInfo = { valid: false, error: '', birthday: '', age: 0, gender: '', regionCode: '' }
const result = computed(() => (trimmed.value ? parseIdCard(trimmed.value) : INVALID))
const info = computed(() => result.value)
const error = computed(() => (trimmed.value && !result.value.valid ? result.value.error : ''))
</script>
