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
    <section class="relative overflow-hidden">
      <img
        src="https://picsum.photos/seed/trip-calendar/1600/500"
        alt=""
        class="absolute inset-0 size-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-br from-teal-900/40 via-sky-900/30 to-blue-950/40" />

      <div class="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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
      <div v-if="displayedTrips.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <TripCard v-for="trip in displayedTrips" :key="trip.id" :trip="trip" />
      </div>
      <p v-else class="text-sm text-gray-500">
        找不到符合條件的行程
      </p>
    </div>
  </div>
</template>
