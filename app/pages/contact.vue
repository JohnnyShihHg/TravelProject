<script setup lang="ts">
import type { TripSummary, HeroContent } from '~/types/trip'

const { data: hero } = await useFetch<HeroContent>('/api/hero', {
  key: 'hero-contact',
  query: { page: 'contact' }
})

usePageSeo({
  title: '聯絡我們',
  description: '想詢問行程細節、包團或機票代訂？留下聯絡方式，無穹旅行社會盡快與你聯繫。',
  path: '/contact'
})

const route = useRoute()
const { data: trips } = await useFetch<TripSummary[]>('/api/trips')

const form = reactive({
  name: '',
  phone: '',
  email: '',
  interestedTripId: route.query.trip ? Number(route.query.trip) : undefined as number | undefined,
  // 首頁 hero 的「機票」選項會帶 topic 進來，先幫使用者填好詢問主題
  message: typeof route.query.topic === 'string' ? `我想詢問${route.query.topic}相關服務：` : ''
})

const submitting = ref(false)
const submitted = ref(false)
const errorMessage = ref('')

const tripOptions = computed(() => [
  { label: '（未指定特定行程）', value: undefined },
  ...(trips.value ?? []).map(t => ({ label: t.title, value: t.id }))
])

async function submit() {
  errorMessage.value = ''
  submitting.value = true
  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    submitted.value = true
  } catch (e) {
    errorMessage.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '送出失敗，請稍後再試'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <!-- hero 高度跟首頁 hero 一致 -->
    <div class="relative min-h-[560px] overflow-hidden sm:min-h-[680px]">
      <HeroCarousel :images="hero?.images ?? []" alt="聯絡無穹旅行社" dots-class="bottom-6" />
      <!-- 後台還沒放圖時的底色，不然白底白字 -->
      <div v-if="!hero?.images?.length" class="absolute inset-0 bg-gradient-to-br from-teal-800 via-sky-800 to-blue-900" />
      <div class="absolute inset-0 bg-black/30" />
      <div class="absolute inset-0 flex items-center justify-center pt-16">
        <h1 class="text-3xl font-bold text-white sm:text-4xl">
          聯絡我們
        </h1>
      </div>
    </div>

    <div class="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div v-if="submitted" class="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <UIcon name="i-lucide-check-circle" class="mx-auto size-8 text-green-600" />
        <p class="mt-3 text-sm font-medium text-green-800">
          已收到您的訊息，我們會盡快與您聯繫！
        </p>
      </div>

      <form v-else class="space-y-5" @submit.prevent="submit">
        <p class="text-sm text-gray-500">
          留下您的聯絡方式與想諮詢的行程，我們會盡快與您聯繫。
        </p>

        <UFormField label="姓名" required>
          <UInput v-model="form.name" placeholder="您的姓名" class="w-full" />
        </UFormField>

        <UFormField label="聯絡電話">
          <UInput v-model="form.phone" placeholder="0900-000-000" class="w-full" />
        </UFormField>

        <UFormField label="Email">
          <UInput v-model="form.email" type="email" placeholder="you@example.com" class="w-full" />
        </UFormField>

        <p class="text-xs text-gray-400">
          電話與 Email 請至少填寫一項
        </p>

        <UFormField label="有興趣的行程">
          <USelect
            v-model="form.interestedTripId"
            :items="tripOptions"
            placeholder="選擇行程（可略過）"
            class="w-full"
          />
        </UFormField>

        <UFormField label="留言內容" required>
          <UTextarea v-model="form.message" :rows="5" placeholder="請留下您的問題或需求" class="w-full" />
        </UFormField>

        <p v-if="errorMessage" class="text-sm text-red-600">
          {{ errorMessage }}
        </p>

        <UButton type="submit" color="primary" size="lg" block :loading="submitting">
          送出
        </UButton>
      </form>
    </div>
  </div>
</template>
