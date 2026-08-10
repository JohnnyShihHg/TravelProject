<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface ContactRow {
  id: number
  name: string
  phone: string | null
  email: string | null
  message: string
  isRead: boolean
  createdAt: string
  interestedTripTitle: string | null
}

const { data: contacts, refresh } = await useFetch<ContactRow[]>('/api/admin/contacts')

const unreadCount = computed(() => (contacts.value ?? []).filter(c => !c.isRead).length)
const busyId = ref<number | null>(null)
const markingAll = ref(false)

async function toggleRead(c: ContactRow) {
  busyId.value = c.id
  try {
    await $fetch(`/api/admin/contacts/${c.id}`, { method: 'PATCH', body: { isRead: !c.isRead } })
    await refresh()
  } finally {
    busyId.value = null
  }
}

async function markAllRead() {
  markingAll.value = true
  try {
    await $fetch('/api/admin/contacts/read-all', { method: 'POST' })
    await refresh()
  } finally {
    markingAll.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          聯絡表單留言
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          {{ unreadCount ? `${unreadCount} 筆未讀` : '沒有未讀留言' }}
        </p>
      </div>
      <UButton
        v-if="unreadCount"
        color="neutral"
        variant="soft"
        icon="i-lucide-check-check"
        :loading="markingAll"
        @click="markAllRead"
      >
        全部標為已讀
      </UButton>
    </div>

    <div class="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div v-if="contacts?.length" class="space-y-3">
        <div
          v-for="c in contacts"
          :key="c.id"
          class="rounded-xl border p-4 transition-colors"
          :class="c.isRead ? 'border-gray-100' : 'border-primary/30 bg-primary/5'"
        >
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div class="flex items-center gap-2">
              <span v-if="!c.isRead" class="size-2 shrink-0 rounded-full bg-primary" aria-label="未讀" />
              <span class="font-medium text-gray-900">{{ c.name }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-400">{{ c.createdAt }}</span>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :loading="busyId === c.id"
                @click="toggleRead(c)"
              >
                {{ c.isRead ? '標為未讀' : '標為已讀' }}
              </UButton>
            </div>
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
      <p v-else class="py-8 text-center text-sm text-gray-400">
        目前沒有任何聯絡表單留言
      </p>
    </div>
  </div>
</template>
