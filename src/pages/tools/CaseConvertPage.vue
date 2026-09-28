<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { caseStyles, convertAll, inspect } from '~/tools/case-convert'
import { useStored } from '~/composables/useStored'

const source = useStored('tool.case-convert.input', 'user http request id')

const converted = computed(() => convertAll(source.value))
const words = computed(() => inspect(source.value).words)
const detected = computed(() => inspect(source.value).detected)
const detectedLabel = computed(
  () => caseStyles.find((style) => style.id === detected.value)?.label ?? '未识别（混合或含特殊符号）'
)
const isEmpty = computed(() => !source.value.trim())
</script>

<template>
  <ToolShell tool-id="case-convert">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label for="case-input" class="text-sm font-medium text-highlighted">输入</label>
          <UButton
            icon="lucide:eraser"
            label="清空"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="source = ''"
          />
        </div>
        <UTextarea
          id="case-input"
          v-model="source"
          :rows="4"
          placeholder="user_name / HTTPResponseCode / kebab-case / 用户名称…"
          :ui="{ base: 'font-mono text-sm' }"
        />
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="text-muted">识别为：{{ detectedLabel }}</span>
          <template v-if="words.length">
            <span class="text-dimmed">·</span>
            <span class="text-muted">拆出 {{ words.length }} 个词：</span>
            <UBadge v-for="word in words.slice(0, 12)" :key="word" :label="word" color="neutral" variant="subtle" />
          </template>
        </div>
      </section>

      <section class="overflow-hidden rounded-xl border border-default">
        <table class="w-full text-sm">
          <caption class="sr-only">
            各种命名风格下的转换结果
          </caption>
          <thead class="bg-elevated text-left text-xs text-muted">
            <tr>
              <th scope="col" class="px-3 py-2 font-medium">风格</th>
              <th scope="col" class="px-3 py-2 font-medium">结果</th>
              <th scope="col" class="w-24 px-3 py-2 font-medium">
                <span class="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="style in caseStyles" :key="style.id" class="border-t border-default">
              <th scope="row" class="whitespace-nowrap px-3 py-2 text-left font-medium text-highlighted">
                {{ style.label }}
              </th>
              <td class="px-3 py-2">
                <code class="block break-all font-mono text-xs text-default">
                  {{ isEmpty ? '—' : converted[style.id] }}
                </code>
              </td>
              <td class="px-3 py-2">
                <CopyButton :text="converted[style.id]" :disabled="isEmpty" label="复制" size="xs" />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <p class="text-xs text-dimmed">
        中文按整段保留（汉字没有大小写），英文则按「缩写 + 驼峰边界 + 分隔符」拆词后重新拼接；
        输入会自动记在 localStorage，刷新后还在。
      </p>
    </div>
  </ToolShell>
</template>
