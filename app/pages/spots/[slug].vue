<script setup lang="ts">
import type { SpotDetail, Crumb } from '~/types/trip'

const route = useRoute()
const slug = route.params.slug as string

const { data: spot, error } = await useFetch<SpotDetail>(`/api/spots/${slug}`)

if (error.value || !spot.value) {
  throw createError({ statusCode: 404, statusMessage: '找不到這個景點', fatal: true })
}

// 首頁 › 日本 › 京都 › 清水寺
const crumbs = computed<Crumb[]>(() => {
  const list: Crumb[] = [{ label: '首頁', to: '/' }]
  if (spot.value?.destinationParent) {
    list.push({ label: spot.value.destinationParent.name, to: `/destinations/${spot.value.destinationParent.slug}` })
  }
  if (spot.value?.destination) {
    list.push({ label: spot.value.destination.name, to: `/destinations/${spot.value.destination.slug}` })
  }
  list.push({ label: spot.value?.name ?? '' })
  return list
})

// 有座標就給一個地圖連結，不嵌入第三方地圖（會拖慢載入也帶來追蹤問題）
const mapUrl = computed(() =>
  spot.value?.lat && spot.value?.lng
    ? `https://www.google.com/maps/search/?api=1&query=${spot.value.lat},${spot.value.lng}`
    : null
)

const seoDescription = computed(() => {
  const s = spot.value
  if (!s) return ''
  if (s.description) return s.description
  return `${s.name}${s.destination ? `位於${s.destination.name}` : ''}，`
    + `無穹旅行社目前有 ${s.trips.length} 個造訪${s.name}的旅遊行程。`
})

usePageSeo({
  title: spot.value.destination
    ? `${spot.value.destination.name}${spot.value.name}`
    : spot.value.name,
  description: seoDescription.value,
  image: spot.value.coverImageUrl ?? spot.value.photos[0]?.url,
  path: `/spots/${slug}`
})

// TouristAttraction 讓 Google 知道這是景點；有座標就一併提供，
// 這是景點頁比一般文章頁多出來的結構化資訊。
useJsonLd((abs) => {
  const s = spot.value
  if (!s) return null
  const items = [
    { name: '首頁', path: '/' },
    ...(s.destinationParent ? [{ name: s.destinationParent.name, path: `/destinations/${s.destinationParent.slug}` }] : []),
    ...(s.destination ? [{ name: s.destination.name, path: `/destinations/${s.destination.slug}` }] : []),
    { name: s.name, path: `/spots/${s.slug}` }
  ]
  return {
    '@graph': [
      {
        '@type': 'TouristAttraction',
        'name': s.name,
        'description': toMetaDescription(s.description, 300),
        'url': abs(`/spots/${s.slug}`),
        ...(s.coverImageUrl || s.photos[0] ? { image: abs(s.coverImageUrl ?? s.photos[0]!.url) } : {}),
        ...(s.address ? { address: { '@type': 'PostalAddress', 'streetAddress': s.address } } : {}),
        ...(s.lat && s.lng
          ? { geo: { '@type': 'GeoCoordinates', 'latitude': s.lat, 'longitude': s.lng } }
          : {})
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': items.map((c, i) => ({
          '@type': 'ListItem',
          'position': i + 1,
          'name': c.name,
          'item': abs(c.path)
        }))
      }
    ]
  }
})
</script>

<template>
  <div v-if="spot">
    <section class="relative flex min-h-[320px] flex-col justify-end overflow-hidden pt-16 sm:min-h-[400px]">
      <img
        v-if="spot.coverImageUrl"
        :src="spot.coverImageUrl"
        :alt="spot.name"
        class="absolute inset-0 size-full object-cover"
      >
      <div v-else class="absolute inset-0 bg-gradient-to-br from-amber-800 via-orange-800 to-rose-900" />
      <div class="absolute inset-0 bg-black/40" />

      <div class="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <p v-if="spot.destination" class="text-sm font-medium text-white/80">
          {{ spot.destination.name }}
        </p>
        <h1 class="mt-1 text-3xl font-bold text-white sm:text-4xl">
          {{ spot.name }}
        </h1>
      </div>
    </section>

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AppBreadcrumb :items="crumbs" />

      <div class="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <p v-if="spot.description" class="max-w-3xl text-base leading-relaxed text-gray-600">
            {{ spot.description }}
          </p>

          <section class="mt-10">
            <h2 class="text-lg font-bold text-gray-900">
              造訪{{ spot.name }}的行程
              <span class="ml-1 text-sm font-normal text-gray-400">{{ spot.trips.length }} 個</span>
            </h2>
            <div v-if="spot.trips.length" class="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <TripCard v-for="trip in spot.trips" :key="trip.id" :trip="trip" />
            </div>
            <p v-else class="mt-4 text-sm text-gray-500">
              目前沒有包含{{ spot.name }}的行程，歡迎<NuxtLink to="/contact" class="text-primary hover:underline">
                與我們聯絡
              </NuxtLink>詢問客製規劃。
            </p>
          </section>

          <PhotoGallery :photos="spot.photos" class="mt-10" />
        </div>

        <aside v-if="spot.address || mapUrl || spot.destination" class="h-fit rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 class="text-sm font-bold text-gray-900">
            景點資訊
          </h2>
          <dl class="mt-3 space-y-3 text-sm">
            <div v-if="spot.address">
              <dt class="text-xs text-gray-400">
                地址
              </dt>
              <dd class="mt-0.5 text-gray-700">
                {{ spot.address }}
              </dd>
            </div>
            <div v-if="spot.destination">
              <dt class="text-xs text-gray-400">
                所在地
              </dt>
              <dd class="mt-0.5">
                <NuxtLink :to="`/destinations/${spot.destination.slug}`" class="text-primary hover:underline">
                  {{ spot.destination.name }}
                </NuxtLink>
              </dd>
            </div>
          </dl>
          <UButton
            v-if="mapUrl"
            :to="mapUrl"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-map-pin"
            class="mt-4 w-full justify-center"
          >
            在地圖上查看
          </UButton>
        </aside>
      </div>
    </div>
  </div>
</template>
