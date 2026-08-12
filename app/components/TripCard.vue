<script setup lang="ts">
import type { TripSummary } from '~/types/trip'

const props = defineProps<{ trip: TripSummary }>()

// 卡片標題上方那行小字顯示地點（東京／京都…）比顯示主題（賞花）好認。
// 拆表前 tags[0] 剛好是地點標籤，現在要明確從 destinations 取。
const primaryLabel = computed(() =>
  props.trip.primaryDestination?.name ?? props.trip.tags[0]?.name ?? '行程'
)
</script>

<template>
  <NuxtLink
    :to="`/trips/${trip.slug}`"
    class="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="h-40 shrink-0 overflow-hidden bg-gray-100">
      <img
        v-if="trip.coverImageUrl"
        :src="trip.coverImageUrl"
        :alt="trip.title"
        loading="lazy"
        decoding="async"
        class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      >
    </div>
    <div class="flex flex-1 flex-col p-4">
      <div class="flex min-w-0 flex-nowrap items-center gap-2">
        <span class="min-w-0 truncate text-xs font-medium text-primary">{{ primaryLabel }}</span>
        <UBadge v-if="trip.badge" color="warning" variant="subtle" size="sm" class="shrink-0">
          {{ trip.badge }}
        </UBadge>
      </div>
      <h3 class="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-900 group-hover:text-primary">
        {{ trip.title }}
      </h3>
      <p class="mt-2 line-clamp-2 min-h-[2rem] text-xs text-gray-500">
        {{ trip.summary }}
      </p>
      <div class="mt-auto flex items-center justify-between pt-3 text-xs text-gray-500">
        <span>{{ trip.days }} 天</span>
        <span v-if="trip.nextBatch">最近出團 {{ trip.nextBatch.departureDate }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
