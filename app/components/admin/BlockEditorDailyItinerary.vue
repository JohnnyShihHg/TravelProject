<script setup lang="ts">
import type { DailyItineraryBlockData, DailyItineraryDay, DailyItineraryItem, SpotCardItem } from '~/types/trip'

const props = defineProps<{ modelValue: DailyItineraryBlockData }>()
const emit = defineEmits<{ 'update:modelValue': [value: DailyItineraryBlockData] }>()

function dayCount() {
  return props.modelValue.items.filter(i => i.kind === 'day').length
}

function emptyDay(dayNumber: number): DailyItineraryDay {
  return { kind: 'day', day: dayNumber, title: '', html: '', meals: { breakfast: '', lunch: '', dinner: '' }, hotel: '' }
}

function emptySpotCard(): SpotCardItem {
  return { kind: 'spotCard', id: crypto.randomUUID(), spotId: 0 }
}

function setItems(items: DailyItineraryItem[]) {
  emit('update:modelValue', { items })
}

function addDay() {
  setItems([...props.modelValue.items, emptyDay(dayCount() + 1)])
}

function addSpotCard(afterIndex: number) {
  const items = [...props.modelValue.items]
  items.splice(afterIndex + 1, 0, emptySpotCard())
  setItems(items)
}

function updateItem(index: number, patch: Partial<DailyItineraryDay> | Partial<SpotCardItem>) {
  const items = props.modelValue.items.map((item, i) => (i === index ? { ...item, ...patch } as DailyItineraryItem : item))
  setItems(items)
}

function updateMeals(index: number, patch: Partial<DailyItineraryDay['meals']>) {
  const item = props.modelValue.items[index]
  if (!item || item.kind !== 'day') return
  updateItem(index, { meals: { ...item.meals, ...patch } })
}

function removeItem(index: number) {
  setItems(props.modelValue.items.filter((_, i) => i !== index))
}

function move(index: number, direction: -1 | 1) {
  const items = [...props.modelValue.items]
  const target = index + direction
  if (target < 0 || target >= items.length) return
  const temp = items[index]!
  items[index] = items[target]!
  items[target] = temp
  setItems(items)
}

const cropDialogIndex = ref<number | null>(null)
const cropFile = ref<File | null>(null)

function pickImage(index: number, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  cropDialogIndex.value = index
  cropFile.value = file
  ;(e.target as HTMLInputElement).value = ''
}

async function onCropped(file: File) {
  const index = cropDialogIndex.value
  cropFile.value = null
  cropDialogIndex.value = null
  if (index === null) return

  const formData = new FormData()
  formData.append('file', file)
  const uploaded = await $fetch<{ id: number }>('/api/admin/media', { method: 'POST', body: formData })
  updateItem(index, { imageMediaId: uploaded.id })
}
</script>

<template>
  <div class="space-y-2">
    <template v-for="(item, i) in modelValue.items" :key="item.kind === 'day' ? `day-${i}` : item.id">
      <div v-if="item.kind === 'day'" class="rounded-lg border border-gray-200 p-3">
        <div class="mb-2 flex items-center gap-2">
          <span class="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">DAY {{ item.day }}</span>
          <UInput :model-value="item.title" size="xs" class="flex-1" placeholder="當日標題" @update:model-value="(v) => updateItem(i, { title: String(v) })" />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-up" square @click="move(i, -1)" />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-down" square @click="move(i, 1)" />
          <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" square @click="removeItem(i)" />
        </div>

        <AdminTiptapEditor :model-value="item.html" @update:model-value="(v) => updateItem(i, { html: v })" />

        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <UInput :model-value="item.meals.breakfast" size="xs" placeholder="早餐" @update:model-value="(v) => updateMeals(i, { breakfast: String(v) })" />
          <UInput :model-value="item.meals.lunch" size="xs" placeholder="午餐" @update:model-value="(v) => updateMeals(i, { lunch: String(v) })" />
          <UInput :model-value="item.meals.dinner" size="xs" placeholder="晚餐" @update:model-value="(v) => updateMeals(i, { dinner: String(v) })" />
          <UInput :model-value="item.hotel" size="xs" placeholder="旅館" @update:model-value="(v) => updateItem(i, { hotel: String(v) })" />
        </div>
      </div>

      <div v-else class="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
        <div class="mb-2 flex items-center gap-2">
          <UIcon name="i-lucide-map-pin" class="size-4 shrink-0 text-primary" />
          <span class="shrink-0 text-xs font-bold text-gray-600">景點小卡</span>
          <div class="flex-1">
            <AdminSpotPicker :model-value="item.spotId || null" :selected-name="item.spot?.name" @update:model-value="(v) => updateItem(i, { spotId: v ?? 0 })" />
          </div>
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-up" square @click="move(i, -1)" />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-down" square @click="move(i, 1)" />
          <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" square @click="removeItem(i)" />
        </div>

        <UTextarea
          :model-value="item.caption ?? ''"
          size="xs"
          class="w-full"
          :rows="2"
          placeholder="簡短介紹（留空就用景點自己的介紹文字）"
          @update:model-value="(v) => updateItem(i, { caption: String(v) || undefined })"
        />

        <div class="mt-2 flex items-center gap-2">
          <label class="cursor-pointer">
            <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-image-plus" as="span">
              {{ item.imageMediaId ? '更換卡片圖片' : '上傳自訂圖片' }}
            </UButton>
            <input type="file" accept="image/*" class="hidden" @change="(e) => pickImage(i, e)">
          </label>
          <span class="text-xs text-gray-400">留空就用景點自己的封面圖</span>
        </div>
      </div>

      <div class="flex justify-center">
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-plus" @click="addSpotCard(i)">
          插入景點小卡
        </UButton>
      </div>
    </template>

    <UButton size="xs" color="neutral" variant="soft" @click="addDay">
      ＋新增一天
    </UButton>

    <AdminImageCropDialog
      :file="cropFile"
      :aspect="3 / 2"
      title="裁切景點卡片圖片"
      hint="拖曳方框調整景點小卡要顯示的範圍"
      @cropped="onCropped"
      @cancel="cropFile = null; cropDialogIndex = null"
    />
  </div>
</template>
