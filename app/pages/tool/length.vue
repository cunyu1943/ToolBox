<template>
  <ToolsUnitConverter
    :units="lengthUnits"
    title="长度换算"
    default-id="m"
    note="英制与国际标准定义：1 英寸 = 2.54 厘米，1 英尺 = 12 英寸；1 市尺 = 1/3 米。结果保留高精度，末尾 0 已省略。"
  />
</template>

<script setup lang="ts">
import { lengthUnits } from '~/utils/units'

definePageMeta({ layout: 'tool' })
</script>
