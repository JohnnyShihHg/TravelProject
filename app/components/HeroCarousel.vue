<script setup lang="ts">
import type { HeroImage } from '~/types/trip'

/**
 * Hero 的背景輪播。四個頁面共用，永遠是「絕對定位鋪滿外層 section」的用法，
 * 所以外層必須是 relative + overflow-hidden。
 */
const props = withDefaults(defineProps<{
  images: HeroImage[]
  /** 給無障礙用的圖片描述，例如「無穹旅行社首頁主視覺」 */
  alt?: string
  /**
   * 圓點的位置。只有各頁自己知道底部有沒有別的東西擋著
   * （首頁底部整條入口列都是內容，手機版更高達四列），所以交給呼叫端決定。
   */
  dotsClass?: string
}>(), { alt: '', dotsClass: 'bottom-6' })

// 只有一張時不掛 carousel：省掉整個 embla 的 hydration，
// 而且 hero 是 LCP，能少一層 JS 就少一層。
const isCarousel = computed(() => props.images.length > 1)

// 使用者在系統設定裡要求減少動態效果時不要自動輪播 —— 全螢幕的圖片自己會動，
// 對前庭失調的人特別不舒服。
//
// 在 setup 階段就決定，不要等 onMounted 才打開：UCarousel 的 embla 是在掛載時用當下的
// plugin 清單初始化的（子元件的 onMounted 比父元件早跑），掛載後才改會多一次
// 「載入外掛 → reInit」的來回。它會自己補上，但沒必要製造這段時序。
// import.meta.client 在瀏覽器端的 setup 就已經是 true，SSR 端才是 false；
// 這個值不影響輸出的 DOM，所以不會有 hydration 不一致的問題。
const autoplay = import.meta.client && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
</script>

<template>
  <UCarousel
    v-if="isCarousel"
    v-slot="{ item, index }"
    :items="images"
    :arrows="false"
    dots
    loop
    :autoplay="autoplay ? { delay: 5000 } : false"
    class="absolute inset-0 size-full"
    :ui="{
      root: 'size-full',
      viewport: 'size-full',
      // 預設的 container/item 帶著 -ms-4 / ps-4 的卡片間距，滿版背景圖不能有這個縫
      container: 'h-full items-stretch ms-0',
      item: 'h-full basis-full ps-0',
      // 預設是 -bottom-7（圓點在元件外面下方），滿版 hero 會被 overflow-hidden 裁掉
      dots: `z-20 ${dotsClass}`,
      dot: 'size-2.5 bg-white/50 ring-1 ring-black/20 data-[state=active]:bg-white'
    }"
  >
    <!-- 只有第一張搶頻寬（它就是 LCP），其餘等真的要顯示時才載 -->
    <AppImage
      :src="item.url"
      :alt="index === 0 ? alt : ''"
      sizes="100vw"
      :loading="index === 0 ? 'eager' : 'lazy'"
      :fetchpriority="index === 0 ? 'high' : 'low'"
      decoding="async"
      class="size-full object-cover"
    />
  </UCarousel>

  <AppImage
    v-else-if="images[0]"
    :src="images[0].url"
    :alt="alt"
    sizes="100vw"
    fetchpriority="high"
    decoding="async"
    class="absolute inset-0 size-full object-cover"
  />
</template>
