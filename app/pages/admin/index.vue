<script setup lang="ts">
import type { TripSummary } from '~/types/trip'

definePageMeta({ layout: 'admin' })

const { data: trips, refresh } = await useFetch<TripSummary[]>('/api/admin/trips')
const { data: contacts } = await useFetch<unknown[]>('/api/admin/contacts')

const publishedCount = computed(() => trips.value?.filter(t => t.status === 'published').length ?? 0)
const draftCount = computed(() => trips.value?.filter(t => t.status === 'draft').length ?? 0)
const batchCount = computed(() => trips.value?.reduce((sum, t) => sum + t.batches.length, 0) ?? 0)
const contactCount = computed(() => contacts.value?.length ?? 0)

const stats = computed(() => [
  { label: '啟用中行程', value: publishedCount.value, icon: 'i-lucide-check-circle-2', style: 'solid' as const },
  { label: '已關閉行程', value: draftCount.value, icon: 'i-lucide-file-edit', style: 'dark' as const },
  { label: '出團梯次總數', value: batchCount.value, icon: 'i-lucide-ticket', style: 'outline' as const },
  { label: '聯絡表單留言', value: contactCount.value, icon: 'i-lucide-inbox', style: 'outline' as const }
])

// 排序：啟用中的永遠排在前面，群組內再依選擇的欄位排
type SortKey = 'updatedAt' | 'createdAt' | 'departure'

const sortKey = ref<SortKey>('updatedAt')
const sortDesc = ref(true)

const sortOptions = [
  { label: '修改時間', value: 'updatedAt' },
  { label: '建立時間', value: 'createdAt' },
  { label: '出發時間', value: 'departure' }
]

// 沒有梯次的行程排在最後（升冪時給最大值，降冪時給最小值）
function departureValue(trip: TripSummary) {
  return trip.nextBatch?.departureDate ?? (sortDesc.value ? '' : '9999-12-31')
}

const sortedTrips = computed(() => {
  const list = [...(trips.value ?? [])]
  return list.sort((a, b) => {
    const enabled = Number(b.status === 'published') - Number(a.status === 'published')
    if (enabled !== 0) return enabled

    const key = sortKey.value
    const av = key === 'departure' ? departureValue(a) : a[key]
    const bv = key === 'departure' ? departureValue(b) : b[key]
    const cmp = String(av).localeCompare(String(bv))
    return sortDesc.value ? -cmp : cmp
  })
})

// 樂觀更新：開關與星星都會即時反白，避免等 refresh 造成延遲感
const busyIds = ref<Set<number>>(new Set())

async function patchTrip(trip: TripSummary, body: Record<string, unknown>) {
  busyIds.value = new Set(busyIds.value).add(trip.id)
  try {
    await $fetch(`/api/admin/trips/${trip.id}`, { method: 'PATCH', body })
    await refresh()
  } finally {
    const next = new Set(busyIds.value)
    next.delete(trip.id)
    busyIds.value = next
  }
}

function setEnabled(trip: TripSummary, enabled: boolean) {
  return patchTrip(trip, { status: enabled ? 'published' : 'draft' })
}

function toggleFeatured(trip: TripSummary) {
  return patchTrip(trip, { isFeatured: !trip.isFeatured })
}

// 刪除確認（用 UModal，不用瀏覽器原生 confirm）
const deleteTarget = ref<TripSummary | null>(null)
const deleteOpen = ref(false)
const deleting = ref(false)

