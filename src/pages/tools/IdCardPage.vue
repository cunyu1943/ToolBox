<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolShell from '~/components/ToolShell.vue'
import { ID_SAMPLES, parseIdCard } from '~/tools/id-card'
import { formatIso, parseDateText, partsOf } from '~/tools/date-diff'
import { useStored } from '~/composables/useStored'

/** 身份证号刻意不写 localStorage：它和姓名、手机号能直接拼成实名信息 */
const idText = ref('')
const showFull = ref(false)
const refText = useStored('tool.id-card.ref', formatIso(partsOf(Date.now())))

const refDate = computed(() => {
  const parsed = parseDateText(refText.value ?? '')
  return parsed.ok && parsed.parts ? parsed.parts : partsOf(Date.now())
})

const result = computed(() => parseIdCard(idText.value, refDate.value))
const ok = computed(() => (result.value.ok ? result.value : null))

const rows = computed(() => {
  if (!ok.value) return []
  const r = ok.value
  return [
    { label: '归属地（省级）', value: `${r.province}（${r.regionCode}）` },
    { label: '出生日期', value: `${r.birthText} · ${r.weekday}` },
    { label: '性别', value: `${r.gender}（第 17 位 ${r.id18[16]}，${Number(r.id18[16]) % 2 === 1 ? '奇数为男' : '偶数为女'}）` },
    { label: '周岁', value: `满 ${r.age} 岁${r.daysToNextBirthday > 0 ? `，距下次生日 ${r.daysToNextBirthday} 天` : '，今天正是生日'}` },
    { label: '生肖 / 星座', value: `${r.zodiac} · ${r.sign}` },
    { label: '顺序码', value: r.orderCode },
    { label: '校验位', value: `应为 ${r.expectedCheckCode}，实为 ${r.actualCheckCode}` }
  ]
})

function fillSample(id: string): void {
  idText.value = id
}
</script>

<template>
  <ToolShell tool-id="id-card">
    <div class="flex flex-wrap items-end gap-2">
      <UFormField label="身份证号（18 位，或一代证 15 位）" class="w-96 max-w-full">
        <UInput
          v-model="idText"
          size="lg"
          class="w-full font-mono"
          placeholder="11010519491231002X"
          autocomplete="off"
          spellcheck="false"
        />
      </UFormField>
      <UFormField label="参考日期" class="w-44">
        <UInput v-model="refText" size="lg" class="w-full font-mono" />
      </UFormField>
      <UButton
        v-for="sample in ID_SAMPLES"
        :key="sample.label"
        :label="sample.label"
        size="xs"
        color="neutral"
        variant="subtle"
        @click="fillSample(sample.id)"
      />
    </div>

    <UAlert
      v-if="idText && !ok"
      color="error"
      variant="subtle"
      icon="lucide:circle-alert"
      title="校验未通过"
      :description="result.error"
    />

    <template v-if="ok">
      <div class="flex flex-wrap items-center gap-3">
        <UBadge
          :label="ok.checksumOk ? '校验位正确' : `校验位应为 ${ok.expectedCheckCode}`"
          :color="ok.checksumOk ? 'success' : 'error'"
          variant="soft"
          size="lg"
        />
        <UBadge v-if="ok.upgraded" label="由 15 位升位得到" color="warning" variant="soft" size="lg" />
        <div class="flex items-center gap-2">
          <p class="font-mono text-lg text-highlighted">
            {{ showFull ? ok.id18 : ok.masked }}
          </p>
          <UButton
            :icon="showFull ? 'lucide:eye-off' : 'lucide:eye'"
            :label="showFull ? '打码' : '显示完整'"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="showFull = !showFull"
          />
        </div>
      </div>

      <dl class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        <div v-for="row in rows" :key="row.label" class="flex flex-wrap items-baseline gap-2 border-b border-default pb-1">
          <dt class="w-32 shrink-0 text-xs text-muted">{{ row.label }}</dt>
          <dd class="font-mono text-sm text-default">{{ row.value }}</dd>
        </div>
      </dl>

      <ul class="flex flex-col gap-1 text-xs text-muted">
        <li v-for="note in ok.notes" :key="note">· {{ note }}</li>
      </ul>
    </template>

    <p class="text-xs text-dimmed">
      只做本地算法核验（GB 11643—1999 的 MOD 11-2 校验位），不查询任何公安数据库，也无法判断号码是否真实在册。
      本页不保存身份证号：输入框内容不落 localStorage，刷新即清空。
    </p>
  </ToolShell>
</template>
