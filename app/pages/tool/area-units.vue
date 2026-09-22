<template>
  <ToolsUnitConverter
    :units="areaUnits"
    title="面积换算"
    default-id="m2"
    note="1 公顷 = 10000 m² = 15 亩；英亩/平方英尺等为国际常用单位。"
  />
</template>

<script setup lang="ts">
import { areaUnits } from '~/utils/units'

</script>
