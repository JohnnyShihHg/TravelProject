<script setup lang="ts">
import type { AdminSpot, AdminDestination, MediaLibraryItem } from '~/types/trip'

definePageMeta({ layout: 'admin' })
useHead({ title: '景點管理' })

const { data: spots, refresh } = await useFetch<AdminSpot[]>('/api/admin/spots')
const { data: destinations } = await useFetch<AdminDestination[]>('/api/admin/destinations')
const { data: library } = await useFetch<MediaLibraryItem[]>('/api/admin/media')

// 所在地可以選國家或城市：像富士山就不屬於任何單一城市。
// 選項值用字串：Reka UI 的 Select 不接受空字串／null 當選項值，
// 所以「不指定」用 NONE 哨兵值，送出前再轉回 null。
const NONE = 'none'

const destinationOptions = computed(() => {
  const all = destinations.value ?? []
  return [
    { label: '（不指定）', value: NONE },
    ...all
      .filter(d => d.type === 'country')
      .flatMap(country => [
        { label: country.name, value: String(country.id) },
        ...all.filter(c => c.parentId === country.id).map(city => ({
          label: `${country.name} › ${city.name}`,
          value: String(city.id)
        }))
      ])
  ]
})

const destinationSelect = computed({
  get: () => (form.destinationId === null ? NONE : String(form.destinationId)),
  set: (value: string) => { form.destinationId = value === NONE ? null : Number(value) }
})

const dialogOpen = ref(false)
const editing = ref<AdminSpot | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  name: '',
  slug: '',
  destinationId: null as number | null,
  description: '',
  address: '',
  lat: '',
  lng: '',
  coverMediaId: null as number | null
})

function openCreate() {
  editing.value = null
  formError.value = ''
  Object.assign(form, {
    name: '', slug: '', destinationId: null, description: '', address: '', lat: '', lng: '', coverMediaId: null
  })
  dialogOpen.value = true
}

function openEdit(s: AdminSpot) {
  editing.value = s
  formError.value = ''
  Object.assign(form, {
    name: s.name,
    slug: s.slug,
    destinationId: s.destinationId,
    description: s.description ?? '',
    address: s.address ?? '',
    lat: s.lat ?? '',
    lng: s.lng ?? '',
    coverMediaId: s.coverMediaId
  })
  dialogOpen.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    const body = {
      name: form.name,
      slug: form.slug || undefined,
      destinationId: form.destinationId,
      description: form.description,
      address: form.address,
      lat: form.lat,
      lng: form.lng,
      ...(editing.value ? { coverMediaId: form.coverMediaId } : {})
    }
    if (editing.value) {
      await $fetch(`/api/admin/spots/${editing.value.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/admin/spots', { method: 'POST', body })
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    formError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '儲存失敗'
  } finally {
    saving.value = false
  }
}

const deleteTarget = ref<AdminSpot | null>(null)
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

function askDelete(s: AdminSpot) {
  deleteTarget.value = s
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/admin/spots/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    deleteTarget.value = null
    await refresh()
  } catch (err) {
    deleteError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '刪除失敗'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          景點
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          景點的介紹與照片只寫一次，所有行程共用。改一次，所有用到它的頁面一起更新。
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
        新增景點
      </UButton>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="spot in spots ?? []"
        :key="spot.id"
        class="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        <div class="h-32 bg-gray-50">
          <AppImage v-if="spot.coverImageUrl" :src="spot.coverImageUrl" :width="400" alt="" loading="lazy" class="size-full object-cover" />
          <div v-else class="flex size-full items-center justify-center">
            <UIcon name="i-lucide-image-off" class="size-6 text-gray-300" />
          </div>
        </div>
        <div class="flex flex-1 flex-col p-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold text-gray-900">{{ spot.name }}</span>
            <UBadge v-if="spot.destinationName" color="neutral" variant="subtle" size="sm">
              {{ spot.destinationName }}
            </UBadge>
          </div>
          <p class="mt-0.5 font-mono text-xs text-gray-400">
            /spots/{{ spot.slug }}
          </p>
          <p v-if="spot.description" class="mt-2 line-clamp-2 text-xs text-gray-500">
            {{ spot.description }}
          </p>
          <p class="mt-2 text-xs text-gray-400">
            {{ spot.tripCount }} 個行程・{{ spot.photoCount }} 張照片
          </p>
          <div class="mt-3 flex gap-2 pt-1">
            <UButton size="xs" color="neutral" variant="soft" @click="openEdit(spot)">
              編輯
            </UButton>
            <UButton size="xs" color="neutral" variant="ghost" :to="`/spots/${spot.slug}`" target="_blank">
              看前台
            </UButton>
            <UButton size="xs" color="error" variant="ghost" class="ml-auto" @click="askDelete(spot)">
              刪除
            </UButton>
          </div>
        </div>
      </div>

      <p v-if="!(spots ?? []).length" class="rounded-2xl border border-gray-100 bg-white py-12 text-center text-sm text-gray-400 md:col-span-2 xl:col-span-3">
        尚無景點，點右上角「新增景點」開始建立
      </p>
    </div>

    <UModal v-model:open="dialogOpen" :title="editing ? '編輯景點' : '新增景點'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="景點名稱" required>
            <UInput v-model="form.name" class="w-full" placeholder="例如：清水寺" />
          </UFormField>

          <UFormField label="網址代稱（slug）" :help="editing ? '會影響前台網址，改了舊網址就失效' : '留空會自動產生，中文名稱建議手動填英文'">
            <UInput v-model="form.slug" class="w-full" placeholder="kiyomizu-dera" />
          </UFormField>

          <UFormField label="所在地" help="可以選國家或城市。像富士山不屬於任何單一城市，就選國家">
            <USelect v-model="destinationSelect" :items="destinationOptions" class="w-full" />
          </UFormField>

          <UFormField label="介紹文" help="顯示在景點頁與目的地頁的景點卡片">
            <UTextarea v-model="form.description" :rows="4" class="w-full" />
          </UFormField>

          <UFormField label="地址">
            <UInput v-model="form.address" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="緯度" help="填了就會出現地圖連結">
              <UInput v-model="form.lat" class="w-full" placeholder="34.9949" />
            </UFormField>
            <UFormField label="經度">
              <UInput v-model="form.lng" class="w-full" placeholder="135.7850" />
            </UFormField>
          </div>

          <UFormField v-if="editing" label="封面圖">
            <AdminCoverPicker v-model="form.coverMediaId" :library="library ?? []" />
          </UFormField>

          <p v-if="formError" class="text-sm text-red-600">
            {{ formError }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="soft" :disabled="saving" @click="dialogOpen = false">
            取消
          </UButton>
          <UButton color="primary" :loading="saving" @click="submit">
            {{ editing ? '儲存' : '新增' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <AdminConfirmDialog v-model:open="deleteOpen" title="刪除景點" :loading="deleting" @confirm="confirmDelete">
      <p class="text-sm text-gray-600">
        確定要刪除「<span class="font-medium text-gray-900">{{ deleteTarget?.name }}</span>」嗎？
      </p>
      <p v-if="deleteError" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {{ deleteError }}
      </p>
    </AdminConfirmDialog>
  </div>
</template>
