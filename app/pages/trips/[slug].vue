<script setup lang="ts">
import type { TripDetail } from '~/types/trip'

const route = useRoute()
const slug = route.params.slug as string

const { data: trip, error } = await useFetch<TripDetail>(`/api/trips/${slug}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: '找不到這個行程' })
}

const gallery = computed(() => trip.value?.images.filter(i => !i.isCover) ?? [])
</script>

<template>
  <div v-if="trip">
    <div class="relative h-72 overflow-hidden sm:h-96">
      <img v-if="trip.coverImageUrl" :src="trip.coverImageUrl" :alt="trip.title" class="size-full object-cover">
      <div class="absolute inset-0 bg-black/30" />
      <div class="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="tag in trip.tags" :key="tag.id" color="primary" variant="solid">
            {{ tag.name }}
          </UBadge>
        </div>
        <h1 class="mt-3 text-2xl font-bold text-white sm:text-4xl">
          {{ trip.title }}
        </h1>
      </div>
    </div>

    <div class="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
      <article>
        <p class="text-base text-gray-600">
          {{ trip.summary }}
        </p>

        <div class="prose prose-sm mt-6 max-w-none" v-html="trip.content" />

        <div v-if="gallery.length" class="mt-10">
          <h2 class="text-lg font-semibold text-gray-900">
            行程相簿
          </h2>
          <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <img
              v-for="img in gallery"
              :key="img.id"
              :src="img.url"
              class="aspect-square rounded-lg object-cover"
            >
          </div>
        </div>
      </article>

      <aside class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">
          出團梯次
        </h2>
        <div v-if="trip.batches.length" class="space-y-3">
          <div v-for="batch in trip.batches" :key="batch.id" class="rounded-xl border border-gray-100 p-4 shadow-sm">
            <p class="text-sm font-semibold text-gray-900">
              {{ batch.departureDate }} ～ {{ batch.returnDate }}
            </p>
            <dl class="mt-2 space-y-1 text-xs text-gray-500">
              <div v-if="batch.flightInfo" class="flex justify-between gap-2">
                <dt>班機</dt><dd>{{ batch.flightInfo }}</dd>
              </div>
              <div v-if="batch.meetingPoint" class="flex justify-between gap-2">
                <dt>集合地點</dt><dd>{{ batch.meetingPoint }}</dd>
              </div>
              <div v-if="batch.groupSize" class="flex justify-between gap-2">
                <dt>成團人數</dt><dd>{{ batch.groupSize }} 人</dd>
              </div>
            </dl>
            <p v-if="batch.priceInfo" class="mt-3 text-sm font-bold text-primary">
              {{ batch.priceInfo }}
            </p>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500">
          目前尚無公開的出團日期
        </p>

        <UButton :to="`/contact?trip=${trip.id}`" block color="primary" size="lg">
          我要諮詢這個行程
        </UButton>
      </aside>
    </div>
  </div>
</template>
