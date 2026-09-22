<template>
  <div class="space-y-4">
    <!-- 当前时间戳 -->
    <GlassCard custom-class="p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs text-slate-400">当前时间戳</p>
          <div class="mt-1 flex items-center gap-2">
            <span class="text-3xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{{ displayLive }}</span>
            <UBadge color="success" variant="soft">{{ liveUnit === 'ms' ? '毫秒' : '秒' }}</UBadge>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" label="切换单位" @click="toggleLiveUnit" />
          <UButton icon="i-lucide-copy" color="neutral" variant="outline" label="复制" @click="copy(String(displayLive))" />
          <UButton
            :icon="paused ? 'i-lucide-play' : 'i-lucide-pause'"
            :color="paused ? 'success' : 'error'"
            variant="solid"
            :label="paused ? '继续' : '暂停'"
            @click="paused = !paused"
          />
        </div>
      </div>
    </GlassCard>

    <!-- 单个 / 批量 切换 -->
    <div class="inline-flex rounded-lg border border-slate-200/70 bg-white p-1 dark:border-white/10 dark:bg-white/5">
      <UButton
        v-for="t in tabs"
        :key="t.value"
        :label="t.label"
        size="sm"
        :variant="mode === t.value ? 'solid' : 'ghost'"
        :color="mode === t.value ? 'primary' : 'neutral'"
        @click="mode = t.value"
      />
    </div>

    <!-- 单个转换 -->
    <template v-if="mode === 'single'">
      <!-- 时间戳 → 日期时间 -->
      <GlassCard custom-class="p-5 space-y-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="h-5 w-5 text-vue-500" />
          <h2 class="font-semibold text-slate-800 dark:text-slate-100">时间戳转日期时间</h2>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="sm:col-span-1">
            <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">时间戳</label>
            <UInput v-model="decTs" :placeholder="decUnit === 'ms' ? '13 位毫秒' : '10 位秒'" class="w-full" @keyup.enter="doDecode" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">单位</label>
            <USelect v-model="decUnit" :items="unitOptions" class="w-full" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">时区</label>
            <USelect v-model="decTz" :items="TIMEZONES" class="w-full" />
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton icon="i-lucide-zap" color="neutral" variant="soft" label="填入当前" @click="fillCurrent" />
          <UButton icon="i-lucide-arrow-right" color="primary" label="转换" @click="doDecode" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">转换结果</label>
          <div class="flex items-center gap-2">
            <div :class="fieldCls">{{ decResult || '—' }}</div>
            <UButton icon="i-lucide-copy" color="neutral" variant="ghost" square :disabled="!decResult" aria-label="复制结果" @click="copy(decResult)" />
          </div>
          <p v-if="decErr" class="mt-1 text-xs text-red-500 dark:text-red-400">{{ decErr }}</p>
        </div>
      </GlassCard>

      <!-- 日期时间 → 时间戳 -->
      <GlassCard custom-class="p-5 space-y-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calendar" class="h-5 w-5 text-vue-500" />
          <h2 class="font-semibold text-slate-800 dark:text-slate-100">日期时间转时间戳</h2>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="sm:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">日期时间</label>
            <UInput v-model="encStr" placeholder="YYYY-MM-DD HH:mm:ss" class="w-full" @keyup.enter="doEncode" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">时区</label>
            <USelect v-model="encTz" :items="TIMEZONES" class="w-full" />
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton icon="i-lucide-arrow-right" color="primary" label="转换" @click="doEncode" />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">转换结果</label>
          <div class="flex items-center gap-2">
            <div :class="[fieldCls, 'flex-1']">{{ encResult || '—' }}</div>
            <USelect v-model="encUnit" :items="unitOptions" class="w-32 shrink-0" />
            <UButton icon="i-lucide-copy" color="neutral" variant="ghost" square :disabled="!encResult" aria-label="复制结果" @click="copy(encResult)" />
          </div>
          <p v-if="encErr" class="mt-1 text-xs text-red-500 dark:text-red-400">{{ encErr }}</p>
        </div>
      </GlassCard>
    </template>

    <!-- 批量转换 -->
    <GlassCard v-else custom-class="p-5 space-y-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-list" class="h-5 w-5 text-vue-500" />
        <h2 class="font-semibold text-slate-800 dark:text-slate-100">批量时间戳转日期时间</h2>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">单位</label>
          <USelect v-model="batchUnit" :items="unitOptions" class="w-full" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">时区</label>
          <USelect v-model="batchTz" :items="TIMEZONES" class="w-full" />
        </div>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">每行一个时间戳</label>
        <UTextarea v-model="batchText" :rows="6" placeholder="1789892355878&#10;1700000000" class="w-full font-mono text-sm" />
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-arrow-right" color="primary" label="转换" @click="doBatch" />
        <UButton v-if="batchRows.length" icon="i-lucide-copy" color="neutral" variant="soft" label="复制全部" @click="copy(batchCopy)" />
      </div>
      <div v-if="batchRows.length" class="overflow-hidden rounded-lg border border-slate-200/70 dark:border-white/10">
        <table class="w-full text-sm">
          <tbody class="divide-y divide-slate-200/60 dark:divide-white/10">
            <tr v-for="(r, i) in batchRows" :key="i">
              <td class="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">{{ r.ts }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums text-slate-800 dark:text-slate-100">{{ r.result }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </GlassCard>

    <p class="text-xs text-slate-400">
      时区换算基于浏览器内置 Intl API，含夏令时自动修正；「当前时间戳」为浏览器本地时间，暂停后数值冻结、可随时「填入当前」。
    </p>
  </div>
</template>

<script setup lang="ts">
import { formatInZone, TIMEZONES, zonedStringToMs } from '~/utils/timezone'

const { copy: copyWithToast } = useCopy()


const fieldCls =
  'min-h-[2.5rem] flex-1 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm tabular-nums text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100'

const unitOptions = [
  { value: 'ms', label: '毫秒 (ms)' },
  { value: 's', label: '秒 (s)' }
]
const tabs = [
  { value: 'single', label: '单个转换' },
  { value: 'batch', label: '批量转换' }
] as const

function copy(text: string): void {
  copyWithToast(text)
}

// —— 当前时间戳（可暂停）——
const nowMs = ref(Date.now())
const paused = ref(false)
const liveUnit = ref<'ms' | 's'>('ms')
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (!paused.value) nowMs.value = Date.now()
  }, 1000)
})
onUnmounted(() => timer && clearInterval(timer))

