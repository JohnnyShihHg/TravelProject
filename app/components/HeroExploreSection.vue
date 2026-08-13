<script setup lang="ts">
import type { HeroChoice, TripSummary, TripTag } from '~/types/trip'

// dense 是手機版塞在入口列裡用的，內距要收小
const props = withDefaults(defineProps<{ choice: HeroChoice, dense?: boolean }>(), { dense: false })

const MAX_CARDS = 6

const isScoped = computed(() => props.choice === 'domestic' || props.choice === 'overseas')

// 刻意不 await：await 會讓這個元件變成 async component，
// 展開時要等 Suspense 解析完才進 DOM，外面算捲動落點時頁面還沒長高會被夾住。
//
// key 必須跟著 choice 走。以前是固定字串配上會變的 query，四個分類共用同一格快取，
// 彼此的結果會互相覆蓋。最明顯的副作用是主題模式：它查的是全部行程（query 為空），
// 卻可能拿到某個 scope 查詢留下的清單，主題卡上的「N 個行程」因此偏低。
const { data: trips, status } = useFetch<TripSummary[]>('/api/trips', {
  key: computed(() => `hero-explore-trips-${props.choice}`),
  query: computed(() => (isScoped.value ? { scope: props.choice } : {}))
})
const { data: tags } = useFetch<TripTag[]>('/api/tags')

const pending = computed(() => status.value === 'pending')

// ⚠️ 載入中一律當成沒有卡片。useFetch 在重新請求（含換 key）時**不會**把 data 清空，
// 它會一直留著上一次的結果直到新資料回來 —— 所以切換分類的瞬間，畫面上是「新的分類標題
// ＋ 上一個分類的卡片」。實測用 MutationObserver 錄下切換過程，第一個狀態就是
// 「國內線 :: 東京櫻花,京都賞楓,北海道溫,首爾親子」，接著才換成真正的國內線行程。
// 光把 key 改成跟著分類走不夠，因為模板是先判斷「有沒有卡片」才判斷 pending，
// 舊資料永遠會贏。這裡在來源就把載入中的舊資料擋掉，讓它走下面的留白分支。
const visibleTrips = computed(() => (pending.value ? [] : trips.value ?? []))

const tripCards = computed(() => visibleTrips.value.slice(0, MAX_CARDS))

// tags 拆表後只剩主題標籤，不需要再過濾 category。
// 載入中同樣整組讓開：主題卡上印的是行程數，用還沒回來的資料算會先閃出「0 個行程」。
const themeCards = computed(() => (pending.value
  ? []
  : (tags.value ?? [])
      .map(t => ({
        ...t,
        count: visibleTrips.value.filter(trip => trip.tags.some(x => x.id === t.id)).length
      }))
      .slice(0, MAX_CARDS)))

const config = computed(() => {
  switch (props.choice) {
    case 'domestic':
      return {
        title: '國內線',
        desc: '走訪台灣在地的深度小旅行',
        to: { path: '/trips', query: { scope: 'domestic' } }
      }
    case 'overseas':
      return {
        title: '國外線',
        desc: '日本、韓國等海外行程',
        to: { path: '/trips', query: { scope: 'overseas' } }
      }
    case 'flight':
      return {
        title: '機票代訂',
        desc: '由專人協助訂位與報價',
        to: { path: '/contact', query: { topic: '機票' } }
      }
    default:
      return {
        title: '主題挑選',
        desc: '依你想要的旅遊主題挑行程',
        to: { path: '/trips' }
      }
  }
})

// 一行四個，往下逐級收斂
const carouselUi = { item: 'basis-full sm:basis-1/2 lg:basis-1/4' }

const perView = useCardsPerView()

// 小螢幕的箭頭會被主題定位在 start-4/end-4，直接壓在卡片上，所以只在桌機顯示；
// 圓點兩邊都留著當位置提示（主題把它放在 -bottom-7，下面要留空間）。
const showArrows = computed(() => perView.value > 1)

function canLoop(count: number) {
  return count >= perView.value * 2
}
</script>

<template>
  <section
    class="mx-auto max-w-7xl"
    :class="dense ? 'px-5 py-6' : 'px-4 py-16 sm:px-6 lg:px-8'"
  >
    <div class="flex items-end justify-between gap-4" :class="dense ? 'mb-4' : 'mb-8'">
      <div>
        <h2 class="font-bold text-gray-900" :class="dense ? 'text-xl' : 'text-2xl sm:text-3xl'">
          {{ config.title }}
        </h2>
        <p class="mt-2 text-sm text-gray-500">
          {{ config.desc }}
        </p>
      </div>
      <UButton :to="config.to" color="neutral" variant="link" trailing-icon="i-lucide-arrow-right">
        查看更多
      </UButton>
    </div>

    <!-- 機票沒有商品資料，改放代訂說明 -->
    <div v-if="choice === 'flight'" class="rounded-2xl border border-gray-100 bg-gray-50 p-8">
      <p class="max-w-xl text-sm leading-relaxed text-gray-600">
        尚未開放線上訂票，目前提供人工代訂服務。告訴我們出發地、目的地與預計日期，會有專人為你確認艙等與報價。
      </p>
      <UButton :to="config.to" color="primary" class="mt-6">
        前往諮詢
      </UButton>
    </div>

    <!-- 主題模式：主題小卡，點了帶著該主題進行程頁 -->
    <UCarousel
      v-else-if="choice === 'theme' && themeCards.length"
      v-slot="{ item }"
      :items="themeCards"
      :arrows="showArrows"
      dots
      :loop="canLoop(themeCards.length)"
      align="start"
      class="mb-10"
      :ui="carouselUi"
    >
      <NuxtLink
        :to="{ path: '/trips', query: { tag: item.slug } }"
        class="group flex h-full flex-col justify-between rounded-xl border border-gray-100 p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md"
      >
        <UIcon name="i-lucide-compass" class="size-6 text-primary" />
        <div class="mt-6">
          <h3 class="text-lg font-semibold text-gray-900 group-hover:text-primary">
            {{ item.name }}
          </h3>
          <p class="mt-1 text-xs text-gray-500">
            {{ item.count }} 個行程
          </p>
        </div>
      </NuxtLink>
    </UCarousel>

    <!-- 國內／國外線：行程小卡 -->
    <UCarousel
      v-else-if="tripCards.length"
      v-slot="{ item }"
      :items="tripCards"
      :arrows="showArrows"
      dots
      :loop="canLoop(tripCards.length)"
      align="start"
      class="mb-10"
      :ui="carouselUi"
    >
      <TripCard :trip="item" />
    </UCarousel>

    <!-- 資料還在路上時先留白，避免閃一下「沒有行程」 -->
    <div v-else-if="pending" class="h-64" />
    <p v-else class="text-sm text-gray-500">
      這個分類目前還沒有行程
    </p>
  </section>
</template>
