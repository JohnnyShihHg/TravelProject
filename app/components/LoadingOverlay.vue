<script setup lang="ts">
/**
 * 頁面切換時的讀取畫面。前台、後台共用同一個，掛在 app.vue 最外層。
 *
 * useLoadingIndicator() 是 Nuxt 內建的：頁面切換時（含 await useFetch 讓元件變成
 * async component 的情況）會自動觸發 page:loading:start / page:loading:end，
 * 不需要自己在每個頁面手動開關。它本身有 200ms 節流（isLoading 不會馬上變 true），
 * 所以已經有快取、切換很快的頁面不會閃一下就消失。
 *
 * 背景刻意用「不透明」而不是半透明：這個站幾乎每一頁都有 await useFetch，換頁時
 * Suspense 會把上一頁留在畫面上，半透明會讓上一頁的 BAR／Hero 隱約透出來，看起來像
 * 畫面壞掉。整片蓋住就只剩一個明確的「正在載入」狀態。
 *
 * 曾經改成只在標記 heavyLoading 的頁面才顯示，結果是錯的：會卡住導覽的不只後台表單，
 * /trips 這種前台頁一樣是 async component，白名單等於把它的載入回饋整個拿掉，
 * 使用者只會覺得點了沒反應。判準應該是「有沒有在載入」，不是「是哪一頁」。
 */
const { isLoading } = useLoadingIndicator()
</script>

<template>
  <!--
    用常駐 DOM + CSS transition 而不是 <Transition> 元件：Vue 的進場/離場靠連續兩幀
    切換 class（v-leave-from → v-leave-active/v-leave-to）才能觸發 CSS transition，
    主執行緒一忙（例如同時有好幾個 useFetch 在跑）就可能卡在中間那一格，節點留在
    DOM 裡但看不見、也不會消失。這裡節點常駐 DOM，opacity 直接跟著 isLoading
    這個 class 切換，不需要那條「兩幀接力」的鏈，就不會卡住，同時消失時仍有淡出效果。
  -->
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-200"
    :class="isLoading ? 'opacity-100' : 'pointer-events-none opacity-0'"
    role="status"
    aria-live="polite"
    :aria-hidden="!isLoading"
  >
    <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary" />
    <span class="sr-only">載入中</span>
  </div>
</template>
