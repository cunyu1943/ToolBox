<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  applyChoice, convert, PRESETS, TABLE_SIZES, VARIANT_LABELS,
  type Spot, type Variant
} from '~/tools/chinese-variant'
import { useStored } from '~/composables/useStored'

const SAMPLE = '发发现面条里面头发计算机后端工程师著名'

const variantItems = (Object.keys(VARIANT_LABELS) as Variant[]).map((value) => ({
  value,
  label: VARIANT_LABELS[value]
}))

const source = useStored('tool.chinese-variant.source', SAMPLE)
const from = useStored<Variant>('tool.chinese-variant.from', 'cn')
const to = useStored<Variant>('tool.chinese-variant.to', 'tw')
/** 用户手工挑选的写法，键是「位置|原字|默认值」；输入一变就清空 */
const choices = ref<Record<string, string>>({})

const base = computed(() => convert(source.value, from.value, to.value))
const keyOf = (spot: Spot) => `${spot.at}|${spot.src}|${spot.def}`
const optionsOf = (spot: Spot) => [spot.def, ...spot.alts]

const finalText = computed(() => {
  let out = base.value.output
  for (const spot of base.value.spots) {
    const picked = choices.value[keyOf(spot)]
    if (picked) out = applyChoice(out, spot, picked)
  }
  return out
})

const currentOf = (spot: Spot) => choices.value[keyOf(spot)] ?? spot.def
const manualCount = computed(
  () => base.value.spots.filter((spot) => choices.value[keyOf(spot)] !== undefined).length
)
const reviewCount = computed(() => base.value.spots.filter((spot) => !spot.fixed).length)

function cycle(spot: Spot) {
  const options = optionsOf(spot)
  const next = options.indexOf(currentOf(spot)) + 1
  choices.value[keyOf(spot)] = options[next % options.length] as string
}

/** 按原字归组：同一字在一段里出现多次时，给一个「全部改成」的入口 */
const groups = computed(() => {
  const map = new Map<string, { src: string; spots: Spot[]; options: string[] }>()
  for (const spot of base.value.spots) {
    const group = map.get(spot.src)
    if (group) group.spots.push(spot)
    else map.set(spot.src, { src: spot.src, spots: [spot], options: [] })
  }
  for (const group of map.values()) {
    const options = new Set<string>()
    for (const spot of group.spots) for (const option of optionsOf(spot)) options.add(option)
    group.options = [...options]
  }
  return [...map.values()].sort((a, b) => b.spots.length - a.spots.length)
})

function setGroup(group: { spots: Spot[]; options: string[] }, option: string) {
  for (const spot of group.spots) {
    if (optionsOf(spot).includes(option)) choices.value[keyOf(spot)] = option
  }
}

const segments = computed(() => {
  const byAt = new Map(base.value.spots.map((spot) => [spot.at, spot]))
  const list: { text: string; spot?: Spot }[] = []
  for (const [index, char] of [...finalText.value].entries()) {
    const spot = byAt.get(index)
    if (spot) list.push({ text: char, spot })
    else {
      const last = list[list.length - 1]
      if (last && !last.spot) last.text += char
      else list.push({ text: char })
    }
  }
  return list
})

function applyPreset(index: number) {
  const preset = PRESETS[index]
  if (!preset) return
  from.value = preset.from
  to.value = preset.to
}

watch([source, from, to], () => {
  choices.value = {}
})
</script>

