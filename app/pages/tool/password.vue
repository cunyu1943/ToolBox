<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-500 dark:text-slate-400">长度</span>
        <USlider v-model="length" :min="4" :max="64" :step="1" class="flex-1" />
        <span class="w-8 text-right font-mono text-sm tabular-nums">{{ length }}</span>
      </div>

      <div class="flex flex-wrap gap-4">
        <UCheckbox v-model="lowercase" label="小写 a-z" />
        <UCheckbox v-model="uppercase" label="大写 A-Z" />
        <UCheckbox v-model="digits" label="数字 0-9" />
        <UCheckbox v-model="symbols" label="符号 !@#$" />
        <UCheckbox v-model="excludeAmbiguous" label="排除易混淆 (Il1O0)" />
      </div>

      <div class="flex gap-2">
        <UButton label="重新生成" icon="i-lucide-refresh-cw" color="primary" :disabled="!hasSet" @click="regenerate" />
        <UButton label="复制" icon="i-lucide-copy" color="neutral" variant="soft" :disabled="!value" @click="copy" />
      </div>
      <p v-if="!hasSet" class="text-sm text-red-500">请至少勾选一种字符类型。</p>
    </GlassCard>

    <GlassCard custom-class="p-5 space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">密码</h2>
      <code class="block break-all rounded-lg bg-slate-50 p-4 font-mono text-lg dark:bg-white/5">{{ value || '—' }}</code>
      <div class="flex gap-4 text-xs text-slate-400">
        <span>长度 {{ value.length }}</span>
        <span>字符种类 {{ variety }}</span>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { generatePassword } from '~/utils/password'

const { copy: copyWithToast } = useCopy()


const length = ref(16)
const lowercase = ref(true)
const uppercase = ref(true)
const digits = ref(true)
const symbols = ref(false)
const excludeAmbiguous = ref(false)
const value = ref('')

const hasSet = computed(() => lowercase.value || uppercase.value || digits.value || symbols.value)

const variety = computed(() => {
  let n = 0
  if (/[a-z]/.test(value.value)) n++
  if (/[A-Z]/.test(value.value)) n++
  if (/[0-9]/.test(value.value)) n++
  if (/[^a-zA-Z0-9]/.test(value.value)) n++
  return n
})

function regenerate() {
  if (!hasSet.value) {
    value.value = ''
    return
  }
  value.value = generatePassword({
    length: length.value,
    lowercase: lowercase.value,
    uppercase: uppercase.value,
    digits: digits.value,
    symbols: symbols.value,
    excludeAmbiguous: excludeAmbiguous.value
  })
}

async function copy() {
  if (!value.value) return
  await copyWithToast(value.value)
}

onMounted(regenerate)
</script>
