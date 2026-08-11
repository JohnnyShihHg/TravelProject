<script setup lang="ts">
import type { TripDetail } from '~/types/trip'

definePageMeta({ layout: 'default' })

// 這頁用 default layout（要模擬前台外觀），所以拿不到 admin layout 的 noindex，
// 必須自己擋。它沒有任何驗證又看得到未發布的草稿內容，被收錄等於直接外流。
useSeoMeta({ robots: 'noindex, nofollow' })

const route = useRoute()
const id = Number(route.params.id)

const { data: trip, error } = await useFetch<TripDetail>(`/api/admin/trips/${id}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: '找不到這個行程' })
}

useHead({ title: () => `預覽：${trip.value?.title ?? ''}｜無穹旅行社 後台` })
</script>

<template>
  <div v-if="trip">
    <div class="sticky top-16 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm sm:px-6">
      <div class="flex items-center gap-2 text-amber-800">
        <UIcon name="i-lucide-eye" class="size-4" />
        <span class="font-medium">預覽模式</span>
        <UBadge :color="trip.status === 'published' ? 'success' : 'neutral'" variant="subtle">
          {{ trip.status === 'published' ? '已發布' : '草稿' }}
        </UBadge>
        <span class="hidden text-amber-700 sm:inline">— 這是前台實際呈現的樣子，不是編輯畫面</span>
      </div>
      <UButton :to="`/admin/trips/${id}`" size="xs" color="neutral" variant="soft" icon="i-lucide-x">
        關閉預覽
      </UButton>
    </div>

    <TripDetailView :trip="trip" />
  </div>
</template>