<template>
  <ToolShell tool-id="chinese-variant">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="(preset, index) in PRESETS"
            :key="preset.label"
            :label="preset.label"
            size="sm"
            :color="from === preset.from && to === preset.to ? 'primary' : 'neutral'"
            :variant="from === preset.from && to === preset.to ? 'subtle' : 'outline'"
            @click="applyPreset(index)"
          />
        </div>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">源</span>
          <USelect v-model="from" :items="variantItems" item-key="value" class="w-36" aria-label="源写法" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">目标</span>
          <USelect v-model="to" :items="variantItems" item-key="value" class="w-36" aria-label="目标写法" />
        </label>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs text-muted">输入</span>
          <UTextarea
            v-model="source"
            :rows="8"
            autoresize
            spellcheck="false"
            placeholder="输入要转换的中文文本"
            aria-label="待转换文本"
          />
        </label>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted">结果</span>
            <div class="flex items-center gap-2">
              <UButton
                v-if="manualCount"
                label="恢复自动判定"
                icon="lucide:undo-2"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="choices = {}"
              />
              <CopyButton :text="finalText" :disabled="!source" />
            </div>
          </div>
          <div
            class="min-h-40 overflow-x-auto rounded-lg border border-default bg-elevated px-3 py-2 text-sm leading-7 break-all whitespace-pre-wrap"
            data-testid="result"
          >
            <template v-for="(segment, index) in segments" :key="index">
              <button
                v-if="segment.spot"
                type="button"
                class="mx-px rounded px-0.5 underline decoration-dotted underline-offset-4 transition-colors"
                :class="
                  currentOf(segment.spot) === segment.spot.def
                    ? 'decoration-warning/70 hover:bg-warning/15'
                    : 'bg-primary/15 decoration-primary/70 hover:bg-primary/25'
                "
                :title="`${segment.spot.src}：${optionsOf(segment.spot).join(' / ')}${segment.spot.fixed ? '（已按词组判定）' : '（按字级默认值，建议确认）'}`"
                @click="cycle(segment.spot)"
              >
                {{ segment.text }}
              </button>
              <span v-else>{{ segment.text }}</span>
            </template>
            <span v-if="!source" class="text-dimmed">转换结果会显示在这里</span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge :label="`输出 ${[...finalText].length} 字`" color="neutral" variant="subtle" />
        <UBadge :label="`词组命中 ${base.words} 处`" :color="base.words ? 'primary' : 'neutral'" variant="subtle" />
        <UBadge
          v-if="base.spots.length"
          :label="`一字多形 ${base.spots.length} 处`"
          color="warning"
          variant="subtle"
        />
        <UBadge v-if="reviewCount" :label="`其中按字级默认 ${reviewCount} 处`" color="neutral" variant="subtle" />
        <UBadge v-if="manualCount" :label="`已手工改 ${manualCount} 处`" color="success" variant="subtle" />
      </div>

      <p v-if="base.spots.length" class="text-xs leading-relaxed text-dimmed">
        带虚线下划线的字有多个常用繁体写法，点一下即可在它们之间切换；下方按原字归组，可以一次改同一字的所有位置。
      </p>
      <p v-else-if="source && to === 'cn'" class="text-xs leading-relaxed text-dimmed">
        繁→简是把多对一直接归并（<code class="rounded bg-elevated px-1">发/髮</code> 都回到 <code class="rounded bg-elevated px-1">发</code>），没有需要逐处复核的位置。
      </p>

      <section v-if="groups.length" class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">逐处复核（{{ base.spots.length }} 处 / {{ groups.length }} 个字）</h2>
        <ul class="flex flex-col gap-2">
          <li v-for="group in groups" :key="group.src" class="flex flex-wrap items-center gap-2 text-sm">
            <span class="min-w-14 font-mono text-highlighted">{{ group.src }}</span>
            <span class="text-xs text-dimmed">×{{ group.spots.length }}</span>
            <UButton
              v-for="option in group.options"
              :key="option"
              :label="option"
              size="xs"
              :color="group.spots.every((s) => currentOf(s) === option) ? 'primary' : 'neutral'"
              :variant="group.spots.every((s) => currentOf(s) === option) ? 'solid' : 'outline'"
              @click="setGroup(group, option)"
            />
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">字表是怎么来的，哪里可能判偏</h2>
        <p class="text-xs leading-relaxed text-muted">
          数据是 OpenCC（Apache-2.0）随包发布的转换表，离线裁剪成 11 张表直接内嵌：简→繁字级默认值
          <strong class="text-highlighted">{{ TABLE_SIZES.s2tChars }}</strong> 字、二字例外
          <strong class="text-highlighted">{{ TABLE_SIZES.s2tWords }}</strong> 条、繁→简反向
          <strong class="text-highlighted">{{ TABLE_SIZES.t2sChars }}</strong> 字加词级
          <strong class="text-highlighted">{{ TABLE_SIZES.t2sWords }}</strong> 条、台式追加
          {{ TABLE_SIZES.twChars }}＋{{ TABLE_SIZES.twWords }}、港式追加
          {{ TABLE_SIZES.hkChars }}＋{{ TABLE_SIZES.hkWords }}，另有
          <strong class="text-highlighted">{{ TABLE_SIZES.poly }}</strong> 个高频一字多形用来做复核标记。
          合计约 100 kB 原文、51 kB gzip；直接引 opencc-js 是 1.20 MB 原文 / 498 kB gzip，所以表是自己裁的。
        </p>
        <p class="text-xs leading-relaxed text-muted">
          判定顺序是「先二字词、后字级默认值」，再加台/港追加层。OpenCC 用的是最长匹配词典，词条有十字以上的
          （「全彩干式印表机」「葉步樑」这类人名、术语），我们只带二字例外，所以三字以上的判定可能偏——这不是隐性的错：
          在 OpenCC 自己那 9826 条「词表结论和字表默认值不一致」的短语上，本页默认输出与它完全一致的有 7343 条，
          <strong class="text-highlighted">其余 2483 条的每一处差异都被标出、且备选里就含 OpenCC 的写法</strong>（一条断言脚本逐条核对过）。
          在 6000 字真实中文技术文书上，两者只差 7 处（0.12%），标出密度是每 100 字 11.6 处，同样全部标出。
        </p>
        <p class="text-xs leading-relaxed text-dimmed">
          复核标记的范围取自 OpenCC 全词表：只要某个简体字在任一词条里出现过<strong class="text-highlighted">不同于字级默认值</strong>的写法，
          它在正文里的每次出现都会被标出。所以「乾/干/幹」「麵/面」这类会一路跟着你，直到你点选为止。
          输入与选中的写法只存在本机 localStorage，不上传任何内容。
        </p>
      </section>
    </div>
  </ToolShell>
</template>
