<script setup lang="ts">
import { TRIP_BADGES } from '~/types/trip'
import type { TripDetail, TripTag, TripBatch } from '~/types/trip'
import type { Stage } from '~/components/admin/StageNav.vue'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

const { data: trip, refresh } = await useFetch<TripDetail>(`/api/admin/trips/${id}`)
useHead({ title: () => `編輯：${trip.value?.title ?? ''}` })
const { data: allTags, refresh: refreshTags } = await useFetch<TripTag[]>('/api/tags')

const form = reactive({
  slug: '',
  title: '',
  summary: '',
  days: 1,
  tagNames: [] as string[],
  isFeatured: false,
  badge: '' as string,
  rank: 0,
  seoTitle: '',
  seoDescription: ''
})

// 地點是多選，但麵包屑只能有一條路徑，所以另外記哪一個是主要地點。
// 送出時把主要地點排在陣列第一個 —— API 就是用順序判斷的。
const selectedDestinationIds = ref<number[]>([])
const primaryDestinationId = ref<number | null>(null)
const selectedSpotIds = ref<number[]>([])

// form.badge 用空字串代表「不顯示」，送出後由後端轉成 null。
// 但 Reka UI 的 Select 不接受空字串當選項值（空字串被保留用來清除選取），
// 所以下拉選單另外用 NO_BADGE 這個哨兵值，透過 computed 對應回空字串。
const NO_BADGE = 'none'

const badgeOptions = [
  { label: '不顯示', value: NO_BADGE },
  ...TRIP_BADGES.map(b => ({ label: b, value: b }))
]

const badgeSelect = computed({
  get: () => form.badge || NO_BADGE,
  set: (value: string) => { form.badge = value === NO_BADGE ? '' : value }
})

watchEffect(() => {
  if (!trip.value) return
  form.slug = trip.value.slug
  form.title = trip.value.title
  form.summary = trip.value.summary
  form.days = trip.value.days
  form.tagNames = trip.value.tags.map(t => t.name)
  form.isFeatured = trip.value.isFeatured
  form.badge = trip.value.badge ?? ''
  form.rank = trip.value.rank
  form.seoTitle = trip.value.seoTitle ?? ''
  form.seoDescription = trip.value.seoDescription ?? ''
  selectedDestinationIds.value = trip.value.destinations.map(d => d.id)
  primaryDestinationId.value = trip.value.primaryDestination?.id ?? null
  selectedSpotIds.value = trip.value.spots.map(s => s.id)
})

// 新增標籤
const newTagName = ref('')
const creatingTag = ref(false)
async function createTag() {
  const name = newTagName.value.trim()
  if (!name) return
  creatingTag.value = true
  try {
    const tag = await $fetch<TripTag>('/api/admin/tags', { method: 'POST', body: { name } })
    await refreshTags()
    if (!form.tagNames.includes(tag.name)) form.tagNames.push(tag.name)
    newTagName.value = ''
  } finally {
    creatingTag.value = false
  }
}

// slug 預設唯讀顯示，改網址會讓舊連結失效，不該像改標題那樣隨手可動
const editingSlug = ref(false)

const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    const primary = primaryDestinationId.value
    const destinationIds = primary !== null
      ? [primary, ...selectedDestinationIds.value.filter(d => d !== primary)]
      : [...selectedDestinationIds.value]

    await $fetch(`/api/admin/trips/${id}`, {
      method: 'PATCH',
      body: { ...form, destinationIds, spotIds: [...selectedSpotIds.value] }
    })
    saved.value = true
    editingSlug.value = false
    await refresh()
    setTimeout(() => { saved.value = false }, 2500)
  } catch (err) {
    saveError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '儲存失敗'
  } finally {
    saving.value = false
  }
}

