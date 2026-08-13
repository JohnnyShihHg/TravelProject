<script setup lang="ts">
import type { HeroContent, HeroImage, MediaLibraryItem } from '~/types/trip'
import { resizeImageForUpload } from '~/utils/image-upload'
import { HERO_PAGES, HERO_PAGE_LABELS, type HeroPage } from '#shared/utils/hero-pages'
import { OG_ASPECT_RATIO, OG_IMAGE_WIDTH } from '#shared/utils/image-sizes'

definePageMeta({ layout: 'admin' })
useHead({ title: '首頁 Hero' })

const page = ref<HeroPage>('home')

// 四個頁面各自打一次 /api/hero。key 帶上 page，不然四頁會共用同一格快取、
// 切換分頁時先看到上一頁的圖。
const { data: hero, refresh } = await useFetch<HeroContent>('/api/hero', {
  key: computed(() => `admin-hero-${page.value}`),
  query: computed(() => ({ page: page.value }))
})

const { data: library, refresh: refreshLibrary } = await useFetch<MediaLibraryItem[]>('/api/admin/media')

const title = ref('')
const selected = ref<HeroImage[]>([])
/** 首頁專用的社群分享圖。null 代表沒指定，前台會自動退回第一張 hero 圖 */
const ogImage = ref<{ id: number, url: string } | null>(null)

// useFetch 的資料是非同步回來的、切換分頁時還會再換一次，
// 用 watch 同步表單狀態才不會停在上一頁的內容（舊版直接在 setup 取值，切換後就不同步了）
watch(hero, (value) => {
  title.value = value?.title ?? ''
  selected.value = [...(value?.images ?? [])]
  // id 直接由 API 給，不從媒體庫反查 —— 反查失敗會得到 id=0，
  // 存檔時又被當成「沒有指定」而把設定清掉，且不會有任何錯誤訊息
  ogImage.value = value?.ogImageUrl && value.ogMediaId
    ? { id: value.ogMediaId, url: value.ogImageUrl }
    : null
}, { immediate: true })

const selectedIds = computed(() => new Set(selected.value.map(i => i.id)))

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const pickerOpen = ref(false)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

function add(item: { id: number, url: string }) {
  if (selectedIds.value.has(item.id)) return
  selected.value = [...selected.value, { id: item.id, url: item.url }]
}

function removeAt(index: number) {
  selected.value = selected.value.filter((_, i) => i !== index)
}

function move(index: number, delta: number) {
  const next = index + delta
  if (next < 0 || next >= selected.value.length) return
  const copy = [...selected.value]
  const [item] = copy.splice(index, 1)
  copy.splice(next, 0, item!)
  selected.value = copy
}

function pickFile() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  uploading.value = true
  try {
    // 跟媒體庫、行程照片走同一套：先在瀏覽器縮到 1600px，
    // 手機原檔直接送會讓 Worker 資源超限（Cloudflare 錯誤 1102）
    const { file: toUpload } = await resizeImageForUpload(file)
    const form = new FormData()
    form.append('file', toUpload, (toUpload as File).name ?? file.name)
    const created = await $fetch<MediaLibraryItem>('/api/admin/media', { method: 'POST', body: form })
    await refreshLibrary()
    add(created)
  } catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '上傳失敗'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

/**
 * 分享圖走裁切流程：選檔 → 拉框裁成 1.91:1 → 才進上傳。
 * 裁切元件是通用的（吃 File 吐 File），其他上傳點要接只需要傳自己的 aspect。
 */
const ogFileInput = ref<HTMLInputElement | null>(null)
const ogPendingFile = ref<File | null>(null)
const ogUploading = ref(false)

function pickOgFile() {
  ogFileInput.value?.click()
}

function onOgFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) ogPendingFile.value = file
  if (ogFileInput.value) ogFileInput.value.value = ''
}

async function onOgCropped(file: File) {
  ogPendingFile.value = null
  error.value = ''
  ogUploading.value = true
  try {
    // 裁切輸出已經是 1200×630，遠小於 1600 的上限，resizeImageForUpload 會直接原樣放行；
    // 還是走一遍是為了跟其他上傳點共用同一條路徑，不要各自長出不同的前處理。
    const { file: toUpload } = await resizeImageForUpload(file)
    const form = new FormData()
    form.append('file', toUpload, (toUpload as File).name ?? file.name)
    const created = await $fetch<MediaLibraryItem>('/api/admin/media', { method: 'POST', body: form })
    await refreshLibrary()
    ogImage.value = { id: created.id, url: created.url }
  } catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '上傳失敗'
  } finally {
    ogUploading.value = false
  }
}

async function save() {
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    await $fetch('/api/admin/hero', {
      method: 'PUT',
      body: {
        page: page.value,
        title: title.value,
        mediaIds: selected.value.map(i => i.id),
        ogMediaId: ogImage.value?.id || null
      }
    })
    await refresh()
    saved.value = true
  } catch (err) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '儲存失敗'
  } finally {
    saving.value = false
  }
}

