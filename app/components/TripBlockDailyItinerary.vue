<script setup lang="ts">
import type { DailyItineraryBlockData, DailyItineraryDay, SpotCardItem } from '~/types/trip'

const props = defineProps<{ data: DailyItineraryBlockData }>()

// 連續的景點小卡併成同一列並排，不然一天插三張就是三張整寬大圖往下疊
type Row = { kind: 'day', key: string, day: DailyItineraryDay } | { kind: 'spots', key: string, cards: SpotCardItem[] }
const rows = computed(() => {
  const result: Row[] = []
  for (const item of props.data.items) {
    if (item.kind === 'day') {
      result.push({ kind: 'day', key: `day-${item.day}`, day: item })
      continue
    }
    const last = result[result.length - 1]
    if (last?.kind === 'spots') last.cards.push(item)
    else result.push({ kind: 'spots', key: item.id, cards: [item] })
  }
  return result
})
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-center gap-2 text-gray-900 print:break-after-avoid">
      <UIcon name="i-lucide-calendar-days" class="size-5 text-primary sm:size-6" />
      <span class="text-xl font-semibold sm:text-2xl">每日行程</span>
    </div>

    <div class="space-y-4">
      <template v-for="row in rows" :key="row.key">
        <div v-if="row.kind === 'day'" class="rounded-xl border border-gray-100 p-4 shadow-sm print:break-inside-avoid print:shadow-none">
          <div class="flex items-start gap-3">
            <span class="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-white">
              DAY {{ row.day.day }}
            </span>
            <h3 class="text-xl font-semibold text-gray-900">
              {{ row.day.title }}
            </h3>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="prose prose-base mt-3 max-w-none" v-html="row.day.html" />
          <div class="mt-4 grid grid-cols-1 gap-2 border-t border-gray-100 pt-3 text-sm text-gray-500 sm:grid-cols-2">
            <div class="flex items-start gap-1.5">
              <UIcon name="i-lucide-utensils" class="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div>
                <span class="font-medium text-gray-700">餐食：</span>
                早餐 {{ row.day.meals.breakfast || '敬請自理' }}｜
                午餐 {{ row.day.meals.lunch || '敬請自理' }}｜
                晚餐 {{ row.day.meals.dinner || '敬請自理' }}
              </div>
            </div>
            <div class="flex items-start gap-1.5">
              <UIcon name="i-lucide-bed" class="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div>
                <span class="font-medium text-gray-700">旅館：</span>{{ row.day.hotel || '未指定' }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TripSpotTeaserCard
            v-for="card in row.cards"
            :key="card.id"
            :spot="card.spot"
            :caption="card.caption"
            :image-url="card.imageUrl"
          />
        </div>
      </template>
      <p v-if="!data.items.length" class="text-sm text-gray-400">
        尚未設定每日行程
      </p>
    </div>
  </div>
</template>
