<script setup lang="ts">
import { computed } from 'vue'
import CopyButton from '~/components/CopyButton.vue'
import ToolShell from '~/components/ToolShell.vue'
import { decodeJwt, sampleJwt } from '~/tools/jwt-decode'
import { useStored } from '~/composables/useStored'

const token = useStored('tool.jwt.token', '')
const parsed = computed(() => decodeJwt(token.value))
const hasInput = computed(() => token.value.trim().length > 0)

const signatureLength = computed(() => parsed.value.signature?.length ?? 0)
const expiry = computed(() => parsed.value.claims?.find((claim) => claim.key === 'exp'))
const parts = computed(() => [
  { title: 'Header', data: parsed.value.header },
  { title: 'Payload', data: parsed.value.payload }
])
</script>

<template>
  <ToolShell tool-id="jwt-decode">
    <div class="flex flex-col gap-4">
      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">令牌</h2>
          <UButton
            icon="lucide:sparkles"
            label="填入示例"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="token = sampleJwt()"
          />
          <UButton
            icon="lucide:eraser"
            label="清空"
            size="xs"
            color="neutral"
            variant="ghost"
            class="ms-auto"
            @click="token = ''"
          />
        </div>
        <UTextarea
          v-model="token"
          :rows="4"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…"
          spellcheck="false"
          :ui="{ base: 'font-mono text-sm leading-relaxed' }"
          aria-label="JWT 令牌"
        />
        <p class="text-xs text-dimmed">
          允许带 <code class="rounded bg-elevated px-1 py-0.5">Bearer </code> 前缀；签名段只展示、不验证。
        </p>
      </section>

      <UAlert
        v-if="hasInput && !parsed.ok"
        color="error"
        variant="subtle"
        icon="lucide:circle-alert"
        title="解析失败"
        :description="parsed.error"
      />

      <template v-if="parsed.ok">
        <div class="flex flex-wrap items-center gap-2" aria-label="令牌概览">
          <UBadge :label="`alg ${parsed.algorithm ?? '未知'}`" color="primary" variant="subtle" />
          <UBadge v-if="parsed.tokenType" :label="`typ ${parsed.tokenType}`" color="neutral" variant="subtle" />
          <UBadge :label="`payload ${parsed.claims?.length ?? 0} 个声明`" color="neutral" variant="subtle" />
          <UBadge
            v-if="expiry"
            :label="expiry.status === 'expired' ? '已过期' : '在有效期内'"
            :color="expiry.status === 'expired' ? 'error' : 'success'"
            variant="soft"
          />
        </div>

        <section class="flex flex-col gap-2">
          <h2 class="text-sm font-medium text-highlighted">声明 Claims</h2>
          <ul class="flex flex-col overflow-hidden rounded-xl border border-default">
            <li
              v-for="claim in parsed.claims"
              :key="claim.key"
              class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-default px-3 py-2 last:border-b-0"
            >
              <span class="w-28 shrink-0">
                <code class="font-mono text-sm text-default">{{ claim.key }}</code>
                <span class="block text-xs text-dimmed">{{ claim.label }}</span>
              </span>
              <span class="min-w-0 flex-1 break-all font-mono text-sm text-muted">{{ claim.rendered }}</span>
              <UBadge
                v-if="claim.status"
                :label="claim.status === 'not-yet' ? '尚未生效' : '已过期'"
                :color="claim.status === 'not-yet' ? 'warning' : 'error'"
                variant="soft"
                size="sm"
                class="shrink-0"
              />
            </li>
          </ul>
        </section>

        <div class="grid gap-4 lg:grid-cols-2">
          <section
            v-for="part in parts"
            :key="part.title"
            class="flex min-w-0 flex-col gap-2"
          >
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-medium text-highlighted">{{ part.title }}</h2>
              <CopyButton :text="part.data?.json ?? ''" label="复制 JSON" size="xs" />
            </div>
            <pre
              class="overflow-x-auto rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default"
              >{{ part.data?.json }}</pre>
            <CopyButton :text="part.data?.raw ?? ''" label="复制原始 base64url 段" size="xs" class="self-start" />
          </section>
        </div>

        <section class="flex flex-col gap-2 rounded-xl border border-default p-4">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-medium text-highlighted">Signature</h2>
            <span class="text-xs text-dimmed">{{ signatureLength }} 字符 base64url</span>
          </div>
          <p class="break-all font-mono text-sm text-muted">{{ parsed.signature || '（此令牌没有签名段）' }}</p>
          <p class="text-xs leading-relaxed text-dimmed">
            本页只解码、不验签：payload 任何人都能读，切勿把 JWT 解析结果当作可信来源。
            HMAC 验签需要密钥，放在前端等于公开密钥，因此这里不做。
          </p>
        </section>
      </template>

      <p v-else-if="!hasInput" class="text-sm text-muted">粘贴一个 JWT 后自动解析。</p>
    </div>
  </ToolShell>
</template>
