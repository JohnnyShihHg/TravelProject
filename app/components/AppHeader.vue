<script setup lang="ts">
const links = [
  { label: '首頁', to: '/' },
  { label: '出團資訊', to: '/trips' },
  { label: '關於無穹', to: '/about' },
  { label: '聯絡我們', to: '/contact' }
]

const mobileOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-gray-100 bg-white">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex items-center gap-2">
        <UIcon name="i-lucide-compass" class="size-7 text-primary" />
        <span class="text-lg font-bold tracking-tight text-gray-900">無穹旅行社</span>
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

      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        class="md:hidden"
        aria-label="開啟選單"
        @click="mobileOpen = !mobileOpen"
      />
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <nav
        v-if="mobileOpen"
        class="absolute inset-x-0 top-full border-t border-gray-100 bg-white px-4 py-3 shadow-lg md:hidden"
      >
        <NuxtLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="block py-2 text-sm font-medium text-gray-600 hover:text-primary"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </Transition>
  </header>
</template>