const displayLive = computed(() =>
  liveUnit.value === 'ms' ? nowMs.value : Math.floor(nowMs.value / 1000)
)
function toggleLiveUnit(): void {
  liveUnit.value = liveUnit.value === 'ms' ? 's' : 'ms'
}

const mode = ref<'single' | 'batch'>('single')

// —— 时间戳 → 日期时间 ——
const decTs = ref('')
const decUnit = ref('ms')
const decTz = ref('Asia/Shanghai')
const decResult = ref('')
const decErr = ref('')

function fillCurrent(): void {
  decTs.value = String(decUnit.value === 'ms' ? nowMs.value : Math.floor(nowMs.value / 1000))
  doDecode()
}
function doDecode(): void {
  const raw = decTs.value.trim()
  const n = Number(raw)
  if (raw === '' || !Number.isFinite(n)) {
    decResult.value = ''
    decErr.value = '请输入有效的时间戳数字'
    return
  }
  decErr.value = ''
  const ms = decUnit.value === 'ms' ? n : n * 1000
  decResult.value = `${formatInZone(ms, decTz.value)}  ·  ${decTz.value}`
}

// —— 日期时间 → 时间戳 ——
const encStr = ref(formatInZone(Date.now(), 'Asia/Shanghai'))
const encTz = ref('Asia/Shanghai')
const encUnit = ref('s')
const encResult = ref('')
const encErr = ref('')

function doEncode(): void {
  const ms = zonedStringToMs(encStr.value, encTz.value)
  if (ms === null) {
    encResult.value = ''
    encErr.value = '格式应为 YYYY-MM-DD HH:mm:ss'
    return
  }
  encErr.value = ''
  encResult.value = String(encUnit.value === 'ms' ? ms : Math.floor(ms / 1000))
}

// —— 批量 ——
const batchText = ref('')
const batchUnit = ref('ms')
const batchTz = ref('Asia/Shanghai')
const batchRows = ref<{ ts: string; result: string }[]>([])

function doBatch(): void {
  const lines = batchText.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  batchRows.value = lines.map((line) => {
    const n = Number(line)
    if (!Number.isFinite(n)) return { ts: line, result: '无效时间戳' }
    const ms = batchUnit.value === 'ms' ? n : n * 1000
    return { ts: line, result: formatInZone(ms, batchTz.value) }
  })
}
const batchCopy = computed(() =>
  batchRows.value.map((r) => `${r.ts} → ${r.result}`).join('\n')
)
</script>
