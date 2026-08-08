<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface ContactRow {
  id: number
  name: string
  phone: string | null
  email: string | null
  message: string
  createdAt: string
  interestedTripTitle: string | null
}

const { data: contacts } = await useFetch<ContactRow[]>('/api/admin/contacts')
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <UButton to="/admin" color="neutral" variant="link" icon="i-lucide-arrow-left" class="mb-4 px-0">
      返回後台
    </UButton>
    <h1 class="text-2xl font-bold text-gray-900">
      聯絡表單留言
    </h1>

    <div v-if="contacts?.length" class="mt-6 space-y-3">
      <div v-for="c in contacts" :key="c.id" class="rounded-xl border border-gray-100 p-4 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span class="font-medium text-gray-900">{{ c.name }}</span>
          <span class="text-xs text-gray-400">{{ c.createdAt }}</span>
        </div>
        <div class="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
          <span v-if="c.phone">{{ c.phone }}</span>
          <span v-if="c.email">{{ c.email }}</span>
          <span v-if="c.interestedTripTitle">有興趣：{{ c.interestedTripTitle }}</span>
        </div>
        <p class="mt-2 text-sm text-gray-700">
          {{ c.message }}
        </p>
      </div>
    </div>
    <p v-else class="mt-6 text-sm text-gray-500">
      目前沒有任何聯絡表單留言
    </p>
  </div>
</template>
