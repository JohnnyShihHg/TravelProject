<script setup lang="ts">
const highlights = [
  { title: '京都賞楓私房路線', tag: '深度旅遊', color: 'from-orange-400 to-rose-500' },
  { title: '沖繩離島跳島攻略', tag: '海島度假', color: 'from-sky-400 to-cyan-500' },
  { title: '北海道雪季全攻略', tag: '冬季限定', color: 'from-indigo-400 to-blue-600' },
  { title: '東京都市漫遊三日', tag: '城市探索', color: 'from-emerald-400 to-teal-500' }
]
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="mb-8 flex items-end justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 sm:text-3xl">
          當前熱門
        </h2>
        <p class="mt-2 text-sm text-gray-500">
          精選近期最受歡迎的旅遊主題與行程
        </p>
      </div>
      <UButton color="neutral" variant="link" trailing-icon="i-lucide-arrow-right">
        查看全部
      </UButton>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="item in highlights"
        :key="item.title"
        class="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 shadow-sm transition-shadow hover:shadow-md"
      >
        <div
          class="flex h-40 items-center justify-center bg-gradient-to-br text-white/90"
          :class="item.color"
        >
          <UIcon name="i-lucide-image" class="size-8 opacity-70" />
        </div>
        <div class="p-4">
          <span class="text-xs font-medium text-primary">{{ item.tag }}</span>
          <h3 class="mt-1 text-sm font-semibold text-gray-900 group-hover:text-primary">
            {{ item.title }}
          </h3>
        </div>
      </article>
    </div>
  </section>
</template>
