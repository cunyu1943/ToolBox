<template>
  <div class="space-y-1.5">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-slate-600 dark:text-slate-300"
    >
      {{ label }}
    </label>

    <div class="relative">
      <UInput
        :id="inputId"
        v-model="raw"
        :type="type"
        :inputmode="numeric ? 'decimal' : undefined"
        :placeholder="placeholder"
        :size="size"
        :disabled="disabled"
        :error="!!error"
        class="w-full"
        :class="{ 'pr-14': unit }"
        @blur="onBlur"
      />
      <span
        v-if="unit"
        class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400"
      >
        {{ unit }}
      </span>
    </div>

    <p
      v-if="error"
      class="text-xs text-red-500 dark:text-red-400"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * 带单位与范围校验的数字输入。
 * 内部以字符串维护原始输入（便于输入中间态），对外通过 modelValue(number|null) 同步。
 */
const props = withDefaults(
  defineProps<{
    modelValue: number | null
    label?: string
    unit?: string
    placeholder?: string
    min?: number
    max?: number
    integer?: boolean
    size?: 'xs' | 'sm' | 'md' | 'lg'
    disabled?: boolean
    id?: string
  }>(),
  {
    label: '',
    unit: '',
    placeholder: '请输入',
    size: 'md',
    disabled: false
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const inputId = props.id || `nf-${Math.random().toString(36).slice(2, 8)}`
const numeric = true
const type = 'text'
const error = ref<string>('')

// 同步初始值
const raw = ref(props.modelValue === null ? '' : String(props.modelValue))

function validate(v: string): { value: number | null; message: string } {
  if (v.trim() === '') return { value: null, message: '' }
  const num = Number(v)
  if (!Number.isFinite(num)) return { value: null, message: '请输入有效数字' }
  if (props.integer && !Number.isInteger(num)) return { value: num, message: '请输入整数' }
  if (props.min !== undefined && num < props.min)
    return { value: num, message: `不能小于 ${props.min}` }
  if (props.max !== undefined && num > props.max)
    return { value: num, message: `不能大于 ${props.max}` }
  return { value: num, message: '' }
}

function commit() {
  const { value, message } = validate(raw.value)
  error.value = message
  emit('update:modelValue', value)
}

function onBlur() {
  commit()
}

// 实时同步（无错误时）
watch(raw, (v) => {
  const { value, message } = validate(v)
  error.value = message
  if (!message) emit('update:modelValue', value)
})

watch(
  () => props.modelValue,
  (v) => {
    const asStr = v === null ? '' : String(v)
    if (asStr !== raw.value) raw.value = asStr
  }
)
</script>
