<script setup lang="ts">
import { computed, ref } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import {
  applyCipher, crackCaesar, CIPHER_METHODS, CIPHER_SAMPLES,
  type CipherMethod
} from '~/tools/caesar-cipher'
import { useCopy } from '~/composables/useCopy'
import { useStored } from '~/composables/useStored'

type Direction = 'encode' | 'decode'

const directionItems: { label: string; value: Direction }[] = [
  { label: '加密', value: 'encode' },
  { label: '解密', value: 'decode' }
]

const methodItems = CIPHER_METHODS.map((item) => ({ label: item.label, value: item.id }))

const method = useStored<CipherMethod>('tool.caesar-cipher.method', 'caesar')
const direction = useStored<Direction>('tool.caesar-cipher.direction', 'encode')
const shift = useStored('tool.caesar-cipher.shift', 3)
const key = useStored('tool.caesar-cipher.key', 'LEMON')
const source = useStored('tool.caesar-cipher.source', 'Hello, World!')

const decode = computed(() => direction.value === 'decode')

const current = computed(() => CIPHER_METHODS.find((item) => item.id === method.value)!)
const needsShift = computed(() => method.value === 'caesar')
const needsKey = computed(() => method.value === 'vigenere' || method.value === 'beaufort')

const result = computed(() =>
  applyCipher(source.value, method.value, { shift: shift.value, key: key.value, decode: decode.value })
)

const output = computed(() => (result.value.ok ? result.value.text : ''))

/** 反向再算一次应当还原，能立刻暴露位移/密钥填错的情况 */
const roundTripOk = computed(() => {
  if (!result.value.ok) return false
  const back = applyCipher(output.value, method.value, {
    shift: shift.value,
    key: key.value,
    decode: !decode.value
  })
  return back.ok && back.text === source.value
})

/** 暴力破解要跑 26 次整篇变换，折叠起来按需计算 */
const showCrack = ref(false)
const crack = computed(() => (showCrack.value ? crackCaesar(source.value) : null))
const crackReliable = computed(() => (crack.value ? crack.value.letterCount >= 20 : false))

const { copied, copy } = useCopy()
const copiedIndex = ref(-1)

function fill(sample: (typeof CIPHER_SAMPLES)[number]) {
  source.value = sample.value
  method.value = sample.method
  direction.value = 'encode'
  if (sample.shift !== undefined) shift.value = sample.shift
  if (sample.key) key.value = sample.key
}

function swap() {
  const previous = output.value
  direction.value = decode.value ? 'encode' : 'decode'
  if (previous) source.value = previous
}

function clearAll() {
  source.value = ''
}

async function copyCandidate(text: string, index: number) {
  const ok = await copy(text)
  copiedIndex.value = ok ? index : -1
}
</script>

