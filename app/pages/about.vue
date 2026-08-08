<script setup lang="ts">
useSeoMeta({ title: '關於無穹 - 無穹旅行社' })
</script>

<template>
  <div>
    <div class="relative h-64 overflow-hidden sm:h-80">
      <img
        src="https://picsum.photos/seed/about-hero/1600/900"
        alt="無穹旅行社"
        class="size-full object-cover"
      >
      <div class="absolute inset-0 bg-black/30" />
      <div class="absolute inset-0 flex items-center justify-center">
        <h1 class="text-3xl font-bold text-white sm:text-4xl">
          關於無穹
        </h1>
      </div>
    </div>

    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <section>
        <h2 class="text-xl font-bold text-gray-900">
          品牌故事
        </h2>
        <p class="mt-4 leading-relaxed text-gray-600">
          無穹旅行社成立的初衷，是相信旅行不該只是走馬看花的行程堆疊，而是一段值得被好好規劃、慢慢感受的時光。
          我們專注於精緻小團，親自帶隊走過每一條路線，用實際踩點的經驗設計行程，而不是紙上談兵。
        </p>
        <p class="mt-4 leading-relaxed text-gray-600">
          從賞櫻、賞楓的季節限定行程，到溫泉美食之旅，我們相信每一趟旅程都該有屬於它的節奏——
          不趕路、不塞行程，把時間留給真正值得停留的風景。
        </p>
      </section>

      <section class="mt-12">
        <h2 class="text-xl font-bold text-gray-900">
          主要帶團路線
        </h2>
        <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <figure v-for="route in [
            { img: 'https://picsum.photos/seed/about-japan/600/400', label: '日本賞花賞楓路線' },
            { img: 'https://picsum.photos/seed/about-korea/600/400', label: '韓國親子路線' },
            { img: 'https://picsum.photos/seed/about-taiwan/600/400', label: '台灣深度小旅行' }
          ]" :key="route.label">
            <img :src="route.img" :alt="route.label" class="aspect-4/3 w-full rounded-lg object-cover">
            <figcaption class="mt-2 text-sm text-gray-600">
              {{ route.label }}
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
  </div>
</template>
