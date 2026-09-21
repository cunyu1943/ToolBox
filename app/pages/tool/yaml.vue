<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <USelect v-model="mode" :items="modes" class="w-44" />
        <UButton
          v-if="result.ok && result.output"
          icon="i-lucide-arrow-left-right"
          size="xs"
          color="neutral"
          variant="ghost"
          label="结果作为输入"
          @click="useOutputAsInput"
        />
      </div>
      <UTextarea v-model="input" :rows="12" auto-resize :placeholder="mode === modes[0] ? 'key: value\nlist:\n  - a\n  - b' : '{&quot;key&quot;: &quot;value&quot;}'" class="w-full font-mono text-sm" />
      <p v-if="!result.ok && result.error && input.trim()" class="text-sm text-red-500">{{ result.error }}</p>
    </GlassCard>

    <GlassCard v-if="result.ok && result.output" custom-class="p-4 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-400">{{ mode === modes[0] ? 'JSON 结果' : 'YAML 结果' }}</p>
        <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" @click="copy" />
      </div>
      <pre class="overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-slate-800 dark:text-slate-100">{{ result.output }}</pre>
    </GlassCard>
    <p v-else-if="!input.trim()" class="text-xs text-slate-400">基于 js-yaml 的严格解析，语法错误附行列定位；输出 JSON 已格式化、YAML 不折行。</p>
  </div>
</template>

<script setup lang="ts">
import { jsonToYaml, yamlToJson } from '~/utils/yaml-tool'

const { copy: copyWithToast } = useCopy()

definePageMeta({ layout: 'tool' })

const modes = ['YAML → JSON', 'JSON → YAML'] as const
const mode = ref<string>(modes[0])
const input = ref('name: ToolBox\nfeatures:\n  - 纯前端\n  - 无后端\ncount: 39')

const result = computed(() =>
  mode.value === modes[0] ? yamlToJson(input.value) : jsonToYaml(input.value)
)

function useOutputAsInput() {
  input.value = result.value.output
  mode.value = mode.value === modes[0] ? modes[1] : modes[0]
}

async function copy() {
  await copyWithToast(result.value.output)
}
</script>