function askDelete(trip: TripSummary) {
  deleteTarget.value = trip
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/trips/${deleteTarget.value.id}`, { method: 'DELETE' })
    await refresh()
    deleteOpen.value = false
    deleteTarget.value = null
  } finally {
    deleting.value = false
  }
}
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

    <!-- 統計卡片 -->
    <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-2xl p-4 shadow-sm"
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
      </div>
    </div>

    <!-- 行程列表 -->
    <div class="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-sm font-semibold text-gray-900">
          行程列表
        </h2>
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-xs text-gray-500">排序</span>
          <USelect v-model="sortKey" :items="sortOptions" size="sm" class="w-32" />
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            :icon="sortDesc ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
            :aria-label="sortDesc ? '改為升冪' : '改為降冪'"
            @click="sortDesc = !sortDesc"
          />
        </div>
      </div>
      <p class="mt-1 text-xs text-gray-400">
        啟用中的行程固定排在前面
      </p>

      <!-- 手機寬度：卡片向下堆疊 -->
      <div class="mt-4 space-y-3 sm:hidden">
        <div v-for="trip in sortedTrips" :key="trip.id" class="rounded-xl border border-gray-100 p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <UBadge v-if="trip.badge" color="primary" variant="subtle" size="sm" class="mb-1">
                {{ trip.badge }}
              </UBadge>
              <p class="font-medium text-gray-900">
                {{ trip.title }}
              </p>
            </div>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :icon="trip.isFeatured ? 'i-lucide-star' : 'i-lucide-star-off'"
              :class="trip.isFeatured ? 'text-amber-500' : 'text-gray-300'"
              :loading="busyIds.has(trip.id)"
              :aria-label="trip.isFeatured ? '取消精選' : '設為精選'"
              @click="toggleFeatured(trip)"
            />
          </div>
          <div class="mt-3 flex items-center gap-3 text-xs text-gray-500">
            <USwitch
              :model-value="trip.status === 'published'"
              :disabled="busyIds.has(trip.id)"
              :label="trip.status === 'published' ? '啟用中' : '已關閉'"
              @update:model-value="setEnabled(trip, $event)"
            />
            <span>{{ trip.batches.length }} 個梯次</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton size="xs" color="neutral" variant="soft" :to="`/admin/trips/${trip.id}`">
              編輯
            </UButton>
            <UButton size="xs" color="error" variant="soft" @click="askDelete(trip)">
              刪除
            </UButton>
          </div>
        </div>
        <p v-if="!sortedTrips.length" class="py-8 text-center text-sm text-gray-400">
          尚無行程，點上方「新增行程」開始建立
        </p>
      </div>

      <!-- 平板/桌機寬度：表格 -->
      <div class="mt-4 hidden overflow-hidden rounded-xl sm:block">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">標題</th>
              <th class="px-4 py-3">啟用</th>
              <th class="px-4 py-3">精選</th>
              <th class="px-4 py-3">梯次數</th>
              <th class="px-4 py-3">最近出團</th>
              <th class="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="trip in sortedTrips" :key="trip.id">
              <td class="px-4 py-3 font-medium text-gray-900">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge v-if="trip.badge" color="primary" variant="subtle" size="sm">
                    {{ trip.badge }}
                  </UBadge>
                  <span>{{ trip.title }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <USwitch
                  :model-value="trip.status === 'published'"
                  :disabled="busyIds.has(trip.id)"
                  @update:model-value="setEnabled(trip, $event)"
                />
              </td>
              <td class="px-4 py-3">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :icon="trip.isFeatured ? 'i-lucide-star' : 'i-lucide-star-off'"
                  :class="trip.isFeatured ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'"
                  :loading="busyIds.has(trip.id)"
                  :aria-label="trip.isFeatured ? '取消精選' : '設為精選'"
                  @click="toggleFeatured(trip)"
                />
              </td>
              <td class="px-4 py-3 text-gray-500">
                {{ trip.batches.length }}
              </td>
              <td class="px-4 py-3 text-gray-500">
                {{ trip.nextBatch?.departureDate ?? '—' }}
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap justify-end gap-2">
                  <UButton size="xs" color="neutral" variant="soft" :to="`/admin/trips/${trip.id}`">
                    編輯
                  </UButton>
                  <UButton size="xs" color="error" variant="soft" @click="askDelete(trip)">
                    刪除
                  </UButton>
                </div>
              </td>
            </tr>
            <tr v-if="!sortedTrips.length">
              <td colspan="6" class="px-4 py-8 text-center text-gray-400">
                尚無行程，點右上角「新增行程」開始建立
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 刪除二次確認 -->
    <AdminConfirmDialog v-model:open="deleteOpen" title="刪除行程" :loading="deleting" @confirm="confirmDelete">
      <p class="text-sm text-gray-600">
        確定要刪除「<span class="font-medium text-gray-900">{{ deleteTarget?.title }}</span>」嗎？
        相關的出團梯次與內容區塊會一併刪除，且無法復原。
      </p>
    </AdminConfirmDialog>
  </div>
</template>
