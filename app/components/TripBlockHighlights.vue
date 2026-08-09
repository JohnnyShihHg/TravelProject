<script setup lang="ts">
import type { RichTextBlockData } from '~/types/trip'

defineProps<{ data: RichTextBlockData }>()
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-center gap-2 text-gray-900">
      <UIcon name="i-lucide-sparkles" class="size-5 text-primary sm:size-6" />
      <span class="text-xl font-semibold sm:text-2xl">行程亮點</span>
    </div>

    <div class="rounded-xl border border-primary/20 bg-primary/5 p-5">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="prose prose-base max-w-none" v-html="data.html" />
    </div>
  </div>
</template>
