<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  applySymbolic, baseOctal, CHMOD_PRESETS, describeMode, fullOctal,
  joinMode, parseOctal, parseSymbolic, specialNames, splitMode,
  toLsString, toSymbolic
} from '~/tools/chmod-calc'
import { useStored } from '~/composables/useStored'

type WhoKey = 'owner' | 'group' | 'other'
type PermissionName = 'read' | 'write' | 'execute'
type SpecialName = 'setuid' | 'setgid' | 'sticky'

const text = useStored('tool.chmod-calc.base', '644')
const expr = useStored('tool.chmod-calc.expr', 'u+x,g-w')

/** 同一个输入框接受 `755` / `0755` / `rwxr-xr-x`：纯数字走八进制，其余走符号串 */
function parseBase(raw: string) {
  const value = raw.trim()
  if (!value) return { ok: false, mode: undefined, error: '请输入权限，例如 755 或 rwxr-xr-x', notes: [] }
  return /^\d{1,4}$/.test(value) || /^0o[0-7]{1,4}$/i.test(value)
    ? parseOctal(value)
    : parseSymbolic(value)
}

const parsed = computed(() => parseBase(text.value))
const effective = computed(() => (parsed.value.ok ? (parsed.value.mode ?? 0) : 0))

function writeMode(mode: number) {
  text.value = mode & 0o7000 ? fullOctal(mode) : baseOctal(mode)
}

const rows = computed(() => describeMode(effective.value))
const bits = computed(() => splitMode(effective.value))

const PERMISSION_BIT: Record<PermissionName, number> = { read: 4, write: 2, execute: 1 }
const SPECIAL_BIT: Record<SpecialName, number> = { setuid: 0o4000, setgid: 0o2000, sticky: 0o1000 }

/** UCheckbox 的事件值类型较宽，非 true 一律按取消处理 */
function toggleBit(whoKey: WhoKey, name: PermissionName, on: unknown) {
  const parts = splitMode(effective.value)
  const mask = PERMISSION_BIT[name]
  parts[whoKey] = on === true ? parts[whoKey] | mask : parts[whoKey] & ~mask
  writeMode(joinMode(parts))
}

function toggleSpecial(name: SpecialName, on: unknown) {
  const mode = on === true ? effective.value | SPECIAL_BIT[name] : effective.value & ~SPECIAL_BIT[name]
  writeMode(mode)
}

const symbolic = computed(() => applySymbolic(effective.value, expr.value))

function applyToBase() {
  if (symbolic.value.ok && symbolic.value.mode !== undefined) writeMode(symbolic.value.mode)
}

const specials = computed(() => specialNames(effective.value))
const presetNote = computed(() => CHMOD_PRESETS.find((item) => item.mode === effective.value)?.note ?? '')

const views = computed(() => [
  { k: `三位八进制 ${baseOctal(effective.value)}`, v: `chmod ${baseOctal(effective.value)} <路径>` },
  { k: `四位八进制 ${fullOctal(effective.value)}`, v: `chmod ${fullOctal(effective.value)} <路径>` },
  { k: `符号串 ${toSymbolic(effective.value)}`, v: 'ls -l 去掉首字符' },
  { k: '普通文件', v: toLsString(effective.value, '-') },
  { k: '目录', v: toLsString(effective.value, 'd') }
])

const report = computed(() => {
  const mode = effective.value
  const lines = [
    `八进制：${baseOctal(mode)}（含特殊位 ${fullOctal(mode)}）`,
    `符号：${toSymbolic(mode)}`,
    `ls -l 文件：${toLsString(mode, '-')}`,
    `ls -l 目录：${toLsString(mode, 'd')}`,
    `命令：chmod ${fullOctal(mode)} <路径>`
  ]
  if (specials.value.length) lines.push(`特殊位：${specials.value.join('；')}`)
  return lines.join('\n')
})
</script>

