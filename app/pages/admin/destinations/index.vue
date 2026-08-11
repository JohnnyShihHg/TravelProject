<script setup lang="ts">
import type { AdminDestination, MediaLibraryItem } from '~/types/trip'

definePageMeta({ layout: 'admin' })
useHead({ title: '目的地管理' })

const { data: destinations, refresh } = await useFetch<AdminDestination[]>('/api/admin/destinations')
const { data: library } = await useFetch<MediaLibraryItem[]>('/api/admin/media')

const countries = computed(() => (destinations.value ?? []).filter(d => d.type === 'country'))

// 國家在前、底下的城市跟著它，跟前台的階層一致
const grouped = computed(() => countries.value.map(country => ({
  country,
  cities: (destinations.value ?? []).filter(c => c.parentId === country.id)
})))

// 沒有所屬國家的城市（例如國家被刪掉後留下的）單獨列出來，不要讓它消失在畫面上
const orphanCities = computed(() =>
  (destinations.value ?? []).filter(d => d.type === 'city' && !countries.value.some(c => c.id === d.parentId))
)

const dialogOpen = ref(false)
const editing = ref<AdminDestination | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  name: '',
  slug: '',
  type: 'country' as 'country' | 'city',
  parentId: null as number | null,
  isDomestic: false,
  description: '',
  coverMediaId: null as number | null,
  rank: 0
})

function openCreate(type: 'country' | 'city', parentId: number | null = null) {
  editing.value = null
  formError.value = ''
  Object.assign(form, {
    name: '', slug: '', type, parentId, isDomestic: false, description: '', coverMediaId: null, rank: 0
  })
  dialogOpen.value = true
}

function openEdit(d: AdminDestination) {
  editing.value = d
  formError.value = ''
  Object.assign(form, {
    name: d.name,
    slug: d.slug,
    type: d.type,
    parentId: d.parentId,
    isDomestic: d.isDomestic,
    description: d.description ?? '',
    coverMediaId: d.coverMediaId,
    rank: d.rank
  })
  dialogOpen.value = true
}

// 選項值一律用字串：Reka UI 的 Select 對空字串／null 會直接拋錯，
// 統一成字串最不容易再踩到（送出前轉回數字）。
const parentOptions = computed(() => countries.value.map(c => ({ label: c.name, value: String(c.id) })))

const parentSelect = computed({
  get: () => (form.parentId === null ? undefined : String(form.parentId)),
  set: (value: string | undefined) => { form.parentId = value ? Number(value) : null }
})

