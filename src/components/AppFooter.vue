<script setup lang="ts">
import { computed } from 'vue'
import { siteConfig as site } from '~/site.config'

/** `{year}` / `{name}` 占位符替换；页脚首行与自定义 HTML 共用 */
function fill(tpl: string): string {
  const year = site.year ?? new Date().getFullYear()
  return tpl.replace(/\{year\}/g, String(year)).replace(/\{name\}/g, site.name)
}

const line = computed(() => fill(site.footerLine))
const html = computed(() => fill(site.footerHtml))
</script>

<template>
  <footer class="glass mt-auto border-t border-default py-8">
    <div
      class="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left"
    >
      <div class="flex min-w-0 flex-col items-center gap-2 sm:items-start">
        <p v-if="line" class="text-sm text-muted">{{ line }}</p>
        <!-- 自定义 HTML：内容来自 src/site.config.ts 的 footerHtml（构建期常量，见该文件注释） -->
        <div v-if="html" class="footer-html" v-html="html" />
      </div>

      <!-- 仓库链接只放图标：可点区域仍保持 44×44，中文说明交给 title 与 aria-label -->
      <a
        v-if="site.github"
        :href="site.github"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-default focus-visible:text-default"
        :title="`${site.name} 源码仓库`"
        :aria-label="`查看 ${site.name} 源码仓库`"
      >
        <UIcon name="lucide:github" class="size-5" />
      </a>
    </div>
  </footer>
</template>
