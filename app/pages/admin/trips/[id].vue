<script setup lang="ts">
import type { TripDetail, TripTag, TripBatch } from '~/types/trip'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const id = Number(route.params.id)

const { data: trip, refresh } = await useFetch<TripDetail>(`/api/admin/trips/${id}`)
const { data: allTags } = await useFetch<TripTag[]>('/api/tags')

const form = reactive({
  title: '',
  summary: '',
  days: 1,
  content: '',
  tagNames: [] as string[],
  isFeatured: false,
  rank: 0
})

watchEffect(() => {
  if (!trip.value) return
  form.title = trip.value.title
  form.summary = trip.value.summary
  form.days = trip.value.days
  form.content = trip.value.content
  form.tagNames = trip.value.tags.map(t => t.name)
  form.isFeatured = trip.value.isFeatured
  form.rank = trip.value.rank
})

const saving = ref(false)
const saved = ref(false)

async function save() {
  saving.value = true
  saved.value = false
  try {
    await $fetch(`/api/admin/trips/${id}`, { method: 'PATCH', body: form })
    saved.value = true
    await refresh()
  } finally {
    saving.value = false
  }
}

async function togglePublish() {
  if (!trip.value) return
  const nextStatus = trip.value.status === 'published' ? 'draft' : 'published'
  await $fetch(`/api/admin/trips/${id}`, { method: 'PATCH', body: { status: nextStatus } })
  await refresh()
}

// 出團梯次
const newBatch = reactive({ departureDate: '', returnDate: '', flightInfo: '', meetingPoint: '', priceInfo: '', groupSize: undefined as number | undefined })
const addingBatch = ref(false)

async function addBatch() {
  if (!newBatch.departureDate || !newBatch.returnDate) return
  addingBatch.value = true
  try {
    await $fetch(`/api/admin/trips/${id}/batches`, { method: 'POST', body: newBatch })
    Object.assign(newBatch, { departureDate: '', returnDate: '', flightInfo: '', meetingPoint: '', priceInfo: '', groupSize: undefined })
    await refresh()
  } finally {
    addingBatch.value = false
  }
}

async function removeBatch(batch: TripBatch) {
  await $fetch(`/api/admin/batches/${batch.id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div v-if="trip" class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <UButton to="/admin" color="neutral" variant="link" icon="i-lucide-arrow-left" class="mb-4 px-0">
      返回後台
    </UButton>

    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">
        編輯行程
      </h1>
      <div class="flex items-center gap-2">
        <UBadge :color="trip.status === 'published' ? 'success' : 'neutral'" variant="subtle">
          {{ trip.status === 'published' ? '已發布' : '草稿' }}
        </UBadge>
        <UButton size="sm" color="neutral" variant="soft" @click="togglePublish">
          {{ trip.status === 'published' ? '設為草稿' : '發布' }}
        </UButton>
      </div>
    </div>

    <section class="mt-6 space-y-5">
      <UFormField label="行程標題" required>
        <UInput v-model="form.title" class="w-full" />
      </UFormField>
      <UFormField label="簡介">
        <UTextarea v-model="form.summary" :rows="2" class="w-full" />
      </UFormField>
      <UFormField label="天數">
        <UInput v-model.number="form.days" type="number" min="1" class="w-32" />
      </UFormField>
      <UFormField label="標籤">
        <div class="flex flex-wrap gap-2">
          <label v-for="tag in allTags" :key="tag.id" class="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs">
            <input v-model="form.tagNames" type="checkbox" :value="tag.name">
            {{ tag.name }}
          </label>
        </div>
      </UFormField>
      <UFormField label="行程內容">
        <AdminTiptapEditor v-model="form.content" />
      </UFormField>

      <div class="flex items-end gap-6">
        <UFormField label="首頁精選">
          <USwitch v-model="form.isFeatured" />
        </UFormField>
        <UFormField label="精選排序（數字越小越前面）">
          <UInput v-model.number="form.rank" type="number" class="w-32" />
        </UFormField>
      </div>

      <UButton color="primary" :loading="saving" @click="save">
        儲存
      </UButton>
      <span v-if="saved" class="ml-3 text-sm text-green-600">已儲存</span>
    </section>

    <section class="mt-10">
      <h2 class="text-lg font-semibold text-gray-900">
        出團梯次
      </h2>
      <div v-if="trip.batches.length" class="mt-3 space-y-2">
        <div v-for="batch in trip.batches" :key="batch.id" class="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2 text-sm">
          <div>
            <span class="font-medium text-gray-900">{{ batch.departureDate }} ～ {{ batch.returnDate }}</span>
            <span class="ml-3 text-gray-500">{{ batch.priceInfo }}</span>
            <span v-if="batch.groupSize" class="ml-3 text-gray-500">成團人數 {{ batch.groupSize }}</span>
          </div>
          <UButton size="xs" color="error" variant="soft" @click="removeBatch(batch)">
            刪除
          </UButton>
        </div>
      </div>
      <p v-else class="mt-2 text-xs text-gray-400">
        尚無梯次
      </p>

      <div class="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-dashed border-gray-200 p-4 sm:grid-cols-3">
        <UFormField label="出發日期">
          <UInput v-model="newBatch.departureDate" type="date" class="w-full" />
        </UFormField>
        <UFormField label="回程日期">
          <UInput v-model="newBatch.returnDate" type="date" class="w-full" />
        </UFormField>
        <UFormField label="成團人數">
          <UInput v-model.number="newBatch.groupSize" type="number" class="w-full" />
        </UFormField>
        <UFormField label="班機資訊" class="col-span-2 sm:col-span-1">
          <UInput v-model="newBatch.flightInfo" class="w-full" />
        </UFormField>
        <UFormField label="集合地點" class="col-span-2 sm:col-span-1">
          <UInput v-model="newBatch.meetingPoint" class="w-full" />
        </UFormField>
        <UFormField label="費用說明" class="col-span-2 sm:col-span-1">
          <UInput v-model="newBatch.priceInfo" class="w-full" />
        </UFormField>
        <UButton class="col-span-2 sm:col-span-3" color="neutral" variant="soft" :loading="addingBatch" @click="addBatch">
          新增梯次
        </UButton>
      </div>
    </section>

    <section class="mt-10">
      <h2 class="text-lg font-semibold text-gray-900">
        照片
      </h2>
      <div class="mt-3">
        <AdminMediaPicker
          :trip-id="id"
          :images="trip.images"
          :default-category="trip.tags[0]?.name ?? null"
          @refresh="refresh"
        />
      </div>
    </section>
  </div>
</template>
