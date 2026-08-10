<script setup lang="ts">
import type { MediaLibraryItem, AdminDestination, AdminSpot } from '~/types/trip'

definePageMeta({ layout: 'admin' })

const { data: library, refresh } = await useFetch<MediaLibraryItem[]>('/api/admin/media')
const { data: destinations } = await useFetch<AdminDestination[]>('/api/admin/destinations')
const { data: spots } = await useFetch<AdminSpot[]>('/api/admin/spots')

// 國家在前、城市跟著它，跟其他頁面一致
const destinationTree = computed(() => {
  const all = destinations.value ?? []
  return all
    .filter(d => d.type === 'country')
    .flatMap(country => [country, ...all.filter(c => c.parentId === country.id)])
})

// ALL / UNTAGGED 是哨兵值：Reka UI 的 Select 不接受空字串當選項值
// （空字串保留給「清除選取」），用 '' 會在客戶端渲染時整頁噴 500。
const ALL = 'all'
const UNTAGGED = 'untagged'

const filterSlug = ref(ALL)
const filterOptions = computed(() => [
  { label: '全部照片', value: ALL },
  { label: '未標記地點', value: UNTAGGED },
  // 城市顯示成「日本 › 京都」，避免同名城市分不清楚屬於哪個國家
  ...destinationTree.value.map(d => ({
    label: d.parentId
      ? `${(destinations.value ?? []).find(p => p.id === d.parentId)?.name ?? ''} › ${d.name}`
      : d.name,
    value: d.slug
  }))
])

const filtered = computed(() => {
  const all = library.value ?? []
  if (filterSlug.value === ALL) return all
  // 未標記的照片最容易被忘記，給它一個專門的篩選條件
  if (filterSlug.value === UNTAGGED) return all.filter(m => m.destinations.length === 0 && m.spots.length === 0)
  return all.filter(m => m.destinations.some(d => d.slug === filterSlug.value))
})

// 上傳
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const uploadError = ref('')

async function onFileSelected(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  uploadError.value = ''
  try {
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      // 上傳時自動套用目前篩選的地點，省去事後再標記
      const dest = destinationTree.value.find(d => d.slug === filterSlug.value)
      if (dest) form.append('destinationIds', String(dest.id))
      await $fetch('/api/admin/media', { method: 'POST', body: form })
    }
    await refresh()
  } catch (err) {
    uploadError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '上傳失敗'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// 編輯關聯
const editing = ref<MediaLibraryItem | null>(null)
const editOpen = ref(false)
const selectedDestinationIds = ref<number[]>([])
const selectedSpotIds = ref<number[]>([])
const savingLinks = ref(false)

function openEdit(item: MediaLibraryItem) {
  editing.value = item
  selectedDestinationIds.value = item.destinations.map(d => d.id)
  selectedSpotIds.value = item.spots.map(s => s.id)
  editOpen.value = true
}

// 模板裡的 ref 會自動解包，所以這裡收到的是陣列本身而不是 ref
function toggle(list: number[], id: number) {
  const index = list.indexOf(id)
  if (index === -1) list.push(id)
  else list.splice(index, 1)
}

async function saveLinks() {
  if (!editing.value) return
  savingLinks.value = true
  try {
    await $fetch(`/api/admin/media/${editing.value.id}`, {
      method: 'PATCH',
      body: { destinationIds: [...selectedDestinationIds.value], spotIds: [...selectedSpotIds.value] }
    })
    editOpen.value = false
    await refresh()
  } finally {
    savingLinks.value = false
  }
}

const deleteTarget = ref<MediaLibraryItem | null>(null)
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

function askDelete(item: MediaLibraryItem) {
  deleteTarget.value = item
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/admin/media/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    deleteTarget.value = null
    await refresh()
  } catch (err) {
    deleteError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '刪除失敗'
  } finally {
    deleting.value = false
  }
}

const untaggedCount = computed(() =>
  (library.value ?? []).filter(m => m.destinations.length === 0 && m.spots.length === 0).length
)
</script>

