<script setup lang="ts">
import type { TripSummary, CalendarBatch } from '~/types/trip'

const route = useRoute()
const router = useRouter()

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedDate = ref<string | null>(null)

// 首頁 hero 會帶 scope（國內/國外）與 tag（主題）進來
const scope = computed(() => (route.query.scope === 'domestic' || route.query.scope === 'overseas' ? route.query.scope : ''))
const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : ''))

const SCOPE_LABEL: Record<string, string> = { domestic: '國內線', overseas: '國外線' }

const activeFilters = computed(() => {
  const list: string[] = []
  if (scope.value) list.push(SCOPE_LABEL[scope.value]!)
  if (tag.value) list.push(tag.value)
  return list
})

// canonical 刻意固定指向 /trips（不帶 query）：?tag=、?scope=、?q= 產生的是同一批內容的
// 不同檢視，讓搜尋引擎知道正本是哪一頁，避免被當成重複內容。
usePageSeo({
  title: '探索行程',
  description: '查看無穹旅行社所有出團行程與出發日期，依目的地、主題或出團月份挑選適合你的旅程。',
  path: '/trips'
})

const { data: batches } = await useFetch<CalendarBatch[]>('/api/batches')

const { data: trips, refresh } = await useFetch<TripSummary[]>('/api/trips', {
  query: computed(() => ({
    ...(q.value ? { q: q.value } : {}),
    ...(scope.value ? { scope: scope.value } : {}),
    ...(tag.value ? { tag: tag.value } : {})
  }))
})

function clearFilters() {
  router.replace({ query: q.value ? { q: q.value } : {} })
}

const displayedTrips = computed(() => {
  if (!selectedDate.value || !trips.value) return trips.value ?? []
  return trips.value.filter(t => t.batches.some(b => b.departureDate === selectedDate.value))
})

function onSelectDate(date: string | null) {
  selectedDate.value = date
}

function submitSearch() {
  router.replace({ query: { ...route.query, q: q.value || undefined } })
  refresh()
}
</script>

<template>
  <div>
    <!-- hero 高度跟首頁 hero 一致 -->
    <!-- pt-16 補償疊在上方的固定導覽列，justify-center 讓內容在加高後的框裡置中 -->
    <section class="relative flex min-h-[560px] flex-col justify-center overflow-hidden pt-16 sm:min-h-[680px]">
      <img
        src="https://picsum.photos/seed/trip-calendar/1600/500"
        alt=""
        class="absolute inset-0 size-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-br from-teal-900/40 via-sky-900/30 to-blue-950/40" />

      <div class="relative z-10 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
          <TripCalendar :batches="batches ?? []" @select-date="onSelectDate" />

          <div class="flex flex-col justify-center gap-4 lg:min-h-full">
            <form class="flex w-full flex-row items-center gap-2 rounded-full bg-white p-2 shadow-lg" @submit.prevent="submitSearch">
              <UIcon name="i-lucide-search" class="ml-3 size-5 shrink-0 text-gray-400" />
              <input
                v-model="q"
                type="text"
                placeholder="搜尋地點、景點或行程類型"
                class="w-full min-w-0 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              >
              <UButton type="submit" color="primary" variant="solid" size="lg" class="shrink-0 whitespace-nowrap rounded-full px-6">
                搜尋
              </UButton>
            </form>

            <div v-if="activeFilters.length" class="flex flex-wrap items-center gap-2">
              <span
                v-for="label in activeFilters"
                :key="label"
                class="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-900"
              >
                {{ label }}
              </span>
              <UButton size="xs" color="neutral" variant="link" class="text-white" @click="clearFilters">
                清除篩選
              </UButton>
            </div>

            <p v-if="selectedDate" class="text-sm font-medium text-white">
              已篩選出團日期：{{ selectedDate }}
              <UButton size="xs" color="neutral" variant="link" class="text-white" @click="selectedDate = null">
                清除
              </UButton>
            </p>
          </div>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div v-if="displayedTrips.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <TripCard v-for="trip in displayedTrips" :key="trip.id" :trip="trip" />
      </div>
      <p v-else class="text-sm text-gray-500">
        找不到符合條件的行程
      </p>
    </div>
  </div>
</template>
