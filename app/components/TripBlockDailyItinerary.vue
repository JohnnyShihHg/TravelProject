<script setup lang="ts">
import type { DailyItineraryBlockData } from '~/types/trip'

defineProps<{ data: DailyItineraryBlockData }>()
</script>

<template>
  <div>
    <div class="mb-4 flex items-center gap-2 text-gray-900">
      <UIcon name="i-lucide-calendar-days" class="size-4 text-primary" />
      <span class="text-sm font-semibold">每日行程</span>
    </div>

    <div class="space-y-4">
      <div v-for="d in data.days" :key="d.day" class="rounded-xl border border-gray-100 p-4 shadow-sm">
        <div class="flex items-start gap-3">
          <span class="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-white">
            DAY {{ d.day }}
          </span>
          <h3 class="text-sm font-semibold text-gray-900">
            {{ d.title }}
          </h3>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="prose prose-sm mt-3 max-w-none" v-html="d.html" />
        <div class="mt-4 grid grid-cols-1 gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500 sm:grid-cols-2">
          <div>
            <span class="font-medium text-gray-700">餐食：</span>
            早餐 {{ d.meals.breakfast || '敬請自理' }}｜
            午餐 {{ d.meals.lunch || '敬請自理' }}｜
            晚餐 {{ d.meals.dinner || '敬請自理' }}
          </div>
          <div>
            <span class="font-medium text-gray-700">旅館：</span>{{ d.hotel || '未指定' }}
          </div>
        </div>
      </div>
      <p v-if="!data.days.length" class="text-xs text-gray-400">
        尚未設定每日行程
      </p>
    </div>
  </div>
</template>
