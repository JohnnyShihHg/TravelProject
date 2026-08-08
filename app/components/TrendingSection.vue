<script setup lang="ts">
import type { TripSummary } from '~/types/trip'

const { data: trips } = await useFetch<TripSummary[]>('/api/trips', { query: { featured: '1' } })
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="mb-8 flex items-end justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 sm:text-3xl">
          當前熱門
        </h2>
        <p class="mt-2 text-sm text-gray-500">
          精選近期最受歡迎的旅遊主題與行程
        </p>
      </div>
      <UButton to="/trips" color="neutral" variant="link" trailing-icon="i-lucide-arrow-right">
        查看全部
      </UButton>
    </div>

    <div v-if="trips?.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
    </div>
    <p v-else class="text-sm text-gray-500">
      目前尚無精選行程
    </p>
  </section>
</template>
