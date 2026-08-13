<script setup lang="ts">
import type { DestinationDetail, Crumb } from '~/types/trip'
import { toOgImageUrl } from '#shared/utils/image-sizes'

const route = useRoute()
const slug = route.params.slug as string

const { data: destination, error } = await useFetch<DestinationDetail>(`/api/destinations/${slug}`)

if (error.value || !destination.value) {
  throw createError({ statusCode: 404, statusMessage: '找不到這個目的地', fatal: true })
}

const crumbs = computed<Crumb[]>(() => {
  const list: Crumb[] = [{ label: '首頁', to: '/' }]
  if (destination.value?.parent) {
    list.push({ label: destination.value.parent.name, to: `/destinations/${destination.value.parent.slug}` })
  }
  list.push({ label: destination.value?.name ?? '' })
  return list
})

// 沒有介紹文時退回一句組出來的描述，避免 meta description 空白
const seoDescription = computed(() => {
  const d = destination.value
  if (!d) return ''
  if (d.description) return d.description
  return `${d.name}旅遊行程推薦，目前有 ${d.trips.length} 個出團行程`
    + (d.spots.length ? `，走訪${d.spots.slice(0, 3).map(s => s.name).join('、')}等景點` : '')
    + '。無穹旅行社為你規劃深度旅程。'
})

usePageSeo({
  title: destination.value.parent
    ? `${destination.value.parent.name}${destination.value.name}旅遊行程`
    : `${destination.value.name}旅遊行程`,
  description: seoDescription.value,
  // 掛 ?og=1 裁成 1200×630，不要讓 FB／LINE 自己亂裁任意比例的封面照
  image: (() => {
    const url = destination.value.coverImageUrl ?? destination.value.trips[0]?.coverImageUrl
    return url ? toOgImageUrl(url) : undefined
  })(),
  path: `/destinations/${slug}`
})

useJsonLd((abs) => {
  const d = destination.value
  if (!d) return null
  const items = [
    { name: '首頁', path: '/' },
    ...(d.parent ? [{ name: d.parent.name, path: `/destinations/${d.parent.slug}` }] : []),
    { name: d.name, path: `/destinations/${d.slug}` }
  ]
  return {
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((c, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': c.name,
      'item': abs(c.path)
    }))
  }
})
</script>

<template>
  <div v-if="destination">
    <section class="relative flex min-h-[320px] flex-col justify-end overflow-hidden pt-16 sm:min-h-[400px]">
      <AppImage
        v-if="destination.coverImageUrl"
        :src="destination.coverImageUrl"
        :alt="destination.name"
        sizes="100vw"
        fetchpriority="high"
        decoding="async"
        class="absolute inset-0 size-full object-cover"
      />
      <div v-else class="absolute inset-0 bg-gradient-to-br from-teal-800 via-sky-800 to-blue-900" />
      <div class="absolute inset-0 bg-black/40" />

      <div class="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <p class="text-sm font-medium text-white/80">
          {{ destination.type === 'country' ? '國家' : '城市' }}
        </p>
        <h1 class="mt-1 text-3xl font-bold text-white sm:text-4xl">
          {{ destination.name }}
        </h1>
      </div>
    </section>

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AppBreadcrumb :items="crumbs" />

      <p v-if="destination.description" class="mt-6 max-w-3xl text-base leading-relaxed text-gray-600">
        {{ destination.description }}
      </p>

      <!-- 國家頁列出底下的城市，建立 國家 → 城市 的內部連結 -->
      <section v-if="destination.children.length" class="mt-10">
        <h2 class="text-lg font-bold text-gray-900">
          {{ destination.name }}的城市
        </h2>
        <div class="mt-4 flex flex-wrap gap-2">
          <NuxtLink
            v-for="city in destination.children"
            :key="city.id"
            :to="`/destinations/${city.slug}`"
            class="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:border-primary hover:text-primary"
          >
            {{ city.name }}
          </NuxtLink>
        </div>
      </section>

      <section v-if="destination.spots.length" class="mt-10">
        <h2 class="text-lg font-bold text-gray-900">
          熱門景點
        </h2>
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="spot in destination.spots"
            :key="spot.id"
            :to="`/spots/${spot.slug}`"
            class="group rounded-xl border border-gray-100 p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <h3 class="text-sm font-semibold text-gray-900 group-hover:text-primary">
              {{ spot.name }}
            </h3>
            <p v-if="spot.description" class="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-500">
              {{ spot.description }}
            </p>
          </NuxtLink>
        </div>
      </section>

      <section class="mt-10">
        <h2 class="text-lg font-bold text-gray-900">
          {{ destination.name }}行程
          <span class="ml-1 text-sm font-normal text-gray-400">{{ destination.trips.length }} 個</span>
        </h2>
        <div v-if="destination.trips.length" class="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <TripCard v-for="trip in destination.trips" :key="trip.id" :trip="trip" />
        </div>
        <p v-else class="mt-4 text-sm text-gray-500">
          目前沒有前往{{ destination.name }}的行程，歡迎<NuxtLink to="/contact" class="text-primary hover:underline">
            與我們聯絡
          </NuxtLink>詢問客製規劃。
        </p>
      </section>

      <PhotoGallery :photos="destination.photos" class="mt-10" />
    </div>
  </div>
</template>
