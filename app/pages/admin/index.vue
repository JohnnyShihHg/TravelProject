<script setup lang="ts">
import type { TripSummary } from '~/types/trip'

definePageMeta({ layout: 'admin' })
useHead({ title: '儀表板' })

const { data: trips } = await useFetch<TripSummary[]>('/api/admin/trips')
const { data: contacts } = await useFetch<{ isRead: boolean }[]>('/api/admin/contacts')

const publishedCount = computed(() => trips.value?.filter(t => t.status === 'published').length ?? 0)
const draftCount = computed(() => trips.value?.filter(t => t.status === 'draft').length ?? 0)
const batchCount = computed(() => trips.value?.reduce((sum, t) => sum + t.batches.length, 0) ?? 0)
// 顯示未讀而不是總數：總數只會一直長大，看久了就不再是待辦提示
const unreadContactCount = computed(() => contacts.value?.filter(c => !c.isRead).length ?? 0)

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
  </div>
</template>
