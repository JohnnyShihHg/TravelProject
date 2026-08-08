<script setup lang="ts">
import type { TripSummary, CalendarBatch } from '~/types/trip'

const route = useRoute()
const router = useRouter()

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedDate = ref<string | null>(null)

const { data: batches } = await useFetch<CalendarBatch[]>('/api/batches')

const { data: trips, refresh } = await useFetch<TripSummary[]>('/api/trips', {
  query: computed(() => (q.value ? { q: q.value } : {}))
})

const displayedTrips = computed(() => {
  if (!selectedDate.value || !trips.value) return trips.value ?? []
  return trips.value.filter(t => t.batches.some(b => b.departureDate === selectedDate.value))
})

function onSelectDate(date: string | null) {
  selectedDate.value = date
}

function submitSearch() {
  router.replace({ query: q.value ? { q: q.value } : {} })
  refresh()
}
</script>

<template>
  <div>
    <AppHeader />

    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
        出團資訊
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        瀏覽近期出團日期與所有行程
      </p>

      <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
        <TripCalendar :batches="batches ?? []" @select-date="onSelectDate" />

        <div>
          <form class="mb-6 flex gap-2" @submit.prevent="submitSearch">
            <UInput v-model="q" placeholder="搜尋地點、景點或行程類型" icon="i-lucide-search" class="w-full max-w-sm" />
            <UButton type="submit" color="primary">
              搜尋
            </UButton>
          </form>

          <p v-if="selectedDate" class="mb-4 text-sm text-gray-500">
            已篩選出團日期：{{ selectedDate }}
            <UButton size="xs" color="neutral" variant="link" @click="selectedDate = null">
              清除
            </UButton>
          </p>

          <div v-if="displayedTrips.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <TripCard v-for="trip in displayedTrips" :key="trip.id" :trip="trip" />
          </div>
          <p v-else class="text-sm text-gray-500">
            找不到符合條件的行程
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
