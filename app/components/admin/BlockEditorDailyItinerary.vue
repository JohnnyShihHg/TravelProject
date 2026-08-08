<script setup lang="ts">
import type { DailyItineraryBlockData, DailyItineraryDay } from '~/types/trip'

const props = defineProps<{ modelValue: DailyItineraryBlockData }>()
const emit = defineEmits<{ 'update:modelValue': [value: DailyItineraryBlockData] }>()

function emptyDay(dayNumber: number): DailyItineraryDay {
  return { day: dayNumber, title: '', html: '', meals: { breakfast: '', lunch: '', dinner: '' }, hotel: '' }
}

function addDay() {
  emit('update:modelValue', { days: [...props.modelValue.days, emptyDay(props.modelValue.days.length + 1)] })
}

function updateDay(index: number, patch: Partial<DailyItineraryDay>) {
  const days = props.modelValue.days.map((d, i) => (i === index ? { ...d, ...patch } : d))
  emit('update:modelValue', { days })
}

function updateMeals(index: number, patch: Partial<DailyItineraryDay['meals']>) {
  const day = props.modelValue.days[index]
  if (!day) return
  updateDay(index, { meals: { ...day.meals, ...patch } })
}

function removeDay(index: number) {
  emit('update:modelValue', { days: props.modelValue.days.filter((_, i) => i !== index) })
}
</script>

<template>
  <div class="space-y-4">
    <div v-for="(d, i) in modelValue.days" :key="i" class="rounded-lg border border-gray-200 p-3">
      <div class="mb-2 flex items-center gap-2">
        <span class="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">DAY {{ d.day }}</span>
        <UInput :model-value="d.title" size="xs" class="flex-1" placeholder="當日標題" @update:model-value="(v) => updateDay(i, { title: String(v) })" />
        <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="removeDay(i)" />
      </div>

      <AdminTiptapEditor :model-value="d.html" @update:model-value="(v) => updateDay(i, { html: v })" />

      <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <UInput :model-value="d.meals.breakfast" size="xs" placeholder="早餐" @update:model-value="(v) => updateMeals(i, { breakfast: String(v) })" />
        <UInput :model-value="d.meals.lunch" size="xs" placeholder="午餐" @update:model-value="(v) => updateMeals(i, { lunch: String(v) })" />
        <UInput :model-value="d.meals.dinner" size="xs" placeholder="晚餐" @update:model-value="(v) => updateMeals(i, { dinner: String(v) })" />
        <UInput :model-value="d.hotel" size="xs" placeholder="旅館" @update:model-value="(v) => updateDay(i, { hotel: String(v) })" />
      </div>
    </div>

    <UButton size="xs" color="neutral" variant="soft" @click="addDay">
      ＋新增一天
    </UButton>
  </div>
</template>
