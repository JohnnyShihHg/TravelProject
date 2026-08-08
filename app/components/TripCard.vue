<script setup lang="ts">
import type { TripSummary } from '~/types/trip'

const props = defineProps<{ trip: TripSummary }>()

const primaryTag = props.trip.tags[0]?.name ?? '行程'
</script>

<template>
  <NuxtLink
    :to="`/trips/${trip.slug}`"
    class="group block cursor-pointer overflow-hidden rounded-xl border border-gray-100 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="h-40 overflow-hidden bg-gray-100">
      <img
        v-if="trip.coverImageUrl"
        :src="trip.coverImageUrl"
        :alt="trip.title"
        class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      >
    </div>
    <div class="p-4">
      <span class="text-xs font-medium text-primary">{{ primaryTag }}</span>
      <h3 class="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-primary">
        {{ trip.title }}
      </h3>
      <p class="mt-2 line-clamp-2 text-xs text-gray-500">
        {{ trip.summary }}
      </p>
      <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>{{ trip.days }} 天</span>
        <span v-if="trip.nextBatch">最近出團 {{ trip.nextBatch.departureDate }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
