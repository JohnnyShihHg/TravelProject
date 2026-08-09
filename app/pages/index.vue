<script setup lang="ts">
import type { HeroChoice } from '~/types/trip'

const selected = ref<HeroChoice | null>(null)

// 手機版的展開內容是接在入口列裡面（手風琴），只有桌機才渲染在 hero 下方
const isDesktop = useIsDesktop()
</script>

<template>
  <div>
    <HeroSection v-model:selected="selected" />

    <HeroExploreSection v-if="selected && isDesktop" :choice="selected" />

    <TrendingSection />
  </div>
</template>
