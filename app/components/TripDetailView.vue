<script setup lang="ts">
import type { TripDetail } from '~/types/trip'

const props = defineProps<{ trip: TripDetail }>()

const gallery = computed(() => props.trip.images.filter(i => !i.isCover))

const sortedBatches = computed(() => [...props.trip.batches].sort((a, b) => a.departureDate.localeCompare(b.departureDate)))
const showAllBatches = ref(false)
const visibleBatches = computed(() => (showAllBatches.value ? sortedBatches.value : sortedBatches.value.slice(0, 1)))

const showBookingBar = ref(false)
const barBatchId = ref<number | null>(null)
watchEffect(() => {
  if (barBatchId.value === null && sortedBatches.value.length) {
    barBatchId.value = sortedBatches.value[0].id
  }
})
const barBatch = computed(() => sortedBatches.value.find(b => b.id === barBatchId.value) ?? sortedBatches.value[0])
const barBatchOptions = computed(() => sortedBatches.value.map(b => ({
  label: `${b.departureDate} ～ ${b.returnDate}`,
  value: b.id
})))

const bookingTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
onMounted(() => {
  if (!bookingTrigger.value) return
  observer = new IntersectionObserver(([entry]) => {
    showBookingBar.value = !entry.isIntersecting && entry.boundingClientRect.top < 0
  }, { threshold: 0 })
  observer.observe(bookingTrigger.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div>
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0 md:-translate-y-2"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0 md:-translate-y-2"
    >
      <div
        v-if="showBookingBar && barBatch"
        class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white shadow-lg md:top-16 md:bottom-auto md:border-t-0 md:border-b"
      >
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <p v-if="barBatch.priceInfo" class="shrink-0 text-base font-bold text-primary">
            {{ barBatch.priceInfo }}
          </p>

          <div class="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <USelect
              v-model="barBatchId"
              :items="barBatchOptions"
              icon="i-lucide-calendar"
              class="min-w-0 flex-1 sm:w-56 sm:flex-none"
            />

            <UButton :to="`/contact?trip=${trip.id}`" color="primary" size="lg" class="shrink-0">
              諮詢行程
            </UButton>
          </div>
        </div>
      </div>
    </Transition>

    <div class="relative h-72 overflow-hidden sm:h-96">
      <img v-if="trip.coverImageUrl" :src="trip.coverImageUrl" :alt="trip.title" class="size-full object-cover">
      <div class="absolute inset-0 bg-black/30" />
      <div class="absolute inset-x-0 bottom-0 mx-auto max-w-[1200px] px-4 pb-8 sm:px-6">
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

    <div class="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <section class="relative">
        <div ref="bookingTrigger" class="pointer-events-none absolute inset-x-0" style="top: 80%" />

        <div class="mb-1 flex items-center justify-center gap-2 text-gray-900">
          <UIcon name="i-lucide-ticket" class="size-5 text-primary sm:size-6" />
          <span class="text-xl font-semibold sm:text-2xl">出團梯次</span>
        </div>
        <p v-if="sortedBatches.length" class="mb-4 text-center text-sm text-gray-400">
          預設顯示最近出發梯次
        </p>

        <div v-if="sortedBatches.length" class="space-y-3">
          <div v-for="batch in visibleBatches" :key="batch.id" class="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
            <p class="text-base font-semibold text-gray-900">
              {{ batch.departureDate }} ～ {{ batch.returnDate }}
            </p>
            <div class="sm:text-right">
              <dl class="space-y-1 text-sm text-gray-500">
                <div v-if="batch.flightInfo" class="flex justify-between gap-2 sm:justify-end">
                  <dt>班機</dt><dd>{{ batch.flightInfo }}</dd>
                </div>
                <div v-if="batch.meetingPoint" class="flex justify-between gap-2 sm:justify-end">
                  <dt>集合地點</dt><dd>{{ batch.meetingPoint }}</dd>
                </div>
                <div v-if="batch.groupSize" class="flex justify-between gap-2 sm:justify-end">
                  <dt>成團人數</dt><dd>{{ batch.groupSize }} 人</dd>
                </div>
              </dl>
              <p v-if="batch.priceInfo" class="mt-2 text-base font-bold text-primary">
                {{ batch.priceInfo }}
              </p>
            </div>
          </div>

          <UButton
            v-if="sortedBatches.length > 1"
            block
            color="neutral"
            variant="ghost"
            :trailing-icon="showAllBatches ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            @click="showAllBatches = !showAllBatches"
          >
            {{ showAllBatches ? '收合' : '其他梯次' }}
          </UButton>
        </div>
        <p v-else class="text-center text-sm text-gray-500">
          目前尚無公開的出團日期
        </p>

        <UButton :to="`/contact?trip=${trip.id}`" block color="primary" size="lg" class="mt-4">
          我要諮詢這個行程
        </UButton>
      </section>

      <article class="mt-10 md:mt-40">
        <TripContentBlocks :blocks="trip.blocks" />

        <div v-if="gallery.length" class="mt-10">
          <h2 class="text-xl font-semibold text-gray-900">
            行程相簿
          </h2>
          <UCarousel
            v-slot="{ item }"
            :items="gallery"
            arrows
            dots
            class="mt-4"
            :ui="{ item: 'basis-1/2 sm:basis-1/3' }"
          >
            <img :src="item.url" class="aspect-square w-full rounded-lg object-cover">
          </UCarousel>
        </div>
      </article>
    </div>
  </div>
</template>
