<script setup lang="ts">
const search = ref('')
</script>

<template>
  <section class="relative flex h-[480px] items-center justify-center overflow-hidden sm:h-[560px]">
    <div class="absolute inset-0 bg-gradient-to-br from-teal-700 via-sky-700 to-blue-900" />
    <div class="absolute inset-0 bg-black/20" />

    <div class="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center">
      <h1 class="text-3xl font-bold text-white sm:text-5xl">
        探索你的下一趟旅程
      </h1>
      <p class="mt-4 text-base text-white/90 sm:text-lg">
        景點、行程、住宿，一站規劃你的完美旅行
      </p>

      <div class="mt-8 flex w-full max-w-xl flex-row items-center gap-2 rounded-full bg-white p-2 shadow-lg">
        <UIcon name="i-lucide-search" class="ml-3 size-5 shrink-0 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="搜尋景點、城市或行程"
          class="w-full min-w-0 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        >
        <UButton color="primary" variant="solid" size="lg" class="shrink-0 whitespace-nowrap rounded-full px-6">
          搜尋
        </UButton>
      </div>
    </div>
  </section>
</template>
