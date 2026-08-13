<script setup lang="ts">
import type { HeroChoice, HeroContent } from '~/types/trip'
import { toOgImageUrl } from '#shared/utils/image-sizes'

const selected = ref<HeroChoice | null>(null)

// key 與 HeroSection 相同（hero-home），所以共用同一格快取、不會多打一次 API。
// 這裡要它純粹是為了拿分享圖 —— 首頁是最常被貼到 LINE／FB 的網址，
// 但在補上這段之前它完全沒有 og:image，分享出去只有一張沒有圖的純文字卡。
const { data: hero } = await useFetch<HeroContent>('/api/hero', {
  key: 'hero-home',
  query: { page: 'home' }
})

// 後台指定的分享圖優先；沒指定就退回第一張 hero 圖。
//
// 只有 fallback 需要掛 ?og=1：hero 圖是寬幅橫幅，比例跟分享卡不同，不裁會被平台自己亂裁。
// 後台指定的那張是在裁切對話框裡就已經裁成 1.91:1 的，再讓伺服器 fit:'cover' 重裁一次
// 只會把它放大回 1200 寬 —— 原圖比 1200 窄時等於平白變模糊，還多存一份衍生檔。
const ogImage = computed(() => {
  if (hero.value?.ogImageUrl) return hero.value.ogImageUrl
  const fallback = hero.value?.images[0]?.url
  return fallback ? toOgImageUrl(fallback) : undefined
})

// 首頁標題不接品牌名後綴，因為它本身就是品牌頁
usePageSeo({
  title: '無穹旅行社｜小團深度旅遊．日本、韓國、台灣行程',
  description: '無穹旅行社專注小團深度旅遊，規劃日本賞櫻賞楓、北海道溫泉、韓國親子與台灣在地行程。每一段旅程都值得被記住。',
  image: ogImage.value,
  path: '/',
  appendBrand: false
})

useJsonLd(abs => ({
  '@type': 'TravelAgency',
  'name': '無穹旅行社',
  'url': abs('/'),
  'description': '專注小團深度旅遊的旅行社',
  'address': {
    '@type': 'PostalAddress',
    'streetAddress': '中山區吉林路24號4樓之5',
    'addressLocality': '臺北市',
    'addressCountry': 'TW'
  },
  'telephone': '+886-986-056-305',
  'email': 'nadia861130@gmail.com'
}))

// 手機版的展開內容是接在入口列裡面（手風琴），只有桌機才渲染在 hero 下方
const isDesktop = useIsDesktop()
</script>

<template>
  <div>
    <HeroSection v-model:selected="selected" />

    <HeroExploreSection v-if="selected && isDesktop" :choice="selected" />

    <TrendingSection />
  </div>
</template>
