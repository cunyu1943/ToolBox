<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-4">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">
          关系链（用「的」连接）
        </label>
        <UInput
          v-model="chain"
          placeholder="例如：爸爸的姐姐的儿子"
          size="lg"
          class="w-full"
          @keyup.enter="resolve"
        />
      </div>

      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <USwitch v-model="reverse" color="primary" />
          {{ reverse ? '查询「对方怎么称呼我」' : '查询「我称呼对方」' }}
        </label>
        <UButton label="计算" icon="i-lucide-git-branch-plus" color="primary" size="sm" @click="resolve" />
      </div>

      <div>
        <p class="mb-2 text-xs text-slate-400">常见关系快捷示例</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="ex in KINSHIP_EXAMPLES"
            :key="ex"
            :label="ex"
            color="neutral"
            variant="outline"
            size="xs"
            @click="pickExample(ex)"
          />
        </div>
      </div>
    </GlassCard>

    <ResultPanel
      v-if="result"
      :title="reverse ? '对方对我的称呼' : '我对对方的称呼'"
      :value="result.terms.join(' / ')"
      :value-label="reverse ? 'TA 叫我' : '我叫 TA'"
      :rows="[{ label: reverse ? '对方自称（我）' : '对方如何称呼我', value: result.reverse.join(' / ') }]"
      :note="result.ambiguous ? '注意：该称谓存在长幼/性别细分，请结合实际年龄判断。' : ''"
    />

    <GlassCard v-else-if="tried" custom-class="p-5 text-center">
      <UIcon name="i-lucide-help-circle" class="h-8 w-8 text-amber-400" />
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        暂未能从内置关系图推导「{{ chain }}」。可尝试简化关系链或使用上方示例。
      </p>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import { KINSHIP_EXAMPLES, resolveKinship, type KinshipResult } from '~/utils/kinship-data'


const chain = ref('爸爸的姐姐的儿子')
const reverse = ref(false)
const result = ref<KinshipResult | null>(null)
const tried = ref(false)

function resolve() {
  tried.value = true
  result.value = resolveKinship(chain.value, reverse.value)
}

function pickExample(ex: string) {
  chain.value = ex
  resolve()
}

watch(reverse, resolve)
onMounted(resolve)
</script>
