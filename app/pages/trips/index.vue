<script setup lang="ts">
import type { TripSummary, CalendarBatch, TripTag, Destination, Spot } from '~/types/trip'

const route = useRoute()
const router = useRouter()

const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedDate = ref<string | null>(null)

// 首頁 hero 會帶 scope（國內/國外）與 tag（主題／地點／景點的 slug）進來
const scope = computed(() => (route.query.scope === 'domestic' || route.query.scope === 'overseas' ? route.query.scope : ''))
const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : ''))

const SCOPE_LABEL: Record<string, string> = { domestic: '國內線', overseas: '國外線' }

// canonical 刻意固定指向 /trips（不帶 query）：?tag=、?scope=、?q= 產生的是同一批內容的
// 不同檢視，讓搜尋引擎知道正本是哪一頁，避免被當成重複內容。
usePageSeo({
  title: '探索行程',
  description: '查看無穹旅行社所有出團行程與出發日期，依目的地、主題或出團月份挑選適合你的旅程。',
  path: '/trips'
})

const { data: batches } = await useFetch<CalendarBatch[]>('/api/batches')
const { data: allTags } = await useFetch<TripTag[]>('/api/tags')
const { data: allDestinations } = await useFetch<Destination[]>('/api/destinations')
const { data: allSpots } = await useFetch<Spot[]>('/api/spots')

// tag 參數同時可能是主題標籤、地點或景點的 slug（見 server/api/trips/index.get.ts），
// 顯示時要把 slug 換回中文，不然使用者會看到英文網址片段
const tagLabel = computed(() => {
  const raw = tag.value
  if (!raw) return ''
  const found = (allTags.value ?? []).find(t => t.slug === raw || t.name === raw)
    ?? (allDestinations.value ?? []).find(d => d.slug === raw || d.name === raw)
    ?? (allSpots.value ?? []).find(s => s.slug === raw || s.name === raw)
  return found?.name ?? raw
})

// tag 已經呈現在搜尋 bar 裡（見下方 watch），篩選條件列只保留 scope，
// 避免同一件事講兩次
const activeFilters = computed(() => {
  const list: string[] = []
  if (scope.value) list.push(SCOPE_LABEL[scope.value]!)
  return list
})

const { data: trips, refresh } = await useFetch<TripSummary[]>('/api/trips', {
  query: computed(() => ({
    ...(q.value ? { q: q.value } : {}),
    ...(scope.value ? { scope: scope.value } : {}),
    ...(tag.value ? { tag: tag.value } : {})
  }))
})

// 從 tag 切過來時，把中文名稱帶進搜尋框，製造「透過搜尋 bar 查到的」錯覺；
// 底層仍然是靠 tag= 精確篩選（見上面的 query），這裡純粹是顯示
const isTagDerived = ref(false)
watchEffect(() => {
  if (tag.value && tagLabel.value) {
    isTagDerived.value = true
    q.value = tagLabel.value
  }
})

function onSearchInput() {
  isTagDerived.value = false
}

function clearFilters() {
  isTagDerived.value = false
  router.replace({ query: q.value ? { q: q.value } : {} })
}

const displayedTrips = computed(() => {
  if (!selectedDate.value || !trips.value) return trips.value ?? []
  return trips.value.filter(t => t.batches.some(b => b.departureDate === selectedDate.value))
})

function onSelectDate(date: string | null) {
  selectedDate.value = date
}

// 輪播式 placeholder：搜尋框空著時，示範詞會自己輪播（參考 Klook），
// 使用者看到喜歡的詞直接按搜尋就以那個詞查詢
const placeholderWords = computed(() => {
  const countries = (allDestinations.value ?? []).filter(d => d.type === 'country').map(d => d.name)
  const themes = (allTags.value ?? []).map(t => t.name)
  const words = [...countries, ...themes].slice(0, 8)
  return words.length ? words : ['地點、景點或行程類型']
})
const placeholderIndex = ref(0)
const currentPlaceholder = computed(() => placeholderWords.value[placeholderIndex.value % placeholderWords.value.length] ?? '')
let placeholderTimer: ReturnType<typeof setInterval> | undefined
if (import.meta.client) {
  placeholderTimer = setInterval(() => {
    placeholderIndex.value = (placeholderIndex.value + 1) % placeholderWords.value.length
  }, 2500)
}
onBeforeUnmount(() => { if (placeholderTimer) clearInterval(placeholderTimer) })

