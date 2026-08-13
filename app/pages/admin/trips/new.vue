<script setup lang="ts">
import type { TripTag } from '~/types/trip'

definePageMeta({ layout: 'admin', heavyLoading: true })
useHead({ title: '新增行程' })

const router = useRouter()
const { data: allTags, refresh: refreshTags } = await useFetch<TripTag[]>('/api/tags')

const form = reactive({
  title: '',
  slug: '',
  summary: '',
  days: 3,
  tagNames: [] as string[]
})

// 地點是多選，但麵包屑只能有一條路徑，所以另外記哪一個是主要地點。
// 送出時把主要地點排在陣列第一個 —— API 是用順序判斷的。
const selectedDestinationIds = ref<number[]>([])
const primaryDestinationId = ref<number | null>(null)
const selectedSpotIds = ref<number[]>([])

const saving = ref(false)
const errorMessage = ref('')

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

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const primary = primaryDestinationId.value
    const destinationIds = primary !== null
      ? [primary, ...selectedDestinationIds.value.filter(d => d !== primary)]
      : [...selectedDestinationIds.value]

    const trip = await $fetch<{ id: number }>('/api/admin/trips', {
      method: 'POST',
      body: { ...form, destinationIds, spotIds: [...selectedSpotIds.value] }
    })
    router.push(`/admin/trips/${trip.id}`)
  } catch (e) {
    errorMessage.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '建立失敗'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
    <UButton to="/admin/trips" color="neutral" variant="link" icon="i-lucide-arrow-left" class="mb-4 px-0">
      返回行程列表
    </UButton>
    <h1 class="text-2xl font-bold text-gray-900">
      新增行程
    </h1>
    <p class="mt-1 text-sm text-gray-500">
      建立後會先存為草稿，儲存後可以繼續編輯梯次與照片，確認沒問題再發布。
    </p>

    <form class="mt-6 space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6" @submit.prevent="create">
      <UFormField label="行程標題" required>
        <UInput v-model="form.title" class="w-full" />
      </UFormField>
      <UFormField label="網址代稱（slug，留空自動產生）">
        <UInput v-model="form.slug" placeholder="例如 tokyo-sakura-5days" class="w-full" />
      </UFormField>
      <UFormField label="簡介（顯示於行程列表卡片，不會顯示在行程詳情頁）">
        <UTextarea v-model="form.summary" :rows="2" class="w-full" />
      </UFormField>
      <UFormField label="天數">
        <UInput v-model.number="form.days" type="number" min="1" class="w-32" />
      </UFormField>

      <AdminPlacePicker
        v-model:destination-ids="selectedDestinationIds"
        v-model:primary-destination-id="primaryDestinationId"
        v-model:spot-ids="selectedSpotIds"
      />

      <UFormField label="標籤">
        <div class="flex flex-wrap gap-2">
          <label v-for="tag in allTags" :key="tag.id" class="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs">
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
      <p class="text-xs text-gray-400">
        建立後會進入編輯頁，行程內容（文字段落、行程亮點、參考航班、每日行程）在編輯頁用區塊新增。
      </p>

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <UButton type="submit" color="primary" :loading="saving">
        建立行程
      </UButton>
    </form>
  </div>
</template>
