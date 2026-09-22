<template>
  <div class="space-y-4">
    <!-- 字长 / 符号 -->
    <GlassCard custom-class="p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-slate-500 dark:text-slate-400">字长</span>
          <button
            v-for="b in WORD_SIZES"
            :key="b"
            type="button"
            class="rounded-lg px-2.5 py-1 font-medium transition-all"
            :class="bits === b ? 'bg-vue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300'"
            @click="setBits(b)"
          >
            {{ b }} 位
          </button>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <span class="text-slate-500 dark:text-slate-400">有符号</span>
          <USwitch v-model="signed" color="primary" />
        </label>
      </div>
    </GlassCard>

    <!-- 四进制实时联动输入 -->
    <GlassCard custom-class="p-4 space-y-3">
      <div v-for="f in FIELDS" :key="f.key" class="flex items-center gap-3">
        <span class="w-12 shrink-0 text-xs font-semibold uppercase text-slate-400">{{ f.short }}</span>
        <input
          v-model="drafts[f.key]"
          class="w-full rounded-lg border px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2"
          :class="drafts[f.key] && !isValidInput(f.key, drafts[f.key])
            ? 'border-red-400 ring-red-300 dark:border-red-500'
            : 'border-slate-200 focus-visible:ring-vue-400 dark:border-white/10 dark:bg-white/5'"
          :placeholder="`输入${f.label}`"
          spellcheck="false"
          @input="onRadixInput(f.key)"
          @blur="syncDrafts()"
        />
      </div>
      <p v-if="lastError" class="text-xs text-red-500">{{ lastError }}</p>
    </GlassCard>

    <!-- 位运算 -->
    <GlassCard custom-class="p-4 space-y-3">
      <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-300">位运算</h3>
      <div class="flex items-center gap-2">
        <span class="font-mono text-sm">{{ signedDisplay }}</span>
        <select v-model="op" class="rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-sm dark:border-white/10 dark:bg-slate-900">
          <option v-for="o in OPS" :key="o.v" :value="o.v">{{ o.label }}</option>
        </select>
      </div>
      <div v-if="op !== 'not'" class="flex items-center gap-2">
        <span class="text-xs text-slate-400">操作数</span>
        <input
          v-model="operand"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm dark:border-white/10 dark:bg-white/5"
          placeholder="十进制操作数 / 移位位数"
        />
      </div>
      <UButton label="应用运算" icon="i-lucide-binary" color="primary" variant="soft" size="sm" @click="applyBitwise" />
    </GlassCard>

    <!-- ASCII + 字节换算 -->
    <GlassCard custom-class="p-4">
      <h3 class="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">ASCII 字符 ↔ 码值</h3>
      <div class="grid grid-cols-2 gap-3">
        <UInput v-model="asciiChar" placeholder="字符" :maxlength="1" />
        <UInput v-model="asciiCode" type="number" placeholder="码值 0–1114111" />
      </div>
      <div class="mt-5 mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-300">字节单位换算</h3>
        <div class="flex items-center gap-2">
          <input v-model="bytesNum" type="number" class="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5" />
          <USelect v-model="bytesUnit" :items="byteUnitOptions" class="w-24" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div v-for="u in byteResults" :key="u.label">
          <span class="text-slate-400">{{ u.label }}: </span>
          <span class="font-mono">{{ u.value }}</span>
        </div>
      </div>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
import {
  applyBitwise as applyBitwiseCalc,
  BYTE_UNITS,
  convertBytes,
  formatRadix,
  isValidRadixInput,
  parseRadixInput,
  toSignedString,
  truncate,
  type BitOp,
  type ByteUnit,
  type RadixKey
} from '~/utils/programmer'


const WORD_SIZES = [8, 16, 32, 64] as const
type Bits = (typeof WORD_SIZES)[number]

const bits = ref<Bits>(32)
const signed = ref(false)
// 规范值：始终保存为「无符号、已按字长截断」的 BigInt
const value = ref<bigint>(10n)

const FIELDS = [
  { key: 'dec', label: '十进制', short: 'DEC' },
  { key: 'hex', label: '十六进制', short: 'HEX' },
  { key: 'oct', label: '八进制', short: 'OCT' },
  { key: 'bin', label: '二进制', short: 'BIN' }
] as const

const drafts = reactive<Record<RadixKey, string>>({ dec: '', hex: '', oct: '', bin: '' })
const lastError = ref('')

/** 当前规范值按有符号/无符号解释的十进制展示 */
const signedDisplay = computed(() =>
  signed.value ? toSignedString(value.value, bits.value) : value.value.toString(10)
)

function syncDrafts() {
  drafts.dec = signedDisplay.value
  drafts.hex = formatRadix(value.value, 'hex', false, bits.value)
  drafts.oct = formatRadix(value.value, 'oct', false, bits.value)
  drafts.bin = formatRadix(value.value, 'bin', false, bits.value)
}
watch([value, signed, bits], syncDrafts, { immediate: true })

function isValidInput(key: RadixKey, str: string): boolean {
  return isValidRadixInput(key, str)
}

function onRadixInput(key: RadixKey) {
  const r = parseRadixInput(key, drafts[key], bits.value)
  lastError.value = r.error
  if (r.value !== null) value.value = r.value
}

function setBits(b: Bits) {
  bits.value = b
  value.value = truncate(value.value, b)
}

const OPS = [
  { v: 'and', label: 'AND' },
  { v: 'or', label: 'OR' },
  { v: 'xor', label: 'XOR' },
  { v: 'not', label: 'NOT' },
  { v: 'shl', label: '左移 <<' },
  { v: 'shr', label: '右移 >>' }
] as const
type Op = (typeof OPS)[number]['v']
const op = ref<Op>('and')
const operand = ref('2')

function applyBitwise() {
  const r = applyBitwiseCalc(value.value, op.value as BitOp, operand.value, bits.value)
  lastError.value = r.error
  value.value = r.value
}

// ASCII 双向（加锁避免相互触发死循环）
const asciiChar = ref('A')
const asciiCode = ref('65')
let asciiLock = false
watch(asciiChar, (c) => {
  if (asciiLock) return
  const code = c.codePointAt(0)
  asciiLock = true
  asciiCode.value = code === undefined ? '' : String(code)
  asciiLock = false
})
watch(asciiCode, (c) => {
  if (asciiLock) return
  const n = Number(c)
  if (Number.isInteger(n) && n >= 0 && n <= 0x10ffff) {
    asciiLock = true
    asciiChar.value = String.fromCodePoint(n)
    asciiLock = false
  }
})

// 字节单位换算（委托 utils，1 KB = 1024 B）
const bytesNum = ref<number | string>(1)
const bytesUnit = ref<ByteUnit>('MB')
const byteUnitOptions = Array.from(BYTE_UNITS)
const byteResults = computed(() => {
  const res = convertBytes(Number(bytesNum.value) || 0, bytesUnit.value)
  return BYTE_UNITS.map((k) => ({ label: k, value: res[k] }))
})
</script>
