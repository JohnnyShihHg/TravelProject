<script setup lang="ts">
import type { RichTextBlockData } from '~/types/trip'

const props = defineProps<{ modelValue: RichTextBlockData }>()
const emit = defineEmits<{ 'update:modelValue': [value: RichTextBlockData] }>()

const html = computed({
  get: () => props.modelValue.html,
  set: (value: string) => emit('update:modelValue', { html: value })
})
</script>

<template>
  <AdminTiptapEditor v-model="html" />
</template>
