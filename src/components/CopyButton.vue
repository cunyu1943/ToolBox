<script setup lang="ts">
import { computed } from 'vue'
import { useCopy } from '~/composables/useCopy'

const props = withDefaults(
  defineProps<{ text: string; label?: string; size?: 'xs' | 'sm' | 'md'; disabled?: boolean }>(),
  { label: '复制', size: 'sm', disabled: false }
)

const { copied, failed, copy } = useCopy()

const buttonLabel = computed(() => {
  if (!props.label) return ''
  if (copied.value) return '已复制'
  if (failed.value) return '请手动复制'
  return props.label
})

function onClick() {
  if (props.disabled) return
  void copy(props.text)
}
</script>

<template>
  <UButton
    :icon="copied ? 'lucide:check' : failed ? 'lucide:circle-alert' : 'lucide:copy'"
    :label="buttonLabel"
    :size="size"
    :disabled="disabled"
    color="neutral"
    :variant="copied ? 'soft' : 'outline'"
    type="button"
    @click="onClick"
  />
</template>
