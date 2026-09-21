<template>
  <ToolsUnitConverter
    :units="storageUnits"
    title="存储换算"
    default-id="GB"
    note="十进制 SI（KB=1000B，硬盘厂商标法）与二进制 IEC（KiB=1024B，系统显示）并列展示，1 字节 = 8 位。"
  />
</template>

<script setup lang="ts">
import { storageUnits } from '~/utils/units'

definePageMeta({ layout: 'tool' })
</script>
