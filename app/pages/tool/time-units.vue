<template>
  <ToolsUnitConverter
    :units="timeUnits"
    title="时间换算"
    default-id="h"
    note="月按 30 天、年按 365 天近似（不含闰年与日历月差异）；纳秒/微秒适合性能计时场景。"
  />
</template>

<script setup lang="ts">
import { timeUnits } from '~/utils/units'

</script>
