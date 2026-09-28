<script setup lang="ts">
import AppCommandPalette from '~/components/AppCommandPalette.vue'
import AppFooter from '~/components/AppFooter.vue'
import AppHeader from '~/components/AppHeader.vue'
import BackToTop from '~/components/BackToTop.vue'
import { isSearchHotkey, useHotkey } from '~/composables/useHotkey'
import { usePalette } from '~/composables/usePalette'

const { toggle } = usePalette()
useHotkey(isSearchHotkey, (event) => {
  event.preventDefault()
  toggle()
})
</script>

<template>
  <div class="flex min-h-full flex-col">
    <AppHeader />
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <RouterView />
    </main>
    <AppFooter />
  </div>

  <AppCommandPalette />
  <BackToTop />
</template>