<template>
  <div class="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          圖片庫
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          照片掛上地點或景點後，對應頁面的「相關照片」會自動出現它 —— 不需要另外維護相簿清單。
        </p>
      </div>
      <div>
        <UButton color="primary" icon="i-lucide-upload" :loading="uploading" @click="fileInput?.click()">
          上傳照片
        </UButton>
        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFileSelected">
      </div>
    </div>

    <p v-if="uploadError" class="mt-3 text-sm text-red-600">
      {{ uploadError }}
    </p>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <USelect v-model="filterSlug" :items="filterOptions" class="w-52" />
      <span class="text-sm text-gray-500">{{ filtered.length }} 張</span>
      <UButton
        v-if="untaggedCount && filterSlug !== UNTAGGED"
        size="xs"
        color="warning"
        variant="soft"
        @click="filterSlug = UNTAGGED"
      >
        有 {{ untaggedCount }} 張還沒標記地點
      </UButton>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
      >
        <a :href="item.url" target="_blank" rel="noopener noreferrer" class="block bg-gray-50">
          <img :src="item.url" class="aspect-square w-full object-cover" loading="lazy">
        </a>
        <div class="flex flex-1 flex-col gap-2 p-3">
          <div class="flex flex-wrap gap-1">
            <UBadge v-for="d in item.destinations" :key="`d-${d.id}`" color="primary" variant="subtle" size="sm">
              {{ d.name }}
            </UBadge>
            <UBadge v-for="s in item.spots" :key="`s-${s.id}`" color="info" variant="subtle" size="sm">
              {{ s.name }}
            </UBadge>
            <span v-if="!item.destinations.length && !item.spots.length" class="text-xs text-amber-600">
              未標記
            </span>
          </div>
          <div class="mt-auto flex gap-1 pt-1">
            <UButton size="xs" color="neutral" variant="soft" @click="openEdit(item)">
              標記
            </UButton>
            <UButton size="xs" color="error" variant="ghost" class="ml-auto" @click="askDelete(item)">
              刪除
            </UButton>
          </div>
        </div>
      </div>

      <p v-if="!filtered.length" class="col-span-full rounded-2xl border border-gray-100 bg-white py-12 text-center text-sm text-gray-400">
        {{ filterSlug !== ALL ? '這個條件沒有照片' : '媒體庫還沒有照片，點右上角「上傳照片」開始' }}
      </p>
    </div>

    <UModal v-model:open="editOpen" title="標記地點與景點">
      <template #body>
        <div class="space-y-5">
          <div v-if="editing" class="h-32 overflow-hidden rounded-lg bg-gray-50">
            <img :src="editing.url" class="size-full object-contain">
          </div>

          <UFormField label="地點" help="掛上之後，該地點頁的相關照片會自動出現這張">
            <div class="space-y-1">
              <label
                v-for="d in destinationTree"
                :key="d.id"
                class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-50"
                :class="d.type === 'city' ? 'ml-5' : ''"
              >
                <input
                  type="checkbox"
                  class="size-4 shrink-0"
                  :checked="selectedDestinationIds.includes(d.id)"
                  @change="toggle(selectedDestinationIds, d.id)"
                >
                {{ d.name }}
              </label>
            </div>
          </UFormField>

          <UFormField label="景點">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="s in spots ?? []"
                :key="s.id"
                type="button"
                class="rounded-full border px-3 py-1 text-xs transition-colors"
                :class="selectedSpotIds.includes(s.id)
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'"
                @click="toggle(selectedSpotIds, s.id)"
              >
                {{ s.name }}
              </button>
            </div>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="soft" :disabled="savingLinks" @click="editOpen = false">
            取消
          </UButton>
          <UButton color="primary" :loading="savingLinks" @click="saveLinks">
            儲存
          </UButton>
        </div>
      </template>
    </UModal>

    <AdminConfirmDialog v-model:open="deleteOpen" title="刪除照片" :loading="deleting" @confirm="confirmDelete">
      <p class="text-sm text-gray-600">
        確定要刪除這張照片嗎？檔案會一併從儲存空間移除，無法復原。
      </p>
      <p v-if="deleteError" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {{ deleteError }}
      </p>
    </AdminConfirmDialog>
  </div>
</template>
