<script setup lang="ts">
import type { TripDetail } from '~/types/trip'
import { toOgImageUrl } from '#shared/utils/image-sizes'

const route = useRoute()
const slug = route.params.slug as string

const { data: trip, error } = await useFetch<TripDetail>(`/api/trips/${slug}`)

if (error.value || !trip.value) {
  throw createError({ statusCode: 404, statusMessage: '找不到這個行程', fatal: true })
}

// seoTitle / seoDescription 留空時自動用 title / summary，編輯者不填也有正確的 meta
usePageSeo({
  title: trip.value.seoTitle || trip.value.title,
  description: trip.value.seoDescription || trip.value.summary,
  // 封面照是任意比例，直接丟給 FB／LINE 會被它們自己裁（直式照片常常只剩中間一條）。
  // 掛 ?og=1 讓伺服器先裁成 1200×630，裁哪一塊由我們決定。
  image: trip.value.coverImageUrl ? toOgImageUrl(trip.value.coverImageUrl) : undefined,
  path: `/trips/${slug}`,
  type: 'article'
})

// TouristTrip 讓 Google 知道這是「旅遊行程」而不是普通文章；
// offers 帶上出發日期與數字價格，才有機會在搜尋結果顯示價格。
useJsonLd((abs) => {
  const t = trip.value
  if (!t) return null

  const crumbs = [
    { name: '首頁', path: '/' },
    ...(t.primaryDestination?.parent
      ? [{ name: t.primaryDestination.parent.name, path: `/destinations/${t.primaryDestination.parent.slug}` }]
      : []),
    ...(t.primaryDestination
      ? [{ name: t.primaryDestination.name, path: `/destinations/${t.primaryDestination.slug}` }]
      : []),
    { name: t.title, path: `/trips/${t.slug}` }
  ]

  return {
    '@graph': [
      {
        '@type': 'TouristTrip',
        'name': t.title,
        'description': toMetaDescription(t.seoDescription || t.summary, 300),
        'url': abs(`/trips/${t.slug}`),
        ...(t.coverImageUrl ? { image: abs(t.coverImageUrl) } : {}),
        ...(t.spots.length
          ? {
              itinerary: {
                '@type': 'ItemList',
                'itemListElement': t.spots.map((s, i) => ({
                  '@type': 'ListItem',
                  'position': i + 1,
                  'item': {
                    '@type': 'TouristAttraction',
                    'name': s.name,
                    'url': abs(`/spots/${s.slug}`)
                  }
                }))
              }
            }
          : {}),
        // priceInfo 是給人看的字串（"NT$ 42,900 起"），JSON-LD 需要數字，用 priceFrom
        ...(t.batches.some(b => b.priceFrom)
          ? {
              offers: t.batches
                .filter(b => b.priceFrom)
                .map(b => ({
                  '@type': 'Offer',
                  'price': b.priceFrom,
                  'priceCurrency': 'TWD',
                  'availabilityStarts': b.departureDate,
                  'url': abs(`/trips/${t.slug}`)
                }))
            }
          : {}),
        'provider': { '@type': 'TravelAgency', 'name': '無穹旅行社', 'url': abs('/') }
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': crumbs.map((c, i) => ({
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
  <TripDetailView v-if="trip" :trip="trip" />
</template>
