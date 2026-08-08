<script setup lang="ts">
import type { TripImage } from '~/types/trip'

interface MediaItem {
  id: number
  url: string
  category: string | null
}

const props = defineProps<{ tripId: number, images: TripImage[], defaultCategory: string | null }>()
const emit = defineEmits<{ refresh: [] }>()

const { data: library, refresh: refreshLibrary } = await useFetch<MediaItem[]>('/api/admin/media')
const categoryFilter = ref(props.defaultCategory ?? '')
const uploading = ref(false)

const filteredLibrary = computed(() => {
  if (!categoryFilter.value) return library.value ?? []
  return (library.value ?? []).filter(m => m.category === categoryFilter.value)
})

const attachedMediaUrls = computed(() => new Set(props.images.map(i => i.url)))

async function simulateUpload() {
  uploading.value = true
  try {
    const created = await $fetch<MediaItem>('/api/admin/media', {
      method: 'POST',
      body: { category: categoryFilter.value || props.defaultCategory }
    })
    await refreshLibrary()
    await attach(created.id)
  } finally {
    uploading.value = false
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
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-900">
          媒體庫（可依分類重複使用）
        </h3>
        <UButton size="xs" color="primary" variant="soft" :loading="uploading" @click="simulateUpload">
          模擬上傳新照片
        </UButton>
      </div>
      <UInput v-model="categoryFilter" size="xs" placeholder="依分類篩選（例如：日本）" class="mt-2 w-48" />
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
        此分類尚無媒體庫照片，點擊上方按鈕模擬上傳
      </p>
    </div>
  </div>
</template>
