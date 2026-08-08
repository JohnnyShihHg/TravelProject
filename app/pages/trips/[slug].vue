<script setup lang="ts">
import type { TripDetail } from '~/types/trip'

const route = useRoute()
const slug = route.params.slug as string

const { data: trip, error } = await useFetch<TripDetail>(`/api/trips/${slug}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: '找不到這個行程' })
}
</script>

<template>
  <TripDetailView v-if="trip" :trip="trip" />
</template>
