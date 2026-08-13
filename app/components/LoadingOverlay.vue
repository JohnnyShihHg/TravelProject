<script setup lang="ts">
/**
 * 頁面切換時的讀取畫面。前台、後台共用同一個，掛在 app.vue 最外層。
 *
 * useLoadingIndicator() 是 Nuxt 內建的：頁面切換時（含 await useFetch 讓元件變成
 * async component 的情況）會自動觸發 page:loading:start / page:loading:end，
 * 不需要自己在每個頁面手動開關。它本身有 200ms 節流（isLoading 不會馬上變 true），
 * 所以已經有快取、切換很快的頁面不會閃一下就消失。
 *
 * 只在真的「重」的頁面顯示：像首頁、行程列表這種資料量小、幾乎秒開的頁面，
 * 半透明遮罩反而會讓使用者看到背後 BAR／Hero 先渲染出來，視覺上很奇怪。
 * 由目的地頁面自己在 definePageMeta 上標記 heavyLoading: true 來選擇要不要蓋遮罩
 * （見 admin/trips/new.vue、admin/trips/[id]/index.vue）。
 */
const { isLoading } = useLoadingIndicator()
const route = useRoute()
const showOverlay = computed(() => isLoading.value && !!(route.meta as Record<string, unknown>).heavyLoading)
</script>

<template>
  <!--
    用 v-show + CSS transition 而不是 <Transition> 元件：Vue 的進場/離場靠連續兩幀
    切換 class（v-leave-from → v-leave-active/v-leave-to）才能觸發 CSS transition，
    主執行緒一忙（例如同時有好幾個 useFetch 在跑）就可能卡在中間那一格，節點留在
    DOM 裡但看不見、也不會消失。這裡節點常駐 DOM，opacity 直接跟著 showOverlay
    這個 class 切換，不需要那條「兩幀接力」的鏈，就不會卡住，同時消失時仍有淡出效果。
  -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 backdrop-blur-sm transition-opacity duration-200"
    :class="showOverlay ? 'opacity-100' : 'pointer-events-none opacity-0'"
    role="status"
    aria-live="polite"
    :aria-hidden="!showOverlay"
  >
    <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary" />
    <span class="sr-only">載入中</span>
  </div>
</template>