function submitSearch() {
  // 搜尋框是空的就用目前輪播顯示的詞去查，讓 placeholder 真的「查得到」
  const keyword = q.value.trim() || currentPlaceholder.value
  q.value = keyword

  // 還沒被使用者手動改過（例如剛從 tag 連結切過來、還沒動輸入框），
  // 維持原本的 tag= 精確篩選；只有手動改過內容才切換成 q= 模糊搜尋、丟掉 tag
  if (!isTagDerived.value) {
    const nextQuery: Record<string, string> = {}
    if (scope.value) nextQuery.scope = scope.value
    if (keyword) nextQuery.q = keyword
    router.replace({ query: nextQuery })
  }
  refresh()
}
</script>

<template>
  <div>
    <!-- hero 高度跟首頁 hero 一致 -->
    <!-- pt-16 補償疊在上方的固定導覽列，justify-center 讓內容在加高後的框裡置中 -->
    <section class="relative flex min-h-[560px] flex-col justify-center overflow-hidden pt-16 sm:min-h-[680px]">
      <img
        src="https://picsum.photos/seed/trip-calendar/1600/500"
        alt=""
        fetchpriority="high"
        decoding="async"
        class="absolute inset-0 size-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-br from-teal-900/40 via-sky-900/30 to-blue-950/40" />

      <div class="relative z-10 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
          <TripCalendar :batches="batches ?? []" @select-date="onSelectDate" />

          <div class="flex flex-col justify-center gap-4 lg:min-h-full">
            <form class="flex w-full flex-row items-center gap-2 rounded-full bg-white p-2 shadow-lg" @submit.prevent="submitSearch">
              <UIcon name="i-lucide-search" class="ml-3 size-5 shrink-0 text-gray-400" />
              <div class="relative min-w-0 flex-1">
                <input
                  v-model="q"
                  type="text"
                  class="w-full min-w-0 border-none bg-transparent text-sm text-gray-900 outline-none"
                  @input="onSearchInput"
                >
                <!-- 空白時疊一層輪播式提示詞，取代靜態 placeholder；q 有值時讓開 -->
                <Transition
                  enter-active-class="transition duration-300 ease-out"
                  enter-from-class="opacity-0"
                  enter-to-class="opacity-100"
                  leave-active-class="transition duration-200 ease-in"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                  mode="out-in"
                >
                  <span
                    v-if="!q"
                    :key="currentPlaceholder"
                    class="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-nowrap text-sm text-gray-400"
                  >
                    搜尋「{{ currentPlaceholder }}」
                  </span>
                </Transition>
              </div>
              <UButton type="submit" color="primary" variant="solid" size="lg" class="shrink-0 whitespace-nowrap rounded-full px-6">
                搜尋
              </UButton>
            </form>

            <div v-if="activeFilters.length" class="flex flex-wrap items-center gap-2">
              <span
                v-for="label in activeFilters"
                :key="label"
                class="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-900"
              >
                {{ label }}
              </span>
              <UButton size="xs" color="neutral" variant="link" class="text-white" @click="clearFilters">
                清除篩選
              </UButton>
            </div>

            <p v-if="selectedDate" class="text-sm font-medium text-white">
              已篩選出團日期：{{ selectedDate }}
              <UButton size="xs" color="neutral" variant="link" class="text-white" @click="selectedDate = null">
                清除
              </UButton>
            </p>
          </div>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div v-if="displayedTrips.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <TripCard v-for="trip in displayedTrips" :key="trip.id" :trip="trip" />
      </div>
      <p v-else class="text-sm text-gray-500">
        找不到符合條件的行程
      </p>
    </div>
  </div>
</template>
