<script setup lang="ts">
import type { TripImage, MediaLibraryItem, Destination } from '~/types/trip'

const props = defineProps<{ tripId: number, images: TripImage[], defaultDestinationSlug: string | null }>()
const emit = defineEmits<{ refresh: [] }>()

const { data: library, refresh: refreshLibrary } = await useFetch<MediaLibraryItem[]>('/api/admin/media')
const { data: destinations } = await useFetch<Destination[]>('/api/destinations')

// 篩選改成選既有地點，不再打字 —— 自由文字會產生「東京」「東京 」這種看不出來的錯字分身。
// ALL 是哨兵值：Reka UI 的 Select 不接受空字串當選項值（空字串保留給「清除選取」），
// 直接用 '' 會在客戶端渲染時整頁噴 500。
const ALL = 'all'
const destinationFilter = ref(props.defaultDestinationSlug || ALL)
const uploading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement>()

const destinationOptions = computed(() => {
  const all = destinations.value ?? []
  return [
    { label: '全部照片', value: ALL },
    // 城市顯示成「日本 › 京都」，避免同名城市分不清楚屬於哪個國家
    ...all.map(d => ({
      label: d.parentId ? `${all.find(p => p.id === d.parentId)?.name ?? ''} › ${d.name}` : d.name,
      value: d.slug
    }))
  ]
})

const filteredLibrary = computed(() => {
  if (destinationFilter.value === ALL) return library.value ?? []
  return (library.value ?? []).filter(m => m.destinations.some(d => d.slug === destinationFilter.value))
})

const attachedMediaUrls = computed(() => new Set(props.images.map(i => i.url)))

function pickFile() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    // 上傳時自動掛上目前篩選的地點，省去事後再標記
    const slug = destinationFilter.value === ALL ? props.defaultDestinationSlug : destinationFilter.value
    const destination = (destinations.value ?? []).find(d => d.slug === slug)
    if (destination) form.append('destinationIds', String(destination.id))
    const created = await $fetch<MediaLibraryItem>('/api/admin/media', { method: 'POST', body: form })
    await refreshLibrary()
    await attach(created.id)
  } catch (err) {
    uploadError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '上傳失敗'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function attach(mediaId: number, isCover = false) {
  await $fetch(`/api/admin/trips/${props.tripId}/images`, { method: 'POST', body: { mediaId, isCover } })
  emit('refresh')
}

async function setCover(mediaId: number) {
  await $fetch(`/api/admin/trips/${props.tripId}/images`, { method: 'POST', body: { mediaId, isCover: true } })
  emit('refresh')
}

async function removeImage(imageId: number) {
  await $fetch(`/api/admin/trip-images/${imageId}`, { method: 'DELETE' })
  emit('refresh')
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-sm font-semibold text-gray-900">
        已掛載照片
      </h3>
      <div v-if="images.length" class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        <div v-for="img in images" :key="img.id" class="group relative overflow-hidden rounded-lg border border-gray-200">
          <img :src="img.url" class="aspect-square w-full object-cover">
          <UBadge v-if="img.isCover" color="primary" size="xs" class="absolute left-1 top-1">
            封面
          </UBadge>
          <div class="absolute inset-x-0 bottom-0 flex gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
            <UButton size="xs" color="neutral" variant="solid" @click="setCover(img.mediaId)">
              設為封面
            </UButton>
            <UButton size="xs" color="error" variant="solid" @click="removeImage(img.id)">
              移除
            </UButton>
          </div>
        </div>
      </div>
      <p v-else class="mt-2 text-xs text-gray-400">
        尚未掛載任何照片
      </p>
    </div>

    <div>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-gray-900">
          媒體庫（可依地點重複使用）
        </h3>
        <UButton size="xs" color="primary" variant="soft" :loading="uploading" @click="pickFile">
          上傳照片
        </UButton>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected">
      </div>
      <USelect v-model="destinationFilter" size="xs" :items="destinationOptions" class="mt-2 w-48" />
      <p v-if="uploadError" class="mt-2 text-xs text-red-600">
        {{ uploadError }}
      </p>
      <div v-if="filteredLibrary.length" class="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
        <button
          v-for="m in filteredLibrary"
          :key="m.id"
          type="button"
          class="relative overflow-hidden rounded-lg border border-gray-200"
          :class="attachedMediaUrls.has(m.url) ? 'ring-2 ring-primary' : ''"
          @click="attach(m.id)"
        >
          <img :src="m.url" class="aspect-square w-full object-cover">
        </button>
      </div>
      <p v-else class="mt-2 text-xs text-gray-400">
        此地點尚無媒體庫照片，點擊上方按鈕上傳
      </p>
    </div>
  </div>
</template>
