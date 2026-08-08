<script setup lang="ts">
import type { TripSummary } from '~/types/trip'

definePageMeta({ layout: 'admin' })

const { data: trips, refresh } = await useFetch<TripSummary[]>('/api/admin/trips')

async function togglePublish(trip: TripSummary) {
  const nextStatus = trip.status === 'published' ? 'draft' : 'published'
  await $fetch(`/api/admin/trips/${trip.id}`, { method: 'PATCH', body: { status: nextStatus } })
  refresh()
}

async function remove(trip: TripSummary) {
  if (!confirm(`確定要刪除「${trip.title}」嗎？此動作無法復原。`)) return
  await $fetch(`/api/admin/trips/${trip.id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          後台管理
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          本地開發模式：尚未套用 Cloudflare Zero Trust，正式部署前請務必加上存取保護
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <UButton to="/admin/contacts" color="neutral" variant="soft" block class="sm:w-auto">
          聯絡表單留言
        </UButton>
        <UButton to="/admin/hero" color="neutral" variant="soft" block class="sm:w-auto">
          編輯首頁 Hero
        </UButton>
        <UButton to="/admin/trips/new" color="primary" block class="sm:w-auto">
          新增行程
        </UButton>
      </div>
    </div>

    <!-- 手機寬度：卡片向下堆疊 -->
    <div class="mt-8 space-y-3 sm:hidden">
      <div v-for="trip in trips" :key="trip.id" class="rounded-xl border border-gray-100 p-4 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <span class="font-medium text-gray-900">{{ trip.title }}</span>
          <UIcon v-if="trip.isFeatured" name="i-lucide-star" class="mt-0.5 shrink-0 text-amber-500" />
        </div>
        <div class="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <UBadge :color="trip.status === 'published' ? 'success' : 'neutral'" variant="subtle">
            {{ trip.status === 'published' ? '已發布' : '草稿' }}
          </UBadge>
          <span>{{ trip.batches.length }} 個梯次</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton size="xs" color="neutral" variant="soft" @click="togglePublish(trip)">
            {{ trip.status === 'published' ? '設為草稿' : '發布' }}
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" :to="`/admin/trips/${trip.id}`">
            編輯
          </UButton>
          <UButton size="xs" color="error" variant="soft" @click="remove(trip)">
            刪除
          </UButton>
        </div>
      </div>
      <p v-if="!trips?.length" class="py-8 text-center text-sm text-gray-400">
        尚無行程，點上方「新增行程」開始建立
      </p>
    </div>

    <!-- 平板/桌機寬度：表格 -->
    <div class="mt-8 hidden overflow-hidden rounded-xl border border-gray-100 sm:block">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">標題</th>
            <th class="px-4 py-3">狀態</th>
            <th class="px-4 py-3">精選</th>
            <th class="px-4 py-3">梯次數</th>
            <th class="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="trip in trips" :key="trip.id">
            <td class="px-4 py-3 font-medium text-gray-900">
              {{ trip.title }}
            </td>
            <td class="px-4 py-3">
              <UBadge :color="trip.status === 'published' ? 'success' : 'neutral'" variant="subtle">
                {{ trip.status === 'published' ? '已發布' : '草稿' }}
              </UBadge>
            </td>
            <td class="px-4 py-3">
              <UIcon v-if="trip.isFeatured" name="i-lucide-star" class="text-amber-500" />
            </td>
            <td class="px-4 py-3 text-gray-500">
              {{ trip.batches.length }}
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap justify-end gap-2">
                <UButton size="xs" color="neutral" variant="soft" @click="togglePublish(trip)">
                  {{ trip.status === 'published' ? '設為草稿' : '發布' }}
                </UButton>
                <UButton size="xs" color="neutral" variant="soft" :to="`/admin/trips/${trip.id}`">
                  編輯
                </UButton>
                <UButton size="xs" color="error" variant="soft" @click="remove(trip)">
                  刪除
                </UButton>
              </div>
            </td>
          </tr>
          <tr v-if="!trips?.length">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400">
              尚無行程，點右上角「新增行程」開始建立
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
