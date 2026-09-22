<template>
  <ToolsUnitConverter
    :units="speedUnits"
    title="速度换算"
    default-id="kmh"
    note="1 节 = 1 海里/时 ≈ 1.852 km/h；mph 为英里/时，常用于车速与风速。"
  />
</template>

<script setup lang="ts">
import { speedUnits } from '~/utils/units'

</script>
