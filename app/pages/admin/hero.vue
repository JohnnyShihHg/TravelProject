<script setup lang="ts">
import type { HeroContent } from '~/types/trip'

definePageMeta({ layout: 'admin' })

const { data: hero } = await useFetch<HeroContent>('/api/hero')

const form = reactive({
  title: hero.value?.title ?? '',
  subtitle: hero.value?.subtitle ?? '',
  imageUrl: hero.value?.imageUrl ?? ''
})

const saving = ref(false)
const saved = ref(false)

async function save() {
  saving.value = true
  saved.value = false
  try {
    await $fetch('/api/admin/hero', { method: 'PUT', body: form })
    saved.value = true
  } finally {
    saving.value = false
  }
}

function randomizeImage() {
  form.imageUrl = `https://picsum.photos/seed/hero-${Date.now()}/1920/1080`
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10 sm:px-6">
    <UButton to="/admin" color="neutral" variant="link" icon="i-lucide-arrow-left" class="mb-4 px-0">
      返回後台
    </UButton>
    <h1 class="text-2xl font-bold text-gray-900">
      編輯首頁 Hero
    </h1>

    <form class="mt-6 space-y-5" @submit.prevent="save">
      <UFormField label="標題">
        <UInput v-model="form.title" class="w-full" />
      </UFormField>
      <UFormField label="副標">
        <UInput v-model="form.subtitle" class="w-full" />
      </UFormField>
      <UFormField label="背景圖片網址">
        <div class="flex gap-2">
          <UInput v-model="form.imageUrl" class="w-full" />
          <UButton color="neutral" variant="soft" @click="randomizeImage">
            隨機換圖（假資料）
          </UButton>
        </div>
      </UFormField>

      <div v-if="form.imageUrl" class="overflow-hidden rounded-lg">
        <img :src="form.imageUrl" class="h-40 w-full object-cover">
      </div>

      <UButton type="submit" color="primary" :loading="saving">
        儲存
      </UButton>
      <span v-if="saved" class="ml-3 text-sm text-green-600">已儲存</span>
    </form>
  </div>
</template>