// 切換分頁時把「已儲存」收掉，不然會讓人以為這一頁也存過了
watch(page, () => {
  saved.value = false
  error.value = ''
  pickerOpen.value = false
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <UButton to="/admin" color="neutral" variant="link" icon="i-lucide-arrow-left" class="mb-4 px-0">
      返回後台
    </UButton>
    <h1 class="text-2xl font-bold text-gray-900">
      編輯頁面 Hero
    </h1>
    <p class="mt-1 text-sm text-gray-500">
      每個頁面最上方的大圖。放兩張以上就會自動輪播（下方圓點可切換）。
    </p>

    <div class="mt-6 flex flex-wrap gap-2">
      <UButton
        v-for="p in HERO_PAGES"
        :key="p"
        :color="page === p ? 'primary' : 'neutral'"
        :variant="page === p ? 'solid' : 'outline'"
        @click="page = p"
      >
        {{ HERO_PAGE_LABELS[p] }}
      </UButton>
    </div>

    <form class="mt-4 space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6" @submit.prevent="save">
      <template v-if="page === 'home'">
        <UFormField label="標題" help="顯示在首頁大圖中央的那一行字">
          <UInput v-model="title" class="w-full" />
        </UFormField>

        <!--
          只有首頁需要手動指定分享圖：其他頁面都自動用自己的照片
          （行程／目的地／景點用封面，其他靜態頁用該頁第一張 hero）。
        -->
        <div>
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-gray-900">
              分享圖（LINE／Facebook）
            </h2>
            <div class="flex gap-2">
              <UButton
                v-if="ogImage"
                size="sm"
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                @click="ogImage = null"
              >
                改用第一張 hero
              </UButton>
              <UButton
                size="sm"
                color="primary"
                variant="soft"
                icon="i-lucide-crop"
                :loading="ogUploading"
                @click="pickOgFile"
              >
                {{ ogImage ? '換一張' : '上傳並裁切' }}
              </UButton>
            </div>
          </div>
          <input
            ref="ogFileInput"
            type="file"
            accept="image/*,.heic,.heif"
            class="hidden"
            @change="onOgFileSelected"
          >

          <div v-if="ogImage" class="mt-3 overflow-hidden rounded-lg border border-gray-200">
            <img :src="ogImage.url" alt="" class="w-full" style="aspect-ratio: 1200/630; object-fit: cover">
          </div>
          <p v-else class="mt-3 rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
            還沒有指定分享圖，目前會自動用首頁第一張 hero 圖裁成 1200×630。
          </p>
          <p class="mt-2 text-xs text-gray-400">
            別人把首頁貼到 LINE 或 Facebook 時顯示的預覽圖，尺寸固定 1200×630。
          </p>
        </div>
      </template>

      <div>
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-900">
            輪播圖片
            <span class="ml-1 font-normal text-gray-400">{{ selected.length }} 張</span>
          </h2>
          <div class="flex gap-2">
            <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-image" @click="pickerOpen = !pickerOpen">
              從圖片庫挑選
            </UButton>
            <UButton size="sm" color="primary" icon="i-lucide-upload" :loading="uploading" @click="pickFile">
              上傳新照片
            </UButton>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*,.heic,.heif"
          class="hidden"
          @change="onFileSelected"
        >

        <div v-if="selected.length" class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="(img, index) in selected"
            :key="img.id"
            class="group relative overflow-hidden rounded-lg border border-gray-200"
          >
            <AppImage :src="img.url" :width="400" alt="" loading="lazy" class="aspect-video w-full object-cover" />
            <UBadge v-if="index === 0" color="primary" size="xs" class="absolute left-1 top-1">
              第一張
            </UBadge>
            <div class="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <UButton size="xs" color="neutral" icon="i-lucide-arrow-left" aria-label="往前移" :disabled="index === 0" @click="move(index, -1)" />
              <UButton size="xs" color="neutral" icon="i-lucide-arrow-right" aria-label="往後移" :disabled="index === selected.length - 1" @click="move(index, 1)" />
              <UButton size="xs" color="error" icon="i-lucide-trash-2" aria-label="移除" @click="removeAt(index)" />
            </div>
          </div>
        </div>
        <p v-else class="mt-3 rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
          還沒有圖片。沒有圖時這一頁的 hero 會顯示漸層底色。
        </p>

        <div v-if="pickerOpen" class="mt-3 rounded-lg border border-gray-200 p-3">
          <p v-if="!library?.length" class="text-xs text-gray-400">
            圖片庫是空的，先用「上傳新照片」加入。
          </p>
          <div v-else class="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
            <button
              v-for="m in library"
              :key="m.id"
              type="button"
              class="overflow-hidden rounded border transition"
              :class="selectedIds.has(m.id) ? 'border-primary opacity-40' : 'border-gray-200 hover:border-primary'"
              :disabled="selectedIds.has(m.id)"
              @click="add(m)"
            >
              <AppImage :src="m.url" :width="400" alt="" loading="lazy" class="aspect-square w-full object-cover" />
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UButton type="submit" color="primary" :loading="saving">
          儲存
        </UButton>
        <span v-if="saved" class="text-sm text-green-600">已儲存</span>
        <span v-if="error" class="text-sm text-red-600">{{ error }}</span>
      </div>
    </form>

    <AdminImageCropDialog
      :file="ogPendingFile"
      :aspect="OG_ASPECT_RATIO"
      :output-width="OG_IMAGE_WIDTH"
      title="裁切分享圖"
      hint="這一塊會是別人在 LINE／Facebook 看到的預覽圖。"
      @cropped="onOgCropped"
      @cancel="ogPendingFile = null"
    />
  </div>
</template>