<template>
  <ToolShell tool-id="caesar-cipher">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="flex flex-wrap items-end gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-sm text-muted">算法</span>
            <USelect
              v-model="method"
              :items="methodItems"
              size="lg"
              class="w-48"
              aria-label="密码算法"
            />
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="text-sm text-muted">方向</span>
            <USelect
              v-model="direction"
              :items="directionItems"
              :disabled="current.reciprocal"
              size="lg"
              class="w-28"
              aria-label="加密或解密"
            />
          </label>

          <label v-if="needsShift" class="flex flex-col gap-1.5">
            <span class="text-sm text-muted">{{ current.keyLabel }}</span>
            <input
              v-model.number="shift"
              type="number"
              min="-25"
              max="25"
              class="h-11 w-28 rounded-lg border border-default px-3 font-mono text-sm text-default outline-none focus:border-primary/50"
              aria-label="位移量"
            />
          </label>

          <label v-if="needsKey" class="flex flex-col gap-1.5">
            <span class="text-sm text-muted">{{ current.keyLabel }}</span>
            <input
              v-model="key"
              spellcheck="false"
              placeholder="LEMON"
              class="h-11 w-40 rounded-lg border border-default px-3 font-mono text-sm text-default uppercase outline-none focus:border-primary/50"
              aria-label="密钥"
            />
          </label>

          <div class="ms-auto flex items-center gap-2">
            <UButton
              icon="lucide:arrow-left-right"
              label="换成反方向"
              color="neutral"
              variant="ghost"
              :disabled="!result.ok || current.reciprocal"
              @click="swap"
            />
            <UButton icon="lucide:eraser" label="清空" color="neutral" variant="ghost" @click="clearAll" />
          </div>
        </div>

        <p class="font-mono text-xs text-muted">{{ current.formula }}</p>
        <p v-if="current.reciprocal" class="text-xs leading-relaxed text-dimmed">
          该算法自身互逆，加密与解密是同一个操作，因此方向选择已锁定。
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="sample in CIPHER_SAMPLES"
          :key="sample.label"
          :label="sample.label"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="fill(sample)"
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="flex min-w-0 flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            {{ decode ? '密文' : '明文' }}
          </h2>
          <UTextarea
            v-model="source"
            :rows="10"
            spellcheck="false"
            placeholder="只处理 ASCII 英文字母，其余字符原样保留"
            :ui="{ base: 'font-mono text-sm leading-relaxed resize-y' }"
          />
        </section>

        <section class="flex min-w-0 flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-medium text-highlighted">{{ decode ? '明文' : '密文' }}</h2>
            <div class="flex items-center gap-2">
              <UBadge
                v-if="roundTripOk"
                icon="lucide:check"
                label="往返一致"
                color="primary"
                variant="subtle"
              />
              <CopyButton :text="output" :disabled="!output" />
            </div>
          </div>
          <textarea
            :value="output"
            readonly
            rows="10"
            spellcheck="false"
            class="w-full resize-y rounded-lg border border-default bg-elevated p-3 font-mono text-sm leading-relaxed text-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="结果会出现在这里"
          />
        </section>
      </div>

      <UAlert
        v-if="!result.ok"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        title="无法处理"
        :description="result.error"
      />

      <section v-if="result.ok && result.notes.length" class="flex flex-col gap-2 rounded-xl border border-default p-4">
        <h2 class="text-sm font-medium text-highlighted">处理说明</h2>
        <ul class="flex flex-col gap-1">
          <li v-for="note in result.notes" :key="note" class="text-xs leading-relaxed text-warning">
            {{ note }}
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-3 rounded-xl border border-default p-4">
        <button
          type="button"
          class="flex items-center justify-between gap-2 text-sm font-medium text-highlighted"
          :aria-expanded="showCrack"
          @click="showCrack = !showCrack"
        >
          <span>凯撒暴力破解（26 个位移全部解一遍）</span>
          <UIcon :name="showCrack ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-4" />
        </button>

        <template v-if="crack">
          <p v-if="!crack.letterCount" class="text-sm text-dimmed">
            输入里没有 ASCII 英文字母，无法统计字母频率。
          </p>
          <template v-else>
            <p v-if="!crackReliable" class="text-xs leading-relaxed text-warning">
              样本只有 {{ crack.letterCount }} 个字母（少于 20 个），频率统计几乎等于随机排序，仅供参考。
            </p>
            <p class="text-xs leading-relaxed text-dimmed">
              「位移」是把密文回退多少个字母，分数为英文单字母频率的对数似然均值，越高越像正常英文，
              首行即最可能的解。点击任意一行即可复制该候选。
            </p>
            <ul class="flex flex-col divide-y divide-default overflow-hidden rounded-lg border border-default">
              <li v-for="(item, index) in crack.results" :key="item.shift">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-3 py-1.5 text-start hover:bg-elevated"
                  @click="copyCandidate(item.text, index)"
                >
                  <span
                    class="w-14 shrink-0 font-mono text-xs tabular-nums"
                    :class="index === 0 ? 'font-semibold text-primary' : 'text-muted'"
                  >
                    {{ item.shift }}
                  </span>
                  <span class="w-16 shrink-0 font-mono text-xs tabular-nums text-dimmed">
                    {{ item.score.toFixed(3) }}
                  </span>
                  <span
                    class="min-w-0 flex-1 truncate font-mono text-xs"
                    :class="index === 0 ? 'text-default' : 'text-muted'"
                  >
                    {{ item.text }}
                  </span>
                  <UIcon
                    :name="copied && copiedIndex === index ? 'lucide:check' : 'lucide:copy'"
                    class="size-3.5 shrink-0 text-dimmed"
                  />
                </button>
              </li>
            </ul>
          </template>
        </template>
      </section>

      <p class="text-xs leading-relaxed text-dimmed">
        古典密码用于教学、解谜与临时遮蔽，<strong class="text-default">不具备任何保密强度</strong>：
        凯撒只有 25 个有效位移，维吉尼亚可用 Kasiski 检验与重合指数在几秒内破出密钥长度，
        下面这个「暴力破解」区就是最直接的证明。需要真正保护内容请使用经认证的对称加密方案。
        所有计算都在浏览器内完成，文本不离开本机。变换只作用于 ASCII 英文字母并保留大小写，
        数字、标点与中文原样穿过；维吉尼亚与 Beaufort 只让字母消耗密钥流，
        所以插入标点不会改变后续字母的密钥位置。
      </p>
    </div>
  </ToolShell>
</template>
