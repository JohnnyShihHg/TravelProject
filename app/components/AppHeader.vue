<script setup lang="ts">
const links = [
  { label: '首頁', to: '/' },
  { label: '探索行程', to: '/trips' },
  { label: '關於無穹', to: '/about' },
  { label: '聯絡我們', to: '/contact' }
]

const mobileOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })

// 導覽列疊在各頁最上方的深色主視覺上，所以預設是深色玻璃配白字。
// 捲過首屏之後底下換成白色內容，玻璃要跟著轉成淺色，否則會白底白字。
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 40
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300"
    :class="scrolled ? 'border-gray-200/60 bg-white/75' : 'border-white/15 bg-white/10'"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex items-center gap-2">
        <UIcon
          name="i-lucide-compass"
          class="size-7 transition-colors"
          :class="scrolled ? 'text-primary' : 'text-white'"
        />
        <span
          class="text-lg font-bold tracking-tight transition-colors"
          :class="scrolled ? 'text-gray-900' : 'text-white'"
        >無穹旅行社</span>
      </NuxtLink>

      <nav class="hidden items-center gap-8 md:flex">
        <NuxtLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="text-sm font-medium transition-colors"
          :class="scrolled ? 'text-gray-600 hover:text-primary' : 'text-white/85 hover:text-white'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        class="md:hidden"
        :class="scrolled ? '' : 'text-white hover:bg-white/15'"
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
        class="absolute inset-x-0 top-full border-t border-gray-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-xl md:hidden"
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