async function submit() {
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      // type 不開放修改：國家改成城市會讓底下的城市與行程關聯失去意義
      await $fetch(`/api/admin/destinations/${editing.value.id}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          slug: form.slug,
          ...(form.type === 'city' ? { parentId: form.parentId } : {}),
          ...(form.type === 'country' ? { isDomestic: form.isDomestic } : {}),
          description: form.description,
          coverMediaId: form.coverMediaId,
          rank: form.rank
        }
      })
    } else {
      await $fetch('/api/admin/destinations', {
        method: 'POST',
        body: {
          name: form.name,
          slug: form.slug || undefined,
          type: form.type,
          parentId: form.parentId,
          isDomestic: form.isDomestic,
          description: form.description,
          rank: form.rank
        }
      })
    }
    dialogOpen.value = false
    await refresh()
  } catch (err) {
    formError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '儲存失敗'
  } finally {
    saving.value = false
  }
}

const deleteTarget = ref<AdminDestination | null>(null)
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

function askDelete(d: AdminDestination) {
  deleteTarget.value = d
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/admin/destinations/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    deleteTarget.value = null
    await refresh()
  } catch (err) {
    deleteError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '刪除失敗'
  } finally {
    deleting.value = false
  }
}

function usageLabel(d: AdminDestination) {
  const parts: string[] = []
  if (d.tripCount) parts.push(`${d.tripCount} 行程`)
  if (d.spotCount) parts.push(`${d.spotCount} 景點`)
  if (d.photoCount) parts.push(`${d.photoCount} 照片`)
  return parts.join('・') || '未使用'
}
</script>

<template>
  <div class="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          目的地
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          國家與城市。國家的「國內線」設定決定行程算國內還是國外，城市自動跟著所屬國家。
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" @click="openCreate('country')">
        新增國家
      </UButton>
    </div>

    <div class="mt-6 space-y-4">
      <div v-for="group in grouped" :key="group.country.id" class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <!-- 國家 -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-50">
            <img v-if="group.country.coverImageUrl" :src="group.country.coverImageUrl" class="size-full object-cover">
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-gray-900">{{ group.country.name }}</span>
              <UBadge v-if="group.country.isDomestic" color="primary" variant="subtle" size="sm">
                國內線
              </UBadge>
              <span class="font-mono text-xs text-gray-400">/{{ group.country.slug }}</span>
            </div>
            <p class="mt-0.5 text-xs text-gray-400">
              {{ usageLabel(group.country) }}
            </p>
          </div>
          <div class="flex gap-2">
            <UButton size="xs" color="neutral" variant="soft" @click="openCreate('city', group.country.id)">
              ＋城市
            </UButton>
            <UButton size="xs" color="neutral" variant="soft" @click="openEdit(group.country)">
              編輯
            </UButton>
            <UButton size="xs" color="error" variant="soft" @click="askDelete(group.country)">
              刪除
            </UButton>
          </div>
        </div>

        <!-- 底下的城市 -->
        <div v-if="group.cities.length" class="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <div
            v-for="city in group.cities"
            :key="city.id"
            class="flex flex-wrap items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
          >
            <UIcon name="i-lucide-corner-down-right" class="size-4 shrink-0 text-gray-300" />
            <div class="size-9 shrink-0 overflow-hidden rounded bg-gray-50">
              <img v-if="city.coverImageUrl" :src="city.coverImageUrl" class="size-full object-cover">
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm text-gray-900">{{ city.name }}</span>
                <span class="font-mono text-xs text-gray-400">/{{ city.slug }}</span>
              </div>
              <p class="text-xs text-gray-400">
                {{ usageLabel(city) }}
              </p>
            </div>
            <div class="flex gap-2">
              <UButton size="xs" color="neutral" variant="ghost" @click="openEdit(city)">
                編輯
              </UButton>
              <UButton size="xs" color="error" variant="ghost" @click="askDelete(city)">
                刪除
              </UButton>
            </div>
          </div>
        </div>
        <p v-else class="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
          這個國家底下還沒有城市
        </p>
      </div>

      <div v-if="orphanCities.length" class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p class="text-sm font-medium text-amber-900">
          沒有所屬國家的城市
        </p>
        <div v-for="city in orphanCities" :key="city.id" class="mt-2 flex items-center justify-between gap-3">
          <span class="text-sm text-gray-900">{{ city.name }}</span>
          <UButton size="xs" color="neutral" variant="soft" @click="openEdit(city)">
            指定所屬國家
          </UButton>
        </div>
      </div>

      <p v-if="!grouped.length && !orphanCities.length" class="rounded-2xl border border-gray-100 bg-white py-12 text-center text-sm text-gray-400">
        尚無目的地，點右上角「新增國家」開始建立
      </p>
    </div>

    <!-- 新增／編輯 -->
    <UModal v-model:open="dialogOpen" :title="editing ? `編輯${form.type === 'country' ? '國家' : '城市'}` : `新增${form.type === 'country' ? '國家' : '城市'}`">
      <template #body>
        <div class="space-y-4">
          <UFormField label="名稱" required>
            <UInput v-model="form.name" class="w-full" placeholder="例如：日本" />
          </UFormField>

          <UFormField label="網址代稱（slug）" :help="editing ? '會影響前台網址，改了舊網址就失效' : '留空會自動產生，中文名稱建議手動填英文'">
            <UInput v-model="form.slug" class="w-full" placeholder="japan" />
          </UFormField>

          <UFormField v-if="form.type === 'city'" label="所屬國家" required>
            <USelect v-model="parentSelect" :items="parentOptions" class="w-full" />
          </UFormField>

          <UFormField v-if="form.type === 'country'" label="國內線" help="打開代表這個國家的行程算國內線，底下的城市自動跟著">
            <USwitch v-model="form.isDomestic" />
          </UFormField>

          <UFormField label="介紹文" help="顯示在目的地頁。留空的話頁面會很單薄，對搜尋排名不利">
            <UTextarea v-model="form.description" :rows="4" class="w-full" />
          </UFormField>

          <UFormField v-if="editing" label="封面圖">
            <AdminCoverPicker v-model="form.coverMediaId" :library="library ?? []" />
          </UFormField>

          <UFormField label="排序" help="數字越小越前面">
            <UInput v-model.number="form.rank" type="number" class="w-24" />
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

    <AdminConfirmDialog v-model:open="deleteOpen" title="刪除目的地" :loading="deleting" @confirm="confirmDelete">
      <p class="text-sm text-gray-600">
        確定要刪除「<span class="font-medium text-gray-900">{{ deleteTarget?.name }}</span>」嗎？
      </p>
      <p v-if="deleteError" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {{ deleteError }}
      </p>
    </AdminConfirmDialog>
  </div>
</template>
