<script setup lang="ts">
// 後台共用的刪除二次確認。不使用瀏覽器原生 confirm/alert：
// 原生對話框樣式無法統一，而且會阻塞整個頁面的事件迴圈。
const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{
  title?: string
  description?: string
  message?: string
  confirmLabel?: string
  loading?: boolean
}>(), {
  title: '確認刪除',
  description: '此動作無法復原',
  message: '',
  confirmLabel: '確定刪除',
  loading: false
})

const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #body>
      <slot>
        <p class="text-sm text-gray-600">
          {{ message }}
        </p>
      </slot>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="soft" :disabled="loading" @click="open = false">
          取消
        </UButton>
        <UButton color="error" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
