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

const NAV_ROW_HEIGHT = 48
const activeIndex = computed(() => navItems.findIndex(isActive))
</script>

<template>
  <div class="min-h-screen bg-gray-50 md:flex">
    <!-- 桌面版側邊欄 -->
    <aside class="hidden shrink-0 bg-gray-900 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col">
      <div class="flex items-center gap-3 px-6 py-6">
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

      <nav class="relative mt-2 flex-1 pl-3">
        <!-- 選中項目的滑動指示條，右側凹角跟主內容背景融合 -->
        <div
          v-if="activeIndex > -1"
          class="nav-notch absolute left-3 right-0 z-0 transition-transform duration-300 ease-out"
          :style="{ height: `${NAV_ROW_HEIGHT}px`, transform: `translateY(${activeIndex * NAV_ROW_HEIGHT}px)` }"
        />

        <div class="relative z-10 flex flex-col">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors"
            :style="{ height: `${NAV_ROW_HEIGHT}px` }"
            :class="isActive(item) ? 'text-gray-900' : 'mr-3 text-gray-300 hover:bg-white/10 hover:text-white'"
          >
            <UIcon :name="item.icon" class="size-4 shrink-0" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </nav>

      <div class="border-t border-white/10 px-3 py-4">
        <NuxtLink
          to="/"
          class="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <UIcon name="i-lucide-external-link" class="size-4 shrink-0" />
          回到前台網站
        </NuxtLink>
      </div>
    </aside>

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
          <nav v-if="mobileOpen" class="absolute inset-x-0 top-full z-40 space-y-1 border-t border-gray-100 bg-gray-900 px-3 py-3 shadow-lg">
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

<style scoped>
/* 側欄選中項目的滑動指示條：本體是主內容背景色（gray-50）。
   右上/右下角用 radial-gradient 畫出四分之一圓，圓內是背景色、圓外透明
   （露出後面側欄本身的深色），視覺上就是側欄邊緣被指示條的圓角往外凹出一塊。
   （原本用 box-shadow 做，陰影沒被裁切會整塊溢出變成錯誤的凸起，改用漸層才乾淨。） */
.nav-notch {
  background-color: #f9fafb;
  border-radius: 24px 0 0 24px;
}

.nav-notch::before,
.nav-notch::after {
  content: '';
  position: absolute;
  right: 0;
  width: 24px;
  height: 24px;
}

.nav-notch::before {
  top: -24px;
  background: radial-gradient(circle at 100% 100%, #f9fafb 24px, transparent 24px);
}

.nav-notch::after {
  bottom: -24px;
  background: radial-gradient(circle at 100% 0%, #f9fafb 24px, transparent 24px);
}
</style>
