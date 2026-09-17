<script setup lang="ts">
/**
 * 插在每日行程卡片之間的景點小卡。預設只露出圖片＋底部小字標題，
 * 滑鼠懸停（桌機）或點擊（觸控裝置沒有可靠的 :hover）展開標題＋簡短介紹＋查看更多。
 *
 * 展開內容用 print:opacity-100 強制在 PDF 匯出（Chromium 的 print 媒體查詢）裡
 * 一律可見 —— 印出來的頁面沒有「滑鼠懸停」這回事，不能讓介紹文字永遠藏著。
 */
const props = defineProps<{
  spot?: { slug: string, name: string, description: string | null, coverImageUrl: string | null }
  caption?: string
  imageUrl?: string
}>()

const expanded = ref(false)

const title = computed(() => props.spot?.name ?? '')
const image = computed(() => props.imageUrl || props.spot?.coverImageUrl || '')
const text = computed(() => props.caption || props.spot?.description || '')
</script>

<template>
  <div
    v-if="spot"
    class="group relative aspect-[3/2] w-full cursor-pointer overflow-hidden rounded-xl shadow-sm print:w-[200px] print:shadow-none print:break-inside-avoid print:aspect-square!"
    @click="expanded = !expanded"
  >
    <AppImage
      v-if="image"
      :src="image"
      :alt="title"
      sizes="(min-width: 640px) 400px, 100vw"
      loading="lazy"
      decoding="async"
      class="absolute inset-0 size-full object-cover"
    />
    <div v-else class="absolute inset-0 bg-gray-200" />

    <!-- 平常：底部漸層小字條，只有標題 -->
    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 print:hidden">
      <p class="flex items-center gap-1 text-xs font-medium text-white">
        <UIcon name="i-lucide-map-pin" class="size-3.5 shrink-0" />
        {{ title }}
      </p>
    </div>

    <!-- 展開：標題＋簡短介紹＋查看更多 -->
    <div
      class="absolute inset-0 flex flex-col justify-end bg-black/60 p-4 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 print:opacity-100"
      :class="{ 'opacity-100': expanded }"
    >
      <p class="text-sm font-semibold">
        {{ title }}
      </p>
      <p v-if="text" class="mt-1 line-clamp-3 text-xs text-white/90">
        {{ text }}
      </p>
      <UButton
        :to="`/spots/${spot.slug}`"
        size="xs"
        color="neutral"
        variant="solid"
        class="mt-2 w-fit print:hidden"
        trailing-icon="i-lucide-arrow-right"
        @click.stop
      >
        查看更多
      </UButton>
    </div>
  </div>
</template>
