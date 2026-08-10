<script setup lang="ts">
import type { MediaLibraryItem } from '~/types/trip'

// 目的地與景點共用的封面挑選器。從既有媒體庫挑，不另外做上傳
// —— 上傳統一走圖片庫那一頁，避免同一件事有兩個入口、兩套行為。
const modelValue = defineModel<number | null>({ default: null })

const props = defineProps<{ library: MediaLibraryItem[] }>()

const open = ref(false)
const selected = computed(() => props.library.find(m => m.id === modelValue.value) ?? null)
</script>

<template>
  <div>
    <div class="flex items-start gap-3">
      <div class="size-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <img v-if="selected" :src="selected.url" class="size-full object-cover">
        <div v-else class="flex size-full items-center justify-center">
          <UIcon name="i-lucide-image-off" class="size-5 text-gray-300" />
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <UButton size="xs" color="neutral" variant="soft" @click="open = !open">
          {{ selected ? '更換封面' : '選擇封面' }}
        </UButton>
        <UButton v-if="selected" size="xs" color="neutral" variant="ghost" @click="modelValue = null">
          清除
        </UButton>
      </div>
    </div>

    <div v-if="open" class="mt-3 rounded-lg border border-gray-200 p-3">
      <div v-if="library.length" class="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto sm:grid-cols-8">
        <button
          v-for="m in library"
          :key="m.id"
          type="button"
          class="overflow-hidden rounded-md border-2 transition-colors"
          :class="modelValue === m.id ? 'border-primary' : 'border-transparent hover:border-gray-300'"
          @click="modelValue = m.id; open = false"
        >
          <img :src="m.url" class="aspect-square w-full object-cover">
        </button>
      </div>
      <p v-else class="text-xs text-gray-400">
        媒體庫還沒有照片，請先到「圖片庫」上傳。
      </p>
    </div>
  </div>
</template>
