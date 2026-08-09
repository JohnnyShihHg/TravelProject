<script setup lang="ts">
const route = useRoute()
const mobileOpen = ref(false)
watch(() => route.fullPath, () => { mobileOpen.value = false })

const navItems = [
  { label: '儀表板', to: '/admin', icon: 'i-lucide-layout-dashboard', match: (p: string) => p === '/admin' || p.startsWith('/admin/trips') },
  { label: '聯絡表單留言', to: '/admin/contacts', icon: 'i-lucide-inbox', match: (p: string) => p.startsWith('/admin/contacts') },
  { label: '首頁 Hero', to: '/admin/hero', icon: 'i-lucide-image', match: (p: string) => p.startsWith('/admin/hero') }
]

function isActive(item: (typeof navItems)[number]) {
  return item.match(route.path)
}

const NAV_ROW_HEIGHT = 52
</script>

<template>
  <div class="min-h-screen bg-gray-50 md:flex">
    <!-- 桌面版側邊欄：外層是溝槽，讓 aside 四周都不貼邊，像浮在頁面上的獨立元件 -->
    <div class="hidden shrink-0 md:sticky md:top-0 md:block md:h-screen md:p-4">
      <aside class="flex h-full w-60 flex-col rounded-[28px] bg-gray-900">
        <div class="flex items-center gap-3 px-5 py-6">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <UIcon name="i-lucide-compass" class="size-5 text-primary" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-white">
              無穹旅行社
            </p>
            <p class="truncate text-xs text-gray-400">
              後台管理
            </p>
          </div>
        </div>

        <nav class="mt-2 flex-1">
          <div class="flex flex-col">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="group relative flex items-center"
              :style="{ height: `${NAV_ROW_HEIGHT}px` }"
            >
              <span
                class="absolute inset-y-1 left-3 right-3 rounded-full transition-colors"
                :class="isActive(item) ? 'bg-white' : 'group-hover:bg-white/10'"
              />
              <span
                class="relative flex items-center gap-3 pl-7 text-sm font-medium transition-colors"
                :class="isActive(item) ? 'text-gray-900' : 'text-gray-300 group-hover:text-white'"
              >
                <UIcon :name="item.icon" class="size-4 shrink-0" />
                {{ item.label }}
              </span>
            </NuxtLink>
          </div>
        </nav>

        <div class="mx-3 border-t border-white/10 py-4">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <UIcon name="i-lucide-external-link" class="size-4 shrink-0" />
            回到前台網站
          </NuxtLink>
        </div>
      </aside>
    </div>

    <div class="min-w-0 flex-1">
      <!-- 手機版頂部列 -->
      <header class="relative border-b border-gray-200 bg-white md:hidden">
        <div class="flex h-14 items-center justify-between px-4">
          <NuxtLink to="/admin" class="flex items-center gap-2">
            <UIcon name="i-lucide-compass" class="size-5 text-primary" />
            <span class="text-sm font-bold text-gray-900">無穹旅行社 後台</span>
          </NuxtLink>
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
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
          <nav v-if="mobileOpen" class="absolute inset-x-3 top-full z-40 mt-2 space-y-1 rounded-3xl bg-gray-900 px-3 py-3 shadow-xl">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
              :class="isActive(item) ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-white/10 hover:text-white'"
            >
              <UIcon :name="item.icon" class="size-4 shrink-0" />
              {{ item.label }}
            </NuxtLink>
            <NuxtLink
              to="/"
              class="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <UIcon name="i-lucide-external-link" class="size-4 shrink-0" />
              回到前台網站
            </NuxtLink>
          </nav>
        </Transition>
      </header>

      <slot />
    </div>
  </div>
</template>
