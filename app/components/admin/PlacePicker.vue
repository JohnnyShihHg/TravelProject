<script setup lang="ts">
import type { AdminDestination, AdminSpot } from '~/types/trip'

// 地點是多選，但麵包屑只能有一條路徑，所以另外記哪一個是主要地點。
// 呼叫端送出時要把主要地點排在陣列第一個 —— API 是用順序判斷的。
const selectedDestinationIds = defineModel<number[]>('destinationIds', { required: true })
const primaryDestinationId = defineModel<number | null>('primaryDestinationId', { required: true })
const selectedSpotIds = defineModel<number[]>('spotIds', { required: true })

const { data: allDestinations, refresh: refreshDestinations } = await useFetch<AdminDestination[]>('/api/admin/destinations')
const { data: allSpots, refresh: refreshSpots } = await useFetch<AdminSpot[]>('/api/admin/spots')

// 國家在前、底下的城市跟著它，跟側邊欄一樣用縮排表達層級
const destinationTree = computed(() => {
  const all = allDestinations.value ?? []
  return all
    .filter(d => d.type === 'country')
    .flatMap(country => [country, ...all.filter(c => c.parentId === country.id)])
})

const countryOptions = computed(() =>
  (allDestinations.value ?? []).filter(d => d.type === 'country').map(c => ({ label: c.name, value: c.id }))
)

function toggleDestination(destinationId: number) {
  const list = selectedDestinationIds.value
  const index = list.indexOf(destinationId)
  if (index === -1) {
    list.push(destinationId)
    // 第一個被選的地點自動成為主要地點，省去多一次點擊
    if (primaryDestinationId.value === null) primaryDestinationId.value = destinationId
  } else {
    list.splice(index, 1)
    if (primaryDestinationId.value === destinationId) {
      primaryDestinationId.value = list[0] ?? null
    }
  }
}

function toggleSpot(spotId: number) {
  const list = selectedSpotIds.value
  const index = list.indexOf(spotId)
  if (index === -1) list.push(spotId)
  else list.splice(index, 1)
}

// 就地新增地點：國內/國外分類（isDomestic）影響行程分類，值得使用者到「目的地」頁
// 專門頁面想清楚再設，這裡不提供這個開關，新增的國家一律預設 false
const newDestinationName = ref('')
const newDestinationType = ref<'country' | 'city'>('city')
// USelect 的 v-model 不吃 null，用 undefined 表示「還沒選」
const newDestinationParentId = ref<number | undefined>(undefined)
const creatingDestination = ref(false)
const destinationError = ref('')

async function createDestination() {
  const name = newDestinationName.value.trim()
  if (!name) return
  if (newDestinationType.value === 'city' && !newDestinationParentId.value) {
    destinationError.value = '城市必須選擇所屬國家'
    return
  }
  destinationError.value = ''
  creatingDestination.value = true
  try {
    const destination = await $fetch<AdminDestination>('/api/admin/destinations', {
      method: 'POST',
      body: {
        name,
        type: newDestinationType.value,
        parentId: newDestinationType.value === 'city' ? newDestinationParentId.value : undefined
      }
    })
    await refreshDestinations()
    selectedDestinationIds.value.push(destination.id)
    if (primaryDestinationId.value === null) primaryDestinationId.value = destination.id
    newDestinationName.value = ''
    newDestinationParentId.value = undefined
  } catch (err) {
    destinationError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '新增失敗'
  } finally {
    creatingDestination.value = false
  }
}

// 就地新增景點
const newSpotName = ref('')
const newSpotDestinationId = ref<number | undefined>(undefined)
const creatingSpot = ref(false)
const spotError = ref('')

