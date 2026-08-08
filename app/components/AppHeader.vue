<script setup lang="ts">
const links = [
  { label: '首頁', to: '/' },
  { label: '出團資訊', to: '/' },
  { label: '關於無窮', to: '/' },
  { label: '聯絡我們', to: '/' }
]
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-gray-100 bg-white">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex items-center gap-2">
        <UIcon name="i-lucide-compass" class="size-7 text-primary" />
        <span class="text-lg font-bold tracking-tight text-gray-900">TravelProject</span>
      </NuxtLink>

      <nav class="hidden items-center gap-8 md:flex">
        <NuxtLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="text-sm font-medium text-gray-600 transition-colors hover:text-primary"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
