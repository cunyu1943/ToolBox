<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  buildGradient,
  checkColor,
  DIRECTIONS,
  GRADIENT_SAMPLES,
  parseGradient,
  randomSeed,
  randomStops,
  RADIAL_SIZES,
  resolvedStops,
  sampleGradient,
  type GradientKind,
  type Stop
} from '~/tools/gradient'
import { useStored } from '~/composables/useStored'

const kinds: { label: string; value: GradientKind }[] = [
  { label: '线性', value: 'linear' },
  { label: '径向', value: 'radial' },
  { label: '锥形', value: 'conic' }
]
const shapes: { label: string; value: 'circle' | 'ellipse' }[] = [
  { label: 'circle', value: 'circle' },
  { label: 'ellipse', value: 'ellipse' }
]

const kind = useStored<GradientKind>('tool.gradient.kind', 'linear')
const repeating = useStored('tool.gradient.repeating', false)
const angle = useStored('tool.gradient.angle', 90)
const direction = useStored('tool.gradient.direction', '')
const shape = useStored<'circle' | 'ellipse'>('tool.gradient.shape', 'ellipse')
const size = useStored('tool.gradient.size', 'farthest-corner')
const center = useStored('tool.gradient.center', 'center')
const stops = useStored<Stop[]>('tool.gradient.stops', [
  { color: '#42b883', pos: 0 },
  { color: '#35495e', pos: 100 }
])
const sampleCount = useStored('tool.gradient.sample-count', 9)
const paste = ref('')

const spec = computed(() => ({
  kind: kind.value,
  repeating: repeating.value,
  angle: angle.value,
  direction: direction.value,
  shape: shape.value,
  size: size.value,
  center: center.value,
  stops: stops.value
}))

const built = computed(() => buildGradient(spec.value))
const css = computed(() => built.value.css)
const filled = computed(() => resolvedStops(stops.value))
const checked = computed(() => stops.value.map((stop) => checkColor(stop.color)))
const badColor = computed(() => checked.value.find((item) => !item.ok)?.error)
const opaque = computed(() => checked.value.some((item) => item.opaque))

const preview = computed(() => (built.value.ok ? built.value.body : 'none'))

const graded = computed(() => {
  if (!built.value.ok) return []
  const result = sampleGradient(stops.value, sampleCount.value)
  return result.ok ? result.samples : []
})

const pasteResult = computed(() => (paste.value.trim() ? parseGradient(paste.value) : undefined))

function applyPaste(): void {
  const result = pasteResult.value
  if (!result || !result.ok) return
  kind.value = result.spec.kind
  repeating.value = result.spec.repeating
  angle.value = result.spec.angle
  direction.value = result.spec.direction
  shape.value = result.spec.shape
  size.value = result.spec.size
  center.value = result.spec.center
  stops.value = result.spec.stops.map((stop) => ({ ...stop }))
  paste.value = ''
}

function addStop(): void {
  const positions = stops.value.map((stop) => stop.pos).filter((pos): pos is number => pos !== null)
  const tail = (positions[positions.length - 1] ?? 100) + 10
  stops.value = [...stops.value, { color: (stops.value[stops.value.length - 1] ?? { color: '#35495e' }).color, pos: Math.min(100, tail) }]
}

/** 取样色块上的文字要能看清：按 hex 的相对亮度选黑或白 */
function textOn(hex: string): string {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16) / 255)
  const channel = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channel(r as number) + 0.7152 * channel(g as number) + 0.0722 * channel(b as number)
  return luminance > 0.45 ? '#000' : '#fff'
}

function removeStop(index: number): void {
  if (stops.value.length <= 2) return
  stops.value = stops.value.filter((_, position) => position !== index)
}

function move(index: number, delta: number): void {
  const target = index + delta
  if (target < 0 || target >= stops.value.length) return
  const next = [...stops.value]
  const moved = next.splice(index, 1)[0] as Stop
  next.splice(target, 0, moved)
  stops.value = next
}
</script>

