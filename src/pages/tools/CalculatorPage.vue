<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { calculate, functionNames } from '~/tools/calculator'
import { useStored } from '~/composables/useStored'

interface HistoryItem {
  expr: string
  result: string
}

const expression = useStored('tool.calculator.expr', '')
const history = useStored<HistoryItem[]>('tool.calculator.history', [])
const box = ref<HTMLDivElement>()

const evaluation = computed(() => calculate(expression.value))
const answer = computed(() => (evaluation.value.ok ? evaluation.value.grouped : ''))

const nativeInput = (): HTMLInputElement | undefined => box.value?.querySelector('input') ?? undefined

/** 写回 v-model 后在下一帧（微任务）恢复光标，点号/函数键插入的位置才跟手 */
function write(next: string, caret: number) {
  expression.value = next
  void nextTick(() => {
    const input = nativeInput()
    if (!input) return
    input.focus()
    input.setSelectionRange(caret, caret)
  })
}

/** 光标处插入（而不是只追加到末尾），方便回填历史后局部改算式 */
function insert(text: string) {
  const input = nativeInput()
  const start = input?.selectionStart ?? expression.value.length
  const end = input?.selectionEnd ?? start
  write(expression.value.slice(0, start) + text + expression.value.slice(end), start + text.length)
}

function clearAll() {
  write('', 0)
}

function backspace() {
  const input = nativeInput()
  const end = input?.selectionEnd ?? expression.value.length
  const start = input?.selectionStart ?? end
  if (start !== end) {
    write(expression.value.slice(0, start) + expression.value.slice(end), start)
    return
  }
  const at = Math.max(0, start - 1)
  write(expression.value.slice(0, at) + expression.value.slice(start), at)
}

function commit() {
  if (!evaluation.value.ok) return
  const item: HistoryItem = { expr: expression.value.trim(), result: evaluation.value.formatted }
  history.value = [item, ...history.value.filter((entry) => entry.expr !== item.expr)].slice(0, 20)
  // 结果续算：把格式化结果放回输入框，光标停在末尾以便直接接运算符
  write(item.result, item.result.length)
}

const keypad: { label: string; title: string; insert?: string; action?: 'clear' | 'back' | 'equals' }[] = [
  { label: 'C', title: '清空', action: 'clear' },
  { label: '(', title: '左括号', insert: '(' },
  { label: ')', title: '右括号', insert: ')' },
  { label: '⌫', title: '退格', action: 'back' },
  { label: '7', title: '7', insert: '7' },
  { label: '8', title: '8', insert: '8' },
  { label: '9', title: '9', insert: '9' },
  { label: '÷', title: '除', insert: '/' },
  { label: '4', title: '4', insert: '4' },
  { label: '5', title: '5', insert: '5' },
  { label: '6', title: '6', insert: '6' },
  { label: '×', title: '乘', insert: '*' },
  { label: '1', title: '1', insert: '1' },
  { label: '2', title: '2', insert: '2' },
  { label: '3', title: '3', insert: '3' },
  { label: '−', title: '减', insert: '-' },
  { label: '0', title: '0', insert: '0' },
  { label: '.', title: '小数点', insert: '.' },
  { label: '%', title: '取余', insert: '%' },
  { label: '+', title: '加', insert: '+' },
  { label: '^', title: '幂', insert: '^' },
  { label: 'π', title: '圆周率', insert: 'pi' },
  { label: 'e', title: '自然常数', insert: 'e' },
  { label: '=', title: '计算并续算', action: 'equals' }
]

function press(key: (typeof keypad)[number]) {
  if (key.action === 'clear') return clearAll()
  if (key.action === 'back') return backspace()
  if (key.action === 'equals') return commit()
  insert(key.insert as string)
}

const functions = computed(() =>
  functionNames.map((name) => ({ name, label: `${name}(`, insert: `${name}(` }))
)

function restore(item: HistoryItem) {
  write(item.expr, item.expr.length)
}
</script>

