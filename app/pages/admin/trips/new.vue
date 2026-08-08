<script setup lang="ts">
import type { TripTag } from '~/types/trip'

const router = useRouter()
const { data: allTags } = await useFetch<TripTag[]>('/api/tags')

const form = reactive({
  title: '',
  slug: '',
  summary: '',
  days: 3,
  content: '',
  tagNames: [] as string[]
})

const saving = ref(false)
const errorMessage = ref('')

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const trip = await $fetch<{ id: number }>('/api/admin/trips', { method: 'POST', body: form })
    router.push(`/admin/trips/${trip.id}`)
  } catch (e) {
    errorMessage.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '建立失敗'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10 sm:px-6">
    <UButton to="/admin" color="neutral" variant="link" icon="i-lucide-arrow-left" class="mb-4 px-0">
      返回後台
    </UButton>
    <h1 class="text-2xl font-bold text-gray-900">
      新增行程
    </h1>
    <p class="mt-1 text-sm text-gray-500">
      建立後會先存為草稿，儲存後可以繼續編輯梯次與照片，確認沒問題再發布。
    </p>

    <form class="mt-6 space-y-5" @submit.prevent="create">
      <UFormField label="行程標題" required>
        <UInput v-model="form.title" class="w-full" />
      </UFormField>
      <UFormField label="網址代稱（slug，留空自動產生）">
        <UInput v-model="form.slug" placeholder="例如 tokyo-sakura-5days" class="w-full" />
      </UFormField>
      <UFormField label="簡介">
        <UTextarea v-model="form.summary" :rows="2" class="w-full" />
      </UFormField>
      <UFormField label="天數">
        <UInput v-model.number="form.days" type="number" min="1" class="w-32" />
      </UFormField>
      <UFormField label="標籤">
        <div class="flex flex-wrap gap-2">
          <label v-for="tag in allTags" :key="tag.id" class="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs">
            <input v-model="form.tagNames" type="checkbox" :value="tag.name">
            {{ tag.name }}
          </label>
        </div>
      </UFormField>
      <UFormField label="行程內容">
        <AdminTiptapEditor v-model="form.content" />
      </UFormField>

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <UButton type="submit" color="primary" :loading="saving">
        建立行程
      </UButton>
    </form>
  </div>
</template>