<template>
  <ToolShell tool-id="gradient">
    <div class="flex flex-col gap-4">
      <div
        class="h-40 w-full rounded-xl border border-default shadow-sm transition-all duration-200"
        :style="{ backgroundImage: preview }"
      >
        <span v-if="!built.ok" class="block p-3 text-xs text-error">{{ built.error }}</span>
      </div>

      <section class="flex flex-wrap items-end gap-3 rounded-xl border border-default p-3">
        <UFormField label="类型" class="w-40">
          <USelect v-model="kind" :items="kinds" size="sm" />
        </UFormField>
        <UCheckbox v-model="repeating" label="repeating" size="sm" />

        <template v-if="kind !== 'radial'">
          <UFormField label="角度 (deg)" class="w-28">
            <UInputNumber v-model="angle" :step="15" :min="-1080" :max="1080" size="sm" class="w-full" />
          </UFormField>
        </template>
        <UFormField v-if="kind === 'linear'" label="关键字方向（优先于角度）" class="w-44">
          <USelect v-model="direction" :items="['（不用）', ...DIRECTIONS]" size="sm" />
        </UFormField>

        <template v-if="kind === 'radial'">
          <UFormField label="形状" class="w-28">
            <USelect v-model="shape" :items="shapes" size="sm" />
          </UFormField>
          <UFormField label="尺寸" class="w-44">
            <USelect v-model="size" :items="RADIAL_SIZES" size="sm" />
          </UFormField>
        </template>
        <UFormField v-if="kind !== 'linear'" label="中心" class="w-40">
          <UInput v-model="center" placeholder="center / 20% 30%" size="sm" :ui="{ base: 'font-mono text-xs' }" />
        </UFormField>

        <UButton
          icon="lucide:shuffle"
          label="随机色标"
          size="sm"
          color="neutral"
          variant="subtle"
          @click="stops = randomStops(stops.length || 3, randomSeed())"
        />
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-highlighted">色标</span>
          <div class="flex items-center gap-2">
            <UButton icon="lucide:plus" label="加一个" size="xs" color="neutral" variant="ghost" @click="addStop" />
            <UButton icon="lucide:eraser" label="恢复默认" size="xs" color="neutral" variant="ghost" @click="stops = [...(GRADIENT_SAMPLES[0]?.value.stops ?? [])]" />
          </div>
        </div>
        <p v-if="badColor" class="text-xs text-error">{{ badColor }}</p>
        <p v-else-if="opaque" class="text-xs text-warning">
          含命名色 / hwb() / lab() 这类内核算不出中间色的写法：预览与 CSS 照常输出，但下面的取样表只按能解析的颜色计算。
        </p>
        <ul class="flex flex-col gap-2">
          <li
            v-for="(stop, index) in stops"
            :key="index"
            class="flex flex-wrap items-center gap-2 rounded-lg border border-default px-2 py-1.5"
          >
            <span class="w-6 shrink-0 text-xs tabular-nums text-dimmed">{{ index + 1 }}</span>
            <input v-model="stop.color" type="color" class="h-7 w-9 shrink-0 cursor-pointer rounded border border-default bg-transparent">
            <UInput
              v-model="stop.color"
              size="xs"
              class="w-28 shrink-0"
              :ui="{ base: 'font-mono text-xs' }"
              :color="checked[index] && !checked[index]?.ok ? 'error' : undefined"
            />
            <UInputNumber
              v-model="stop.pos"
              :min="0"
              :max="100"
              :step="5"
              size="xs"
              class="w-24 shrink-0"
              placeholder="自动"
            />
            <span class="text-xs text-dimmed">%（留空 = 均匀分布）</span>
            <span class="ml-auto flex items-center gap-1">
              <UButton icon="lucide:chevron-up" size="xs" color="neutral" variant="ghost" :disabled="index === 0" @click="move(index, -1)" />
              <UButton icon="lucide:chevron-down" size="xs" color="neutral" variant="ghost" :disabled="index === stops.length - 1" @click="move(index, 1)" />
              <UButton icon="lucide:trash" size="xs" color="neutral" variant="ghost" :disabled="stops.length <= 2" @click="removeStop(index)" />
            </span>
          </li>
        </ul>
        <div class="flex h-6 w-full overflow-hidden rounded-full border border-default">
          <span
            v-for="(stop, index) in filled"
            :key="`bar-${index}`"
            class="h-full flex-1 border-r border-default last:border-r-0"
            :style="{ backgroundColor: stop.color }"
            :title="`${stop.color} @ ${stop.pos}%`"
          />
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label for="gr-css" class="text-sm font-medium text-highlighted">CSS</label>
          <CopyButton :text="css" :disabled="!built.ok" label="复制 CSS" size="xs" />
        </div>
        <textarea
          id="gr-css"
          readonly
          class="max-h-40 overflow-auto rounded-xl border border-default bg-elevated px-3 py-2 font-mono text-xs text-default"
          rows="4"
          :value="built.ok ? `${built.fallback}\n${built.css}` : (built.error ?? '')"
        />
        <ul v-if="built.notes.length" class="flex flex-col gap-1 text-xs text-muted">
          <li v-for="note in built.notes" :key="note">· {{ note }}</li>
        </ul>
        <ul v-if="built.warnings.length" class="flex flex-col gap-1 text-xs text-warning">
          <li v-for="warn in built.warnings" :key="warn">· {{ warn }}</li>
        </ul>
      </section>

      <section class="flex flex-col gap-2">
        <label for="gr-paste" class="text-sm font-medium text-highlighted">从现有 CSS 反解</label>
        <UInput
          id="gr-paste"
          v-model="paste"
          placeholder="linear-gradient(135deg, #42b883, #35495e 80%)"
          :ui="{ base: 'font-mono text-xs' }"
        />
        <p v-if="pasteResult && !pasteResult.ok" class="text-xs text-error">{{ pasteResult.error }}</p>
        <p v-else-if="pasteResult" class="text-xs text-muted">
          解析到 {{ pasteResult.spec.stops.length }} 个色标 · {{ pasteResult.notes.join('；') || '写法合法' }}
        </p>
        <UButton
          icon="lucide:arrow-down-to-line"
          label="填进上面的编辑器"
          size="sm"
          color="neutral"
          variant="subtle"
          :disabled="!pasteResult || !pasteResult.ok"
          @click="applyPaste"
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="sample in GRADIENT_SAMPLES"
            :key="sample.label"
            :label="sample.label"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="stops = [...(sample.value.stops ?? stops)]; kind = sample.value.kind ?? kind; angle = sample.value.angle ?? angle; direction = sample.value.direction ?? direction"
          />
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium text-highlighted">等距取样</span>
          <UFormField label="" class="w-32">
            <UInputNumber v-model="sampleCount" :min="2" :max="32" size="xs" class="w-full" />
          </UFormField>
        </div>
        <div v-if="graded.length" class="flex flex-wrap gap-1">
          <span
            v-for="(item, index) in graded"
            :key="index"
            class="flex h-9 w-14 flex-col items-center justify-center rounded text-[10px] font-mono"
            :style="{ backgroundColor: item.hex, color: textOn(item.hex) }"
            :title="`${item.hex} @ ${item.pos}%`"
          >{{ item.hex }}</span>
        </div>
        <p v-else class="text-xs text-dimmed">色标里有算不出中间色的写法时不给取样。</p>
      </section>

      <p class="text-xs text-dimmed">
        角度按 CSS 规则：0deg 向上、顺时针为正；输出的 <code class="font-mono">background-color</code> 是给不支持渐变的浏览器的底色回退。
      </p>
    </div>
  </ToolShell>
</template>