const togglingStatus = ref(false)
async function setEnabled(enabled: boolean) {
  togglingStatus.value = true
  try {
    await $fetch(`/api/admin/trips/${id}`, { method: 'PATCH', body: { status: enabled ? 'published' : 'draft' } })
    await refresh()
  } finally {
    togglingStatus.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref(false)
async function removeTrip() {
  deleting.value = true
  try {
    await $fetch(`/api/admin/trips/${id}`, { method: 'DELETE' })
    await router.push('/admin/trips')
  } finally {
    deleting.value = false
  }
}

// 出團梯次
const newBatch = reactive({
  departureDate: '', returnDate: '', flightInfo: '', meetingPoint: '',
  priceInfo: '', priceFrom: undefined as number | undefined, groupSize: undefined as number | undefined
})
const addingBatch = ref(false)

async function addBatch() {
  if (!newBatch.departureDate || !newBatch.returnDate) return
  addingBatch.value = true
  try {
    await $fetch(`/api/admin/trips/${id}/batches`, { method: 'POST', body: newBatch })
    Object.assign(newBatch, {
      departureDate: '', returnDate: '', flightInfo: '', meetingPoint: '',
      priceInfo: '', priceFrom: undefined, groupSize: undefined
    })
    await refresh()
  } finally {
    addingBatch.value = false
  }
}

async function removeBatch(batch: TripBatch) {
  await $fetch(`/api/admin/batches/${batch.id}`, { method: 'DELETE' })
  await refresh()
}

// 跟前台 TripDetailView 的模板一致：主價格只由 priceFrom 產生
function formatPrice(n: number | null | undefined) {
  return n ? `NT$ ${n.toLocaleString('zh-TW')} 起` : ''
}

// 搜尋結果預覽：跟前台 usePageSeo 的推導規則一致，留空就回退用標題／簡介
const seoPreview = computed(() => ({
  title: `${form.seoTitle || form.title}｜無穹旅行社`,
  description: toMetaDescription(form.seoDescription || form.summary),
  url: `${useRuntimeConfig().public.siteUrl.replace(/^https?:\/\//, '')} › trips › ${trip.value?.slug ?? ''}`
}))

// 完成度只是提示，不會阻止儲存或發布
const stages = computed<Stage[]>(() => [
  { id: 'stage-basic', label: '基本資料', done: !!(form.title.trim() && form.summary.trim() && form.days > 0) },
  { id: 'stage-places', label: '地點景點', done: selectedDestinationIds.value.length > 0 },
  { id: 'stage-batches', label: '出團梯次', done: (trip.value?.batches.length ?? 0) > 0 },
  { id: 'stage-content', label: '行程內容', done: (trip.value?.blocks.length ?? 0) > 0 },
  { id: 'stage-photos', label: '照片', done: (trip.value?.images.length ?? 0) > 0 },
  // SEO 的實質風險是「沒有分享用的圖」而不是沒填覆寫欄位，所以判準看封面圖
  { id: 'stage-seo', label: 'SEO', done: !!(trip.value?.coverImageUrl && (form.seoDescription || form.summary)) }
])
</script>

<template>
  <div v-if="trip" class="px-4 py-6 sm:px-6">
    <div class="mx-auto max-w-[1400px]">
      <!-- 麵包屑＋標題：跟前台一樣的層級表達，讓後台也知道自己在哪 -->
      <div class="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <NuxtLink to="/admin/trips" class="hover:text-primary">
          行程
        </NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="size-3.5 text-gray-300" />
        <span class="font-medium text-gray-900">{{ trip.title }}</span>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <!-- 中間：階段列 + 內容 -->
        <div class="min-w-0">
          <AdminStageNav :stages="stages" />

          <div class="mt-6 space-y-6">
            <section id="stage-basic" class="scroll-mt-28 space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 class="text-lg font-semibold text-gray-900">
                ① 基本資料
              </h2>

              <UFormField label="行程標題" required>
                <UInput v-model="form.title" class="w-full" />
              </UFormField>

              <UFormField label="簡介（顯示於行程列表卡片，不會顯示在行程詳情頁）">
                <UTextarea v-model="form.summary" :rows="2" class="w-full" />
              </UFormField>

              <div class="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <UFormField label="天數" help="行程產品本身的天數，不是從梯次日期算出來的">
                  <UInput v-model.number="form.days" type="number" min="1" class="w-32" />
                </UFormField>
                <UFormField label="狀態標籤" help="顯示在行程標題旁">
                  <USelect v-model="badgeSelect" :items="badgeOptions" class="w-full sm:w-48" />
                </UFormField>
              </div>
            </section>

            <section id="stage-places" class="scroll-mt-28 space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">
                  ② 地點與景點
                </h2>
                <p class="mt-1 text-xs text-gray-400">
                  地點決定這個行程算國內線還是國外線，也決定前台麵包屑的路徑。景點掛上後，該景點頁會自動列出這個行程。
                </p>
              </div>

              <AdminPlacePicker
                v-model:destination-ids="selectedDestinationIds"
                v-model:primary-destination-id="primaryDestinationId"
                v-model:spot-ids="selectedSpotIds"
              />

              <UFormField label="主題標籤">
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="tag in allTags"
                    :key="tag.id"
                    class="flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs"
                  >
                    <input v-model="form.tagNames" type="checkbox" :value="tag.name">
                    {{ tag.name }}
                  </label>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <UInput v-model="newTagName" size="xs" placeholder="新標籤名稱" class="w-full sm:w-40" @keyup.enter="createTag" />
                  <UButton size="xs" color="neutral" variant="soft" :loading="creatingTag" @click="createTag">
                    ＋新增標籤
                  </UButton>
                </div>
              </UFormField>
            </section>

            <section id="stage-batches" class="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 class="text-lg font-semibold text-gray-900">
                ③ 出團梯次
              </h2>

              <div v-if="trip.batches.length" class="mt-3 space-y-2">
                <div
                  v-for="batch in trip.batches"
                  :key="batch.id"
                  class="flex flex-col gap-2 rounded-lg border border-gray-100 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span class="font-medium text-gray-900">{{ batch.departureDate }} ～ {{ batch.returnDate }}</span>
                    <span v-if="batch.priceFrom" class="ml-3 font-medium text-primary">{{ formatPrice(batch.priceFrom) }}</span>
                    <span v-if="batch.priceInfo" class="ml-3 text-gray-500">{{ batch.priceInfo }}</span>
                    <span v-if="batch.groupSize" class="ml-3 text-gray-500">成團人數 {{ batch.groupSize }}</span>
                  </div>
                  <UButton size="xs" color="error" variant="soft" class="self-start sm:self-auto" @click="removeBatch(batch)">
                    刪除
                  </UButton>
                </div>
              </div>
              <p v-else class="mt-2 text-xs text-gray-400">
                尚無梯次
              </p>

              <div class="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-dashed border-gray-200 p-4 sm:grid-cols-3">
                <UFormField label="出發日期">
                  <UInput v-model="newBatch.departureDate" type="date" class="w-full" />
                </UFormField>
                <UFormField label="回程日期">
                  <UInput v-model="newBatch.returnDate" type="date" class="w-full" />
                </UFormField>
                <UFormField label="成團人數">
                  <UInput v-model.number="newBatch.groupSize" type="number" class="w-full" />
                </UFormField>
                <UFormField label="班機資訊">
                  <UInput v-model="newBatch.flightInfo" class="w-full" />
                </UFormField>
                <UFormField label="集合地點">
                  <UInput v-model="newBatch.meetingPoint" class="w-full" />
                </UFormField>
                <UFormField label="每人費用（新台幣）" help="只填數字。前台會顯示成 NT$ 42,900 起" class="sm:col-span-3 sm:max-w-xs">
                  <UInput v-model.number="newBatch.priceFrom" type="number" placeholder="42900" class="w-full" />
                  <p v-if="newBatch.priceFrom" class="mt-1 text-xs text-gray-400">
                    前台顯示：{{ formatPrice(newBatch.priceFrom) }}
                  </p>
                </UFormField>
                <UFormField label="費用備註（選填）" help="早鳥價、兩人成行這類補充說明。價格不要寫在這裡。" class="sm:col-span-3">
                  <UInput v-model="newBatch.priceInfo" placeholder="例如：早鳥報名折 2,000" class="w-full" />
                </UFormField>
                <UButton class="sm:col-span-3" color="neutral" variant="soft" :loading="addingBatch" @click="addBatch">
                  新增梯次
                </UButton>
              </div>
            </section>

            <section id="stage-content" class="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 class="text-lg font-semibold text-gray-900">
                ④ 行程內容
              </h2>
              <p class="mt-1 text-xs text-gray-400">
                內容由區塊組成（行程亮點、參考航班、每日行程…），每個區塊獨立編輯、獨立儲存；也可以另存為範本，在其他行程重複使用。
              </p>
              <div class="mt-3">
                <AdminContentBlockEditor :trip-id="id" :blocks="trip.blocks" @refresh="refresh" />
              </div>
            </section>

            <section id="stage-photos" class="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 class="text-lg font-semibold text-gray-900">
                ⑤ 照片
              </h2>
              <div class="mt-3">
                <AdminMediaPicker
                  :trip-id="id"
                  :images="trip.images"
                  :default-destination-slug="trip.primaryDestination?.slug ?? null"
                  @refresh="refresh"
                />
              </div>
            </section>

            <section id="stage-seo" class="scroll-mt-28 space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">
                  ⑥ SEO
                </h2>
                <p class="mt-1 text-xs text-gray-400">
                  兩個欄位都可以留空 —— 留空時會自動使用上方的行程標題與簡介。只有想在搜尋結果顯示不一樣的文字時才需要填。
                </p>
              </div>

              <UFormField label="SEO 標題" help="留空就用行程標題">
                <UInput v-model="form.seoTitle" :placeholder="form.title" class="w-full" />
              </UFormField>

              <UFormField label="SEO 描述" help="留空就用行程簡介。建議 155 字以內，超過會被搜尋結果截斷">
                <UTextarea v-model="form.seoDescription" :rows="2" :placeholder="form.summary" class="w-full" />
              </UFormField>

              <div>
                <p class="text-xs font-medium text-gray-500">
                  Google 搜尋結果預覽
                </p>
                <div class="mt-2 rounded-lg border border-gray-200 p-4">
                  <p class="truncate text-xs text-gray-500">
                    {{ seoPreview.url }}
                  </p>
                  <p class="mt-1 truncate text-base text-blue-800">
                    {{ seoPreview.title }}
                  </p>
                  <p class="mt-1 line-clamp-2 text-sm text-gray-600">
                    {{ seoPreview.description }}
                  </p>
                </div>
                <p v-if="!trip.coverImageUrl" class="mt-2 text-xs text-amber-600">
                  這個行程還沒有封面照片，分享到 LINE／Facebook 時不會有預覽圖。
                </p>
              </div>
            </section>
          </div>
        </div>

        <!-- 右欄：儲存與這個行程的狀態，捲動時跟著 -->
        <aside class="lg:sticky lg:top-6">
          <div class="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <UButton color="primary" size="lg" block :loading="saving" @click="save">
              儲存
            </UButton>
            <p v-if="saved" class="text-center text-sm text-green-600">
              已儲存
            </p>
            <p v-if="saveError" class="text-center text-sm text-red-600">
              {{ saveError }}
            </p>

            <div class="border-t border-gray-100 pt-4">
              <p class="text-xs font-medium text-gray-500">
                發布狀態
              </p>
              <div class="mt-2">
                <USwitch
                  :model-value="trip.status === 'published'"
                  :disabled="togglingStatus"
                  :label="trip.status === 'published' ? '已發布' : '草稿'"
                  @update:model-value="setEnabled($event)"
                />
              </div>
              <p class="mt-1.5 text-xs text-gray-400">
                草稿不會出現在前台，也不會進 sitemap。
              </p>
            </div>

            <div class="border-t border-gray-100 pt-4">
              <UFormField label="首頁精選">
                <USwitch v-model="form.isFeatured" />
              </UFormField>
              <UFormField label="精選排序" help="數字越小越前面" class="mt-3">
                <UInput v-model.number="form.rank" type="number" class="w-24" />
              </UFormField>
            </div>

            <div class="border-t border-gray-100 pt-4 text-xs">
              <div class="flex items-center justify-between gap-2">
                <p class="text-gray-400">
                  網址代稱
                </p>
                <UButton
                  v-if="!editingSlug"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  aria-label="編輯網址代稱"
                  @click="editingSlug = true"
                />
              </div>

              <p v-if="!editingSlug" class="mt-0.5 break-all font-mono text-gray-700">
                /trips/{{ trip.slug }}
              </p>
              <div v-else class="mt-1 space-y-1.5">
                <div class="flex items-center gap-1 font-mono">
                  <span class="shrink-0 text-gray-400">/trips/</span>
                  <UInput v-model="form.slug" size="xs" class="w-full" />
                </div>
                <p class="text-amber-600">
                  改網址會讓舊連結失效，已經分享出去的連結會找不到頁面。
                </p>
                <UButton size="xs" color="neutral" variant="soft" @click="editingSlug = false; form.slug = trip.slug">
                  取消
                </UButton>
              </div>

              <p class="mt-3 text-gray-400">
                最後更新
              </p>
              <p class="mt-0.5 text-gray-700">
                {{ trip.updatedAt?.slice(0, 16).replace('T', ' ') }}
              </p>
            </div>

            <div class="space-y-2 border-t border-gray-100 pt-4">
              <UButton
                :to="`/admin/trips/${id}/preview`"
                target="_blank"
                size="sm"
                color="neutral"
                variant="soft"
                icon="i-lucide-eye"
                block
              >
                預覽整頁
              </UButton>
              <UButton
                v-if="trip.status === 'published'"
                :to="`/trips/${trip.slug}`"
                target="_blank"
                size="sm"
                color="neutral"
                variant="ghost"
                icon="i-lucide-external-link"
                block
              >
                看前台頁面
              </UButton>
              <UButton
                size="sm"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                block
                @click="confirmDelete = true"
              >
                刪除行程
              </UButton>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <AdminConfirmDialog v-model:open="confirmDelete" title="刪除行程" :loading="deleting" @confirm="removeTrip">
      <p class="text-sm text-gray-600">
        確定要刪除「<span class="font-medium text-gray-900">{{ trip.title }}</span>」嗎？
        梯次、內容區塊與照片關聯都會一起移除，且無法復原。
      </p>
    </AdminConfirmDialog>
  </div>
</template>
