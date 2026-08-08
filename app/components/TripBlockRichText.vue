<script setup lang="ts">
import type { RichTextBlockData } from '~/types/trip'

defineProps<{ data: RichTextBlockData }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="prose prose-sm max-w-none" v-html="data.html" />
</template>
