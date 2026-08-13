<script setup lang="ts">
import type { GalleryPhoto } from '~/types/trip'

// 相簿只是提供地區瀏覽用，不做排序與燈箱。
// 沒有照片時整區不顯示。
const props = defineProps<{ photos: GalleryPhoto[] }>()

const hasPhotos = computed(() => props.photos.length > 0)
</script>

<template>
  <section v-if="hasPhotos">
    <h2 class="text-lg font-bold text-gray-900">
      相關照片
      <span class="ml-1 text-sm font-normal text-gray-400">{{ photos.length }} 張</span>
    </h2>

    <UCarousel
      v-slot="{ item }"
      :items="photos"
      :ui="{ item: 'basis-2/3 sm:basis-1/2 lg:basis-1/3' }"
      arrows
      class="mt-4"
    >
      <a
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group block overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
      >
        <AppImage
          :src="item.url"
          alt="相關照片"
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 66vw"
          loading="lazy"
          decoding="async"
          class="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </a>
    </UCarousel>
  </section>
</template>
