<script setup lang="ts">
// 後台目前沒有任何登入驗證（見 PLANNING_NOTES.md），在補上 Cloudflare Access 之前
// 至少要確保不被搜尋引擎收錄。robots.txt 也擋了 /admin，這裡是第二道。
useSeoMeta({ robots: 'noindex, nofollow' })
useHead({ titleTemplate: title => title ? `${title}｜無穹旅行社 後台` : '後台管理｜無穹旅行社' })

const route = useRoute()
const mobileOpen = ref(false)
watch(() => route.fullPath, () => { mobileOpen.value = false })

interface NavLink {
  label: string
  to: string
  icon: string
  /** 判斷目前路徑算不算在這一項底下（子路由也要高亮） */
  match: (path: string) => boolean
}
interface NavGroup {
  title: string
  items: NavLink[]
}

// 分組對應實際存在的資料實體。刻意不做 Articles / Videos / Navigation / Footer
// —— 沒有對應的資料表，放上去只會是空殼選項。
const navGroups: NavGroup[] = [
  {
    title: '總覽',
    items: [
      { label: '儀表板', to: '/admin', icon: 'i-lucide-layout-dashboard', match: p => p === '/admin' }
    ]
  },
  {
    title: '內容',
    items: [
      { label: '行程', to: '/admin/trips', icon: 'i-lucide-route', match: p => p.startsWith('/admin/trips') },
      { label: '景點', to: '/admin/spots', icon: 'i-lucide-map-pin', match: p => p.startsWith('/admin/spots') },
      { label: '目的地', to: '/admin/destinations', icon: 'i-lucide-globe', match: p => p.startsWith('/admin/destinations') },
      { label: '主題標籤', to: '/admin/tags', icon: 'i-lucide-tag', match: p => p.startsWith('/admin/tags') }
    ]
  },
  {
    title: '媒體',
    items: [
      { label: '圖片庫', to: '/admin/media', icon: 'i-lucide-image', match: p => p.startsWith('/admin/media') }
    ]
  },
  {
    title: '網站',
    items: [
      { label: '頁面 Hero 圖', to: '/admin/hero', icon: 'i-lucide-layout-template', match: p => p.startsWith('/admin/hero') },
      { label: '聯絡表單留言', to: '/admin/contacts', icon: 'i-lucide-inbox', match: p => p.startsWith('/admin/contacts') }
    ]
  }
]

const isActive = (item: NavLink) => item.match(route.path)
const groupHasActive = (group: NavGroup) => group.items.some(isActive)

// 手風琴預設全部展開。曾經改成「只展開目前所在的那組」，結果進到圖片庫之後
// 「內容」整組被收起來，要多點一次才回得去景點 —— 只有 7 個項目，全開反而好用。
// 收合純粹是使用者想讓畫面清爽時自己按的。
const openGroups = ref<Record<string, boolean>>(
  Object.fromEntries(navGroups.map(g => [g.title, true]))
)
// 換頁時若某組被收著但目前頁面在裡面，自動打開，避免高亮項藏在收合的分組裡
watch(() => route.path, () => {
  for (const g of navGroups) {
    if (groupHasActive(g)) openGroups.value[g.title] = true
  }
})
function toggleGroup(title: string) {
  openGroups.value[title] = !openGroups.value[title]
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 md:flex">
    <!-- 桌面版側邊欄：外層是溝槽，讓 aside 四周都不貼邊，像浮在頁面上的獨立元件 -->
    <div class="hidden shrink-0 md:sticky md:top-0 md:block md:h-screen md:p-4">
      <aside class="flex h-full w-60 flex-col rounded-[28px] bg-gray-900">
        <NuxtLink to="/admin" class="flex items-center gap-3 px-5 py-6">
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
        </NuxtLink>

        <nav class="mt-1 flex-1 overflow-y-auto px-3 pb-4">
          <div v-for="group in navGroups" :key="group.title" class="mb-1">
            <!-- 大標比底下的項目大且亮，讓層級一眼看得出來 -->
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-full px-4 py-2.5 text-left text-base font-bold text-white transition-colors hover:text-primary"
              :aria-expanded="openGroups[group.title]"
              @click="toggleGroup(group.title)"
            >
              {{ group.title }}
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 text-gray-500 transition-transform"
                :class="openGroups[group.title] ? '' : '-rotate-90'"
              />
            </button>

            <div v-show="openGroups[group.title]" class="mt-0.5 space-y-0.5">
              <NuxtLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="ml-2 flex items-center gap-3 rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
                :class="isActive(item)
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'"
              >
                <UIcon :name="item.icon" class="size-3.5 shrink-0" />
                {{ item.label }}
              </NuxtLink>
            </div>
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
          <nav v-if="mobileOpen" class="absolute inset-x-3 top-full z-40 mt-2 rounded-3xl bg-gray-900 px-3 py-3 shadow-xl">
            <div v-for="group in navGroups" :key="group.title" class="mb-2">
              <p class="px-4 py-1.5 text-base font-bold text-white">
                {{ group.title }}
              </p>
              <NuxtLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="ml-2 flex items-center gap-3 rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
                :class="isActive(item) ? 'bg-white text-gray-900' : 'text-gray-400 hover:bg-white/10 hover:text-white'"
              >
                <UIcon :name="item.icon" class="size-3.5 shrink-0" />
                {{ item.label }}
              </NuxtLink>
            </div>
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
