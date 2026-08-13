<script setup lang="ts">
/**
 * 全站切換頁面時的讀取畫面。前台、後台共用同一個，掛在 app.vue 最外層。
 *
 * useLoadingIndicator() 是 Nuxt 內建的：頁面切換時（含 await useFetch 讓元件變成
 * async component 的情況）會自動觸發 page:loading:start / page:loading:end，
 * 不需要自己在每個頁面手動開關。它本身有 200ms 節流（isLoading 不會馬上變 true），
 * 所以已經有快取、切換很快的頁面不會閃一下就消失。
 */
const { isLoading } = useLoadingIndicator()
</script>

<template>
  <!--
    刻意不用 <Transition> 淡入淡出：Vue 的進場/離場靠連續兩幀切換 class
    （v-leave-from → v-leave-active/v-leave-to）才能觸發 CSS transition，
    主執行緒一忙（例如同時有好幾個 useFetch 在跑）就可能卡在中間那一格，
    節點留在 DOM 裡但看不見、也不會消失。直接 v-if 沒有這條鏈可以卡住。
  -->
  <div
    v-if="isLoading"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 backdrop-blur-sm"
    role="status"
    aria-live="polite"
  >
    <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary" />
    <span class="sr-only">載入中</span>
  </div>
</template>
