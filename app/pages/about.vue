<template>
  <div class="space-y-4">
    <GlassCard custom-class="p-6">
      <div class="flex items-center gap-3">
        <span class="grid h-12 w-12 place-items-center rounded-xl bg-vue-500 text-white">
          <UIcon name="i-mdi-toolbox-outline" class="h-7 w-7" />
        </span>
        <div>
          <h1 class="text-xl font-bold">ToolBox</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">纯前端在线工具箱</p>
        </div>
      </div>
      <p class="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        ToolBox 把常用的在线工具聚合在一个应用里：编码加解密、JSON 格式化、时间戳、
        文本处理、颜色换算，以及单位换算、房贷车贷、BMI 等各类计算器。所有处理都在你的浏览器本地完成。
      </p>
    </GlassCard>

    <GlassCard custom-class="p-6">
      <h2 class="mb-2 flex items-center gap-2 font-semibold">
        <UIcon name="i-lucide-shield-check" class="h-5 w-5 text-vue-500" /> 隐私说明
      </h2>
      <ul class="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
        <li>无后端、无数据库、无登录，使用不上传任何数据。</li>
        <li>汇率等可编辑内容仅保存在你设备的 localStorage，清除浏览器数据即可抹除。</li>
        <li>不使用任何第三方埋点或广告脚本。</li>
      </ul>
    </GlassCard>

    <GlassCard custom-class="p-6">
      <h2 class="mb-2 flex items-center gap-2 font-semibold">
        <UIcon name="i-lucide-layers" class="h-5 w-5 text-vue-500" /> 技术栈
      </h2>
      <div class="flex flex-wrap gap-2 text-sm">
        <UBadge
          v-for="t in ['Nuxt 4 (SPA)', 'Vue 3', 'TypeScript (strict)', '@nuxt/ui v4', 'Tailwind CSS v4', 'Iconify', 'Pinia', 'VueUse', 'GitHub Actions → Pages']"
          :key="t"
          :label="t"
          color="neutral"
          variant="subtle"
        />
      </div>
    </GlassCard>

    <GlassCard custom-class="p-6">
      <h2 class="mb-2 font-semibold">免责声明</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        房贷/车贷/BMI/货币换算等结果均为估算，实际以银行核定、专业机构与官方汇率为准。
      </p>
    </GlassCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: '关于 · ToolBox' })
</script>
