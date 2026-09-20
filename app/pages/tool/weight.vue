<template>
  <ToolsUnitConverter
    :units="weightUnits"
    title="质量换算"
    default-id="kg"
    note="换算采用国际标准定义：1 磅 = 0.45359237 千克，1 市斤 = 0.5 千克。结果保留高精度，末尾 0 已省略。"
  />
</template>

<script setup lang="ts">
import { weightUnits } from '~/utils/units'

definePageMeta({ layout: 'tool' })
</script>
