<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { cheatsheet, regexFlags, replacePreview, runRegex } from '~/tools/regex'
import { useStored } from '~/composables/useStored'

const pattern = useStored('tool.regex.pattern', String.raw`(?<year>\d{4})-(\d{2})-(\d{2})`)
const activeFlags = useStored<string[]>('tool.regex.flags', ['g'])
const subject = useStored(
  'tool.regex.subject',
  '上线日期 2026-09-23，回滚 2025-01-05\n截止 2027-12-31 之前需要复核'
)
const replacement = useStored('tool.regex.replacement', '$<year>/$2/$3')

const flags = computed(() => activeFlags.value.join(''))
const outcome = computed(() => runRegex(pattern.value, flags.value, subject.value))
const replaced = computed(() => replacePreview(pattern.value, flags.value, subject.value, replacement.value))
const groupCount = computed(() => outcome.value.ok && outcome.value.matches[0] ? outcome.value.matches[0].groups.length : 0)

function toggleFlag(flag: string) {
  const next = new Set(activeFlags.value)
  if (next.has(flag)) next.delete(flag)
  else next.add(flag)
  activeFlags.value = regexFlags.map((item) => item.flag).filter((item) => next.has(item))
}
</script>

<template>
  <ToolShell tool-id="regex">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span class="shrink-0 font-mono text-lg text-dimmed">/</span>
          <UInput
            v-model="pattern"
            size="lg"
            class="min-w-0 flex-1"
            placeholder="\\d{4}-(0[1-9]|1[0-2])-([0-2]\\d|3[01])"
            :ui="{ base: 'font-mono' }"
            aria-label="正则表达式"
          />
          <span class="shrink-0 font-mono text-lg text-dimmed">/{{ flags }}</span>
        </div>

        <div class="flex flex-wrap gap-2" role="group" aria-label="标志位">
          <button
            v-for="item in regexFlags"
            :key="item.flag"
            type="button"
            class="inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 font-mono text-xs transition-colors"
            :class="
              activeFlags.includes(item.flag)
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-default bg-elevated text-muted hover:text-default'
            "
            :title="item.note"
            :aria-pressed="activeFlags.includes(item.flag)"
            @click="toggleFlag(item.flag)"
          >
            {{ item.flag }}
            <span class="font-sans text-dimmed">{{ item.label }}</span>
          </button>
        </div>

        <UAlert
          v-if="!outcome.ok"
          color="error"
          variant="subtle"
          icon="lucide:circle-alert"
          title="表达式无效"
          :description="outcome.error"
        />
      </section>

      <section class="grid gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">测试文本</h2>
          <UTextarea
            v-model="subject"
            :rows="10"
            :ui="{ base: 'font-mono text-xs leading-6' }"
            placeholder="粘贴要匹配的文本…"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-highlighted">匹配高亮</h2>
            <UBadge
              v-if="outcome.ok"
              :label="outcome.truncated ? `前 ${outcome.matches.length} 处（已截断）` : `${outcome.matches.length} 处匹配`"
              :color="outcome.matches.length ? 'primary' : 'neutral'"
              variant="subtle"
            />
          </div>
          <pre
            v-if="outcome.ok"
            class="min-h-40 w-full overflow-auto whitespace-pre-wrap break-all rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-6 text-default"
          ><template v-for="(segment, index) in outcome.segments"><mark
            v-if="segment.type === 'match'"
            :key="index"
            class="rounded bg-primary/25 px-0.5 text-highlighted"
            >{{ segment.value || '∅' }}</mark
          ><span v-else :key="`t${index}`">{{ segment.value }}</span></template></pre>
        </div>
      </section>

      <section v-if="outcome.ok && outcome.matches.length" class="flex flex-col gap-2">
        <h2 class="text-sm font-medium text-highlighted">
          匹配明细<span v-if="groupCount" class="ms-1 text-xs text-dimmed">（{{ groupCount }} 个捕获组）</span>
        </h2>
        <div class="overflow-hidden rounded-xl border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated text-left text-xs text-muted">
              <tr>
                <th scope="col" class="w-12 px-3 py-2 font-medium">#</th>
                <th scope="col" class="w-16 px-3 py-2 font-medium">位置</th>
                <th scope="col" class="px-3 py-2 font-medium">整体匹配</th>
                <th scope="col" class="px-3 py-2 font-medium">捕获组</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(match, index) in outcome.matches.slice(0, 100)" :key="index" class="border-t border-default">
                <td class="px-3 py-2 text-xs text-dimmed">{{ index + 1 }}</td>
                <td class="px-3 py-2 font-mono text-xs text-dimmed">{{ match.index }}</td>
                <td class="px-3 py-2 break-all font-mono text-xs text-default">{{ match.full || '∅' }}</td>
                <td class="px-3 py-2">
                  <ul class="flex flex-col gap-0.5">
                    <li v-for="(group, gi) in match.groups" :key="gi" class="font-mono text-xs">
                      <span class="text-dimmed">${{ gi + 1 }} = </span>
                      <span class="text-default">{{ group ?? 'undefined' }}</span>
                    </li>
                    <li v-for="(value, name) in match.named" :key="`n-${name}`" class="font-mono text-xs">
                      <span class="text-primary">{{ name }}</span>
                      <span class="text-dimmed"> = </span>
                      <span class="text-default">{{ value }}</span>
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="outcome.matches.length > 100" class="text-xs text-dimmed">仅列出前 100 条。</p>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">替换预览</h2>
        <UInput
          v-model="replacement"
          size="lg"
          placeholder="$1_$2 或 $<year>/$2/$3"
          :ui="{ base: 'font-mono' }"
          aria-label="替换字符串"
        />
        <div class="flex items-start gap-2">
          <pre
            class="min-h-16 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-6 text-default"
            >{{ replaced }}</pre
          >
          <CopyButton :text="replaced" size="xs" />
        </div>
      </section>

      <details class="rounded-xl border border-default p-4">
        <summary class="cursor-pointer text-sm font-medium text-highlighted">常用片段速查</summary>
        <dl class="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <div v-for="row in cheatsheet" :key="row.token" class="flex min-w-0 gap-3">
            <code class="shrink-0 rounded bg-elevated px-1.5 py-0.5 font-mono text-xs text-primary">{{ row.token }}</code>
            <dd class="min-w-0 text-xs text-muted">{{ row.meaning }}</dd>
          </div>
        </dl>
      </details>

      <p class="text-xs text-dimmed">
        使用 <code class="rounded bg-elevated px-1 py-0.5">new RegExp</code> 逐次
        <code class="rounded bg-elevated px-1 py-0.5">exec</code>，零宽匹配会手动前移以避免死循环，超过 2000 条自动截断。
        含嵌套量词的模式（如 <code class="rounded bg-elevated px-1 py-0.5">(a+)+b</code>）可能卡住页面，请谨慎。
      </p>
    </div>
  </ToolShell>
</template>
