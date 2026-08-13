<script setup lang="ts">
import type { TripSummary } from '~/types/trip'

definePageMeta({ layout: 'admin' })
useHead({ title: '儀表板' })

const { data: trips } = await useFetch<TripSummary[]>('/api/admin/trips')
const { data: contacts } = await useFetch<{ isRead: boolean }[]>('/api/admin/contacts')

const publishedTrips = computed(() => trips.value?.filter(t => t.status === 'published') ?? [])
const publishedCount = computed(() => publishedTrips.value.length)
const draftCount = computed(() => trips.value?.filter(t => t.status === 'draft').length ?? 0)
const batchCount = computed(() => trips.value?.reduce((sum, t) => sum + t.batches.length, 0) ?? 0)
// 顯示未讀而不是總數：總數只會一直長大，看久了就不再是待辦提示
const unreadContactCount = computed(() => contacts.value?.filter(c => !c.isRead).length ?? 0)

// 最近出發的排最前面：這是接下來最快要出團的行程，也是最該檢查資料有沒有備齊的
const activeTrips = computed(() => [...publishedTrips.value].sort((a, b) => {
  const aDate = a.nextBatch?.departureDate
  const bDate = b.nextBatch?.departureDate
  if (aDate && bDate) return aDate.localeCompare(bDate)
  if (aDate) return -1
  if (bDate) return 1
  return 0
}))

function formatDate(date: string | undefined) {
  if (!date) return null
  return new Date(date).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 每張卡片都連到對應的管理頁，數字本身就是入口
const stats = computed(() => [
  { label: '啟用中行程', value: publishedCount.value, icon: 'i-lucide-check-circle-2', style: 'solid' as const, to: '/admin/trips' },
  { label: '已關閉行程', value: draftCount.value, icon: 'i-lucide-file-edit', style: 'dark' as const, to: '/admin/trips' },
  { label: '出團梯次總數', value: batchCount.value, icon: 'i-lucide-ticket', style: 'outline' as const, to: '/admin/trips' },
  { label: '未讀留言', value: unreadContactCount.value, icon: 'i-lucide-inbox', style: 'outline' as const, to: '/admin/contacts' }
])
</script>

<template>
  <div class="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          儀表板
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          本地開發模式：尚未套用 Cloudflare Zero Trust，正式部署前請務必加上存取保護
        </p>
      </div>
      <UButton to="/admin/trips/new" color="primary" class="sm:w-auto">
        新增行程
      </UButton>
    </div>

    <!-- 統計卡片 -->
    <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <NuxtLink
        v-for="stat in stats"
        :key="stat.label"
        :to="stat.to"
        class="block rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-md"
        :class="{
          'bg-primary text-white': stat.style === 'solid',
          'bg-gray-900 text-white': stat.style === 'dark',
          'border border-gray-100 bg-white text-gray-900': stat.style === 'outline'
        }"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-medium"
            :class="stat.style === 'outline' ? 'text-gray-500' : 'text-white/80'"
          >
            {{ stat.label }}
          </span>
          <UIcon
            :name="stat.icon"
            class="size-4 shrink-0"
            :class="stat.style === 'outline' ? 'text-primary' : 'text-white/80'"
          />
        </div>
        <p class="mt-3 text-2xl font-bold">
          {{ stat.value }}
        </p>
      </NuxtLink>
    </div>

    <UButton
      to="/admin/trips"
      color="neutral"
      variant="soft"
      trailing-icon="i-lucide-arrow-right"
      class="mt-6"
    >
      管理所有行程
    </UButton>

    <!-- 目前啟用中的行程：依最近出發日排序，方便一眼看出接下來要出團的內容有沒有備齊 -->
    <div class="mt-8">
      <h2 class="text-lg font-bold text-gray-900">
        目前啟用中的行程
      </h2>

      <div v-if="activeTrips.length" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="trip in activeTrips"
          :key="trip.id"
          :to="`/admin/trips/${trip.id}`"
          class="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
        >
          <div class="size-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            <AppImage
              v-if="trip.coverImageUrl"
              :src="trip.coverImageUrl"
              :width="400"
              alt=""
              loading="lazy"
              class="size-full object-cover"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-gray-900">
              {{ trip.title }}
            </p>
            <p v-if="trip.primaryDestination" class="mt-0.5 truncate text-xs text-gray-500">
              {{ trip.primaryDestination.name }}
            </p>
            <p v-if="trip.nextBatch" class="mt-1 text-xs text-primary">
              下梯出發：{{ formatDate(trip.nextBatch.departureDate) }}
            </p>
            <p v-else class="mt-1 text-xs text-gray-400">
              尚未設定出團梯次
            </p>
          </div>
        </NuxtLink>
      </div>
      <p v-else class="mt-4 rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
        目前沒有啟用中的行程
      </p>
    </div>
  </div>
</template>