<template>
  <ToolShell tool-id="calculator">
    <div class="flex flex-col gap-4">
      <div ref="box" class="flex flex-col gap-2">
        <label class="text-sm text-muted" for="calc-expr">表达式</label>
        <input
          id="calc-expr"
          v-model="expression"
          type="text"
          autofocus
          spellcheck="false"
          autocomplete="off"
          placeholder="例如 (3 + 4) * 2 ^ 3 - sqrt(81) / 3"
          class="h-12 w-full rounded-lg border border-default bg-elevated px-3 font-mono text-base text-default outline-none transition-colors focus:border-primary/50"
          :aria-invalid="evaluation.ok ? 'false' : 'true'"
          @keydown.enter.prevent="commit"
        />
      </div>

      <section
        class="flex flex-wrap items-center gap-3 rounded-xl border border-default bg-elevated p-4"
        aria-live="polite"
      >
        <div class="min-w-0 flex-1">
          <p class="text-xs text-dimmed">结果</p>
          <p v-if="evaluation.ok" class="mt-1 break-all font-mono text-2xl font-bold text-highlighted sm:text-3xl">
            {{ answer }}
          </p>
          <p v-else class="mt-1 text-sm text-error">{{ evaluation.error }}</p>
        </div>
        <CopyButton v-if="evaluation.ok" :text="evaluation.formatted" label="复制精确值" size="sm" />
      </section>

      <div class="grid grid-cols-4 gap-2 sm:max-w-md">
        <UButton
          v-for="key in keypad"
          :key="key.label"
          type="button"
          :label="key.label"
          :title="key.title"
          :aria-label="key.title"
          size="lg"
          block
          :color="key.action === 'equals' ? 'primary' : 'neutral'"
          :variant="key.action === 'equals' ? 'solid' : 'outline'"
          :class="key.action === 'equals' ? '' : 'justify-center font-mono'"
          @click="press(key)"
        />
      </div>

      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="fn in functions"
          :key="fn.name"
          type="button"
          :label="fn.label"
          size="xs"
          color="neutral"
          variant="subtle"
          class="font-mono"
          @click="insert(fn.insert)"
        />
      </div>

      <p class="text-xs leading-relaxed text-dimmed">
        支持 <code class="rounded bg-elevated px-1 py-0.5">+ - * / % ^ ( )</code>、一元负号与
        <code class="rounded bg-elevated px-1 py-0.5">{{ functions.length }}</code> 个函数；
        <code class="rounded bg-elevated px-1 py-0.5">%</code> 是取余而非百分比。
        全角的 <code class="rounded bg-elevated px-1 py-0.5">（）×÷</code> 与千分位逗号会先归一再解析。
        一元负号比幂松，所以 <code class="rounded bg-elevated px-1 py-0.5">-2^2 = -4</code>。
        结果按 12 位有效数字四舍五入，可消除 <code class="rounded bg-elevated px-1 py-0.5">0.1 + 0.2</code> 的浮点尾差；
        超过 1e12 或小于 1e-6 时改用科学计数法，不展示补零的无效位数。
      </p>

      <section v-if="history.length" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">历史</h2>
          <span class="text-xs text-dimmed">{{ history.length }} / 20</span>
          <UButton
            icon="lucide:eraser"
            label="清空历史"
            size="xs"
            color="neutral"
            variant="ghost"
            class="ms-auto"
            @click="history = []"
          />
        </div>
        <ul class="flex flex-col overflow-hidden rounded-xl border border-default">
          <li
            v-for="item in history"
            :key="item.expr"
            class="flex items-center gap-3 border-b border-default px-3 py-2 last:border-b-0 hover:bg-elevated"
          >
            <code class="min-w-0 flex-1 truncate font-mono text-sm text-muted">{{ item.expr }}</code>
            <code class="shrink-0 font-mono text-sm font-semibold text-default">= {{ item.result }}</code>
            <UButton label="用" size="xs" color="neutral" variant="ghost" @click="restore(item)" />
          </li>
        </ul>
      </section>
    </div>
  </ToolShell>
</template>
