<script setup lang="ts">
/**
 * 帶搜尋的景點選擇器，給「每日行程」編輯器插入景點小卡時用。
 *
 * 景點數量已經到中大量規模（而且會持續透過 AI 從行程單批次建立），
 * 所以打字時由後端 GET /api/admin/spots?q= 過濾、每次最多回 SEARCH_LIMIT 筆，
 * 不一次把全部景點撈到前端。
 */
import type { AdminSpot } from '~/types/trip'

const SEARCH_LIMIT = 50

const props = defineProps<{
  /** 已選景點的名稱。已選的那筆不一定在搜尋結果裡，要靠這個才能顯示出來 */
  selectedName?: string
}>()
const spotId = defineModel<number | null>({ required: true })

const searchTerm = ref('')
const spots = ref<AdminSpot[]>([])
const loading = ref(false)
const selectedLabel = ref(props.selectedName ?? '')

async function search(q: string) {
  loading.value = true
  try {
    spots.value = await $fetch<AdminSpot[]>('/api/admin/spots', { query: { q: q || undefined, limit: SEARCH_LIMIT } })
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(searchTerm, (q) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => search(q), 250)
})
onBeforeUnmount(() => clearTimeout(debounceTimer))

onMounted(() => search(''))

const items = computed(() => {
  const list = spots.value.map(s => ({ label: s.name, value: s.id }))
  if (spotId.value && selectedLabel.value && !list.some(i => i.value === spotId.value)) {
    list.unshift({ label: selectedLabel.value, value: spotId.value })
  }
  return list
})

function onUpdate(value: number | undefined) {
  if (value === undefined) return
  const picked = items.value.find(i => i.value === value)
  selectedLabel.value = picked?.label ?? selectedLabel.value
  spotId.value = value
}
</script>

<template>
  <USelectMenu
    v-model:search-term="searchTerm"
    :model-value="spotId ?? undefined"
    :items="items"
    :loading="loading"
    ignore-filter
    value-key="value"
    placeholder="搜尋景點名稱…"
    size="sm"
    class="w-full"
    @update:model-value="onUpdate"
  />
</template>
