<script setup lang="ts">
import type { HeroChoice } from '~/types/trip'

const selected = ref<HeroChoice | null>(null)

// 首頁標題不接品牌名後綴，因為它本身就是品牌頁
usePageSeo({
  title: '無穹旅行社｜小團深度旅遊．日本、韓國、台灣行程',
  description: '無穹旅行社專注小團深度旅遊，規劃日本賞櫻賞楓、北海道溫泉、韓國親子與台灣在地行程。每一段旅程都值得被記住。',
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
