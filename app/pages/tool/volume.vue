<template>
  <ToolsUnitConverter
    :units="volumeUnits"
    title="容量换算"
    default-id="l"
    note="1 美制加仑 = 3.785411784 升，1 英制加仑 = 4.54609 升，汤匙 = 15 mL，茶匙 = 5 mL。"
  />
</template>

<script setup lang="ts">
import { volumeUnits } from '~/utils/units'

definePageMeta({ layout: 'tool' })
</script>
