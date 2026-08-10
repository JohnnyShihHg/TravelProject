<script setup lang="ts">
import type { Crumb } from '~/types/trip'

// 麵包屑同時服務兩件事：讓訪客知道自己在階層的哪裡，
// 以及建立 首頁 › 日本 › 京都 › 行程 的內部連結結構（Task #6 會再補上 JSON-LD）。
defineProps<{ items: Crumb[] }>()
</script>

<template>
  <nav aria-label="麵包屑" class="text-sm">
    <ol class="flex flex-wrap items-center gap-1 text-gray-500">
      <li v-for="(crumb, i) in items" :key="i" class="flex items-center gap-1">
        <UIcon v-if="i > 0" name="i-lucide-chevron-right" class="size-3.5 shrink-0 text-gray-300" />
        <NuxtLink
          v-if="crumb.to"
          :to="crumb.to"
          class="transition-colors hover:text-primary"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-else class="font-medium text-gray-900" aria-current="page">
          {{ crumb.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
