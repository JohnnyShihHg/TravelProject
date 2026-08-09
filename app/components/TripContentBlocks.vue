<script setup lang="ts">
import type { ContentBlock } from '~/types/trip'

defineProps<{ blocks: ContentBlock[] }>()
</script>

<template>
  <div class="space-y-8">
    <template v-for="block in blocks" :key="block.id">
      <!-- 參考航班固定顯示在出團梯次下方，這裡略過避免重複 -->
      <TripBlockHighlights v-if="block.type === 'highlights'" :data="block.data as any" />
      <TripBlockDailyItinerary v-else-if="block.type === 'daily_itinerary'" :data="block.data as any" />
      <TripBlockRichText v-else-if="block.type !== 'flight'" :data="block.data as any" />
    </template>
  </div>
</template>