<template>
  <ToolShell tool-id="chmod-calc">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-sm text-muted">当前权限（八进制或 9/10 位符号串）</span>
          <div class="flex flex-wrap items-center gap-2">
            <UInput
              v-model="text"
              spellcheck="false"
              placeholder="755 或 rwxr-xr-x"
              class="w-48 font-mono"
              :aria-invalid="parsed.ok ? 'false' : 'true'"
              aria-label="当前权限"
            />
            <code class="font-mono text-lg font-semibold text-highlighted">{{ fullOctal(effective) }}</code>
            <code class="font-mono text-lg text-default">{{ toSymbolic(effective) }}</code>
            <CopyButton :text="report" label="复制权限摘要" />
          </div>
        </div>

        <p v-if="!parsed.ok" class="text-sm text-error">{{ parsed.error }}</p>
        <p v-else-if="parsed.notes.length" class="text-xs leading-relaxed text-warning">
          {{ parsed.notes.join('；') }}
        </p>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="preset in CHMOD_PRESETS"
            :key="preset.label"
            :label="preset.label"
            :color="preset.mode === effective ? 'primary' : 'neutral'"
            :variant="preset.mode === effective ? 'soft' : 'subtle'"
            size="sm"
            @click="writeMode(preset.mode)"
          />
        </div>
        <p v-if="presetNote" class="text-xs leading-relaxed text-muted">{{ presetNote }}</p>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
          <h2 class="text-sm font-medium text-highlighted">逐位勾选</h2>
          <div class="overflow-hidden rounded-lg border border-default">
            <div
              v-for="row in rows"
              :key="row.whoKey"
              class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-default px-3 py-2 last:border-b-0"
            >
              <span class="w-24 shrink-0 text-sm text-muted">{{ row.who }}</span>
              <code class="w-10 shrink-0 font-mono text-sm text-default">{{ row.display }}</code>
              <code class="w-6 shrink-0 font-mono text-sm text-dimmed">{{ row.bits }}</code>
              <label class="inline-flex items-center gap-1.5 text-sm">
                <UCheckbox
                  :model-value="row.read"
                  :aria-label="`${row.who} 可读`"
                  @update:model-value="toggleBit(row.whoKey, 'read', $event)"
                />
                r
              </label>
              <label class="inline-flex items-center gap-1.5 text-sm">
                <UCheckbox
                  :model-value="row.write"
                  :aria-label="`${row.who} 可写`"
                  @update:model-value="toggleBit(row.whoKey, 'write', $event)"
                />
                w
              </label>
              <label class="inline-flex items-center gap-1.5 text-sm">
                <UCheckbox
                  :model-value="row.execute"
                  :aria-label="`${row.who} 可执行`"
                  @update:model-value="toggleBit(row.whoKey, 'execute', $event)"
                />
                x
              </label>
            </div>
          </div>

          <div class="flex flex-col gap-2 border-t border-default pt-3">
            <label class="inline-flex items-center gap-2 text-sm">
              <UCheckbox :model-value="bits.setuid" aria-label="setuid 位" @update:model-value="toggleSpecial('setuid', $event)" />
              <span>setuid <code class="font-mono text-xs text-dimmed">4000</code></span>
            </label>
            <label class="inline-flex items-center gap-2 text-sm">
              <UCheckbox :model-value="bits.setgid" aria-label="setgid 位" @update:model-value="toggleSpecial('setgid', $event)" />
              <span>setgid <code class="font-mono text-xs text-dimmed">2000</code></span>
            </label>
            <label class="inline-flex items-center gap-2 text-sm">
              <UCheckbox :model-value="bits.sticky" aria-label="sticky 位" @update:model-value="toggleSpecial('sticky', $event)" />
              <span>sticky <code class="font-mono text-xs text-dimmed">1000</code></span>
            </label>
          </div>

          <p v-if="specials.length" class="text-xs leading-relaxed text-warning">
            {{ specials.join('；') }}
          </p>
        </section>

        <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
          <h2 class="text-sm font-medium text-highlighted">各种写法</h2>
          <dl class="flex flex-col divide-y divide-default overflow-hidden rounded-lg border border-default">
            <div v-for="item in views" :key="item.k" class="flex items-center justify-between gap-3 px-3 py-2">
              <dt class="text-xs text-dimmed">{{ item.k }}</dt>
              <dd class="min-w-0 truncate font-mono text-sm text-default">{{ item.v }}</dd>
            </div>
          </dl>
          <p class="text-xs leading-relaxed text-dimmed">
            同一组权限给文件和目录时含义不同：目录的 x 是「能否进入」，文件的 x 是「能否执行」，
            这也是 <code class="rounded bg-elevated px-1 py-0.5">755</code> 目录与
            <code class="rounded bg-elevated px-1 py-0.5">644</code> 文件常配成一对的原因。
          </p>
        </section>
      </div>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">符号模式逐步推演</h2>
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono text-sm text-dimmed">chmod</span>
          <UInput
            v-model="expr"
            spellcheck="false"
            placeholder="u+x,g-w"
            class="w-56 font-mono"
            aria-label="符号权限表达式"
          />
          <span class="font-mono text-sm text-dimmed">&lt;路径&gt;</span>
          <UButton
            label="把结果写入上方基准"
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="!symbolic.ok"
            @click="applyToBase"
          />
        </div>

        <p v-if="!symbolic.ok" class="text-sm text-error">{{ symbolic.error }}</p>

        <table v-else-if="symbolic.steps.length" class="w-full border-collapse text-sm">
          <caption class="sr-only">每个表达式步骤的前后权限</caption>
          <thead>
            <tr class="border-b border-default text-start text-xs text-dimmed">
              <th scope="col" class="py-1.5 pe-3 text-start font-medium">表达式</th>
              <th scope="col" class="py-1.5 pe-3 text-start font-medium">变化前</th>
              <th scope="col" class="py-1.5 pe-3 text-start font-medium">变化后</th>
              <th scope="col" class="py-1.5 text-start font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(step, index) in symbolic.steps"
              :key="`${step.expr}-${index}`"
              class="border-b border-default last:border-b-0 align-top"
            >
              <td class="py-1.5 pe-3 font-mono text-default">{{ step.expr }}</td>
              <td class="py-1.5 pe-3 font-mono text-xs text-dimmed">{{ step.beforeText }}</td>
              <td class="py-1.5 pe-3 font-mono text-xs text-primary">{{ step.afterText }}</td>
              <td class="py-1.5 text-xs leading-relaxed text-muted">{{ step.note }}</td>
            </tr>
          </tbody>
        </table>

        <p class="text-xs leading-relaxed text-dimmed">
          逗号分隔的表达式按从左到右依次作用在同一条 mode 上，而不是各自基于原始权限。
          刻意不支持三种 GNU 写法：大写 <code class="font-mono">X</code>（要看目标是不是目录）、
          <code class="font-mono">g=u</code> 这类以其他 who 为权限来源、以及
          <code class="font-mono">a=</code> 之后再 <code class="font-mono">u+r</code> 之外的「只加不减」缩写。
        </p>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        权限位是 12 位整数：低 9 位分给 owner / group / other 的 r(4) w(2) x(1)，
        高三位是 setuid / setgid / sticky。注意 <code class="rounded bg-elevated px-1 py-0.5">chmod</code>
        的结果还要受 umask 影响的只有「新建文件默认权限」这一件事，显式指定的 mode 不会被 umask 削减。
        小写 <code class="rounded bg-elevated px-1 py-0.5">s</code> 与
        <code class="rounded bg-elevated px-1 py-0.5">t</code> 表示该节同时有执行位，
        大写 <code class="rounded bg-elevated px-1 py-0.5">S</code>、<code class="rounded bg-elevated px-1 py-0.5">T</code>
        表示特殊位置起但该节没有执行位——这是 <code class="rounded bg-elevated px-1 py-0.5">ls</code>
        的排版约定，不是两套不同的位。
      </p>
    </div>
  </ToolShell>
</template>