async function createSpot() {
  const name = newSpotName.value.trim()
  if (!name) return
  spotError.value = ''
  creatingSpot.value = true
  try {
    const spot = await $fetch<AdminSpot>('/api/admin/spots', {
      method: 'POST',
      body: { name, destinationId: newSpotDestinationId.value }
    })
    await refreshSpots()
    selectedSpotIds.value.push(spot.id)
    newSpotName.value = ''
    newSpotDestinationId.value = undefined
  } catch (err) {
    spotError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '新增失敗'
  } finally {
    creatingSpot.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <UFormField label="前往的地點">
      <div class="space-y-1">
        <div
          v-for="d in destinationTree"
          :key="d.id"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
          :class="d.type === 'city' ? 'ml-5' : ''"
        >
          <input
            :id="`dest-${d.id}`"
            type="checkbox"
            :checked="selectedDestinationIds.includes(d.id)"
            class="size-4 shrink-0"
            @change="toggleDestination(d.id)"
          >
          <label :for="`dest-${d.id}`" class="flex-1 cursor-pointer text-sm text-gray-700">
            {{ d.name }}
            <span v-if="d.type === 'country' && d.isDomestic" class="ml-1 text-xs text-primary">國內</span>
          </label>
          <UButton
            v-if="selectedDestinationIds.includes(d.id)"
            size="xs"
            :color="primaryDestinationId === d.id ? 'primary' : 'neutral'"
            :variant="primaryDestinationId === d.id ? 'solid' : 'ghost'"
            @click="primaryDestinationId = d.id"
          >
            {{ primaryDestinationId === d.id ? '主要地點' : '設為主要' }}
          </UButton>
        </div>
      </div>
      <p v-if="!destinationTree.length" class="text-xs text-gray-400">
        尚未建立任何目的地，請先到「目的地」頁新增。
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-gray-200 p-3">
        <USelect
          v-model="newDestinationType"
          :items="[{ label: '城市', value: 'city' }, { label: '國家', value: 'country' }]"
          size="xs"
          class="w-24"
        />
        <USelect
          v-if="newDestinationType === 'city'"
          v-model="newDestinationParentId"
          :items="countryOptions"
          placeholder="所屬國家"
          size="xs"
          class="w-32"
        />
        <UInput v-model="newDestinationName" size="xs" placeholder="新地點名稱" class="w-full sm:w-40" @keyup.enter="createDestination" />
        <UButton size="xs" color="neutral" variant="soft" :loading="creatingDestination" @click="createDestination">
          ＋新增地點
        </UButton>
        <p class="w-full text-xs text-gray-400">
          國內／國外的設定請到「目的地」頁調整。
        </p>
        <p v-if="destinationError" class="w-full text-xs text-red-600">
          {{ destinationError }}
        </p>
      </div>
    </UFormField>

    <UFormField label="造訪的景點">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in allSpots ?? []"
          :key="s.id"
          type="button"
          class="rounded-full border px-3 py-1 text-xs transition-colors"
          :class="selectedSpotIds.includes(s.id)
            ? 'border-primary bg-primary text-white'
            : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'"
          @click="toggleSpot(s.id)"
        >
          {{ s.name }}
          <span v-if="s.destinationName" class="opacity-60">· {{ s.destinationName }}</span>
        </button>
      </div>
      <p v-if="!(allSpots ?? []).length" class="text-xs text-gray-400">
        尚未建立任何景點，請先到「景點」頁新增。
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-gray-200 p-3">
        <USelect
          v-model="newSpotDestinationId"
          :items="destinationTree.map(d => ({ label: d.name, value: d.id }))"
          placeholder="所在地（選填）"
          size="xs"
          class="w-32"
        />
        <UInput v-model="newSpotName" size="xs" placeholder="新景點名稱" class="w-full sm:w-40" @keyup.enter="createSpot" />
        <UButton size="xs" color="neutral" variant="soft" :loading="creatingSpot" @click="createSpot">
          ＋新增景點
        </UButton>
        <p v-if="spotError" class="w-full text-xs text-red-600">
          {{ spotError }}
        </p>
      </div>
    </UFormField>
  </div>
</template>
