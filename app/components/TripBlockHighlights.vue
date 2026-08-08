<script setup lang="ts">
import type { RichTextBlockData } from '~/types/trip'

defineProps<{ data: RichTextBlockData }>()
</script>

<template>
  <div class="rounded-xl border border-primary/20 bg-primary/5 p-5">
    <div class="mb-2 flex items-center gap-2 text-primary">
      <UIcon name="i-lucide-sparkles" class="size-4" />
      <span class="text-sm font-semibold">行程亮點</span>
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="prose prose-sm max-w-none" v-html="data.html" />
  </div>
</template>
