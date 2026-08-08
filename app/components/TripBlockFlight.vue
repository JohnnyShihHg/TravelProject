<script setup lang="ts">
import type { FlightBlockData } from '~/types/trip'

defineProps<{ data: FlightBlockData }>()
</script>

<template>
  <div class="rounded-xl border border-gray-100 p-5 shadow-sm">
    <div class="mb-3 flex items-center gap-2 text-gray-900">
      <UIcon name="i-lucide-plane" class="size-4 text-primary" />
      <span class="text-sm font-semibold">參考航班</span>
      <span class="text-xs text-gray-400">航班時間僅為參考，最終確定之使用航班以說明會資料為準</span>
    </div>

    <div class="space-y-3">
      <div v-for="(leg, i) in data.legs" :key="i" class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-gray-50 p-3 text-sm">
        <UBadge :color="leg.label === '去程' ? 'primary' : 'neutral'" variant="subtle">
          {{ leg.label }}
        </UBadge>
        <span class="text-xs text-gray-500">{{ leg.date }}</span>
        <span class="text-xs text-gray-500">{{ leg.airline }}</span>
        <div class="flex items-center gap-2 font-semibold text-gray-900">
          <span>{{ leg.departTime }}</span>
          <span class="text-xs font-normal text-gray-400">{{ leg.fromCode }} {{ leg.fromName }}</span>
          <UIcon name="i-lucide-arrow-right" class="size-3 text-gray-300" />
          <span>{{ leg.arriveTime }}</span>
          <span class="text-xs font-normal text-gray-400">{{ leg.toCode }} {{ leg.toName }}</span>
        </div>
        <span class="text-xs text-gray-400">飛行時間 {{ leg.duration }}</span>
      </div>
      <p v-if="!data.legs.length" class="text-xs text-gray-400">
        尚未設定航班資訊
      </p>
    </div>
  </div>
</template>
