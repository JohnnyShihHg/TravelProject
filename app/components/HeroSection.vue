<script setup lang="ts">
import type { HeroContent } from '~/types/trip'

const search = ref('')
const router = useRouter()
const { data: hero } = await useFetch<HeroContent>('/api/hero')

function submitSearch() {
  router.push({ path: '/trips', query: search.value ? { q: search.value } : {} })
}
</script>

<template>
  <section class="relative flex h-[480px] items-center justify-center overflow-hidden sm:h-[560px]">
    <img
      v-if="hero?.imageUrl"
      :src="hero.imageUrl"
      alt=""
      class="absolute inset-0 size-full object-cover"
    >
    <div class="absolute inset-0 bg-gradient-to-br from-teal-700/80 via-sky-700/80 to-blue-900/80" />
    <div class="absolute inset-0 bg-black/20" />

    <div class="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center">
      <h1 class="text-3xl font-bold text-white sm:text-5xl">
        {{ hero?.title ?? '無穹旅行社' }}
      </h1>
      <p class="mt-4 text-base text-white/90 sm:text-lg">
        {{ hero?.subtitle ?? '探索你的下一趟旅程' }}
      </p>

      <form class="mt-8 flex w-full max-w-xl flex-row items-center gap-2 rounded-full bg-white p-2 shadow-lg" @submit.prevent="submitSearch">
        <UIcon name="i-lucide-search" class="ml-3 size-5 shrink-0 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="搜尋地點、景點或行程類型"
          class="w-full min-w-0 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        >
        <UButton type="submit" color="primary" variant="solid" size="lg" class="shrink-0 whitespace-nowrap rounded-full px-6">
          搜尋
        </UButton>
      </form>
    </div>
  </section>
</template>
