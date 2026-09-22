<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-5 space-y-3">
      <div class="flex gap-2">
        <UInput
          v-model="raw"
          size="lg"
          class="w-full font-mono"
          placeholder="输入 URL，如 https://example.com:8443/a/b?x=1&y=2#sec"
          @keyup.enter="apply"
        />
        <UButton label="解析" color="primary" size="sm" icon="i-lucide-search" @click="apply" />
      </div>
      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    </GlassCard>

    <GlassCard v-if="parts" custom-class="p-5 space-y-4">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <USelect v-model="parts.protocol" :items="protocols" label="协议" class="font-mono" />
        <UInput v-model="parts.hostname" label="主机" class="font-mono" />
        <UInput v-model="parts.port" label="端口（默认留空）" class="font-mono" />
        <UInput v-model="parts.hash" label="片段（不含 #）" class="font-mono" />
      </div>
      <UInput v-model="parts.path" label="路径" class="w-full font-mono" />

      <div>
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-medium text-slate-600 dark:text-slate-300">查询参数</p>
          <UButton label="添加参数" size="xs" variant="ghost" icon="i-lucide-plus" @click="parts.params.push({ key: '', value: '' })" />
        </div>
        <div v-for="(p, i) in parts.params" :key="i" class="mb-2 flex items-center gap-2">
          <UInput v-model="p.key" placeholder="key" class="flex-1 font-mono" />
          <UInput v-model="p.value" placeholder="value" class="flex-1 font-mono" />
          <UButton icon="i-lucide-trash-2" size="xs" color="neutral" variant="ghost" @click="parts.params.splice(i, 1)" />
        </div>
        <p v-if="!parts.params.length" class="text-xs text-slate-400">无查询参数</p>
      </div>
    </GlassCard>

    <ResultPanel
      v-if="rebuilt"
      title="重建的 URL"
      value-label="可直接复制使用"
      :value="rebuilt"
    />
  </div>
</template>

<script setup lang="ts">
import { buildUrl, parseUrl, type UrlParts } from '~/utils/url-tool'


const raw = ref('https://example.com:8443/a/b?x=1&y=%E4%BD%A0%E5%A5%BD&x=2#sec')
const error = ref('')
const parts = ref<UrlParts | null>(null)
const protocols = ['https:', 'http:']

function apply() {
  const r = parseUrl(raw.value)
  if (!r.ok) {
    error.value = r.error
    parts.value = null
    return
  }
  error.value = ''
  parts.value = r.parts
}

const rebuilt = computed(() => (parts.value ? buildUrl(parts.value) : ''))

onMounted(apply)
</script>
