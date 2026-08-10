<script setup lang="ts">
interface AdminTag {
  id: number
  slug: string
  name: string
  tripCount: number
}

definePageMeta({ layout: 'admin' })

const { data: tags, refresh } = await useFetch<AdminTag[]>('/api/admin/tags')

const newName = ref('')
const creating = ref(false)
const createError = ref('')

async function createTag() {
  const name = newName.value.trim()
  if (!name) return
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/admin/tags', { method: 'POST', body: { name } })
    newName.value = ''
    await refresh()
  } catch (err) {
    createError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '新增失敗'
  } finally {
    creating.value = false
  }
}

// 就地編輯：標籤只有名稱與 slug 兩個欄位，開 modal 反而囉嗦
const editingId = ref<number | null>(null)
const editForm = reactive({ name: '', slug: '' })
const savingId = ref<number | null>(null)
const rowError = ref('')

function startEdit(tag: AdminTag) {
  editingId.value = tag.id
  rowError.value = ''
  editForm.name = tag.name
  editForm.slug = tag.slug
}

async function saveEdit(tag: AdminTag) {
  savingId.value = tag.id
  rowError.value = ''
  try {
    await $fetch(`/api/admin/tags/${tag.id}`, {
      method: 'PATCH',
      body: { name: editForm.name, slug: editForm.slug }
    })
    editingId.value = null
    await refresh()
  } catch (err) {
    rowError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '儲存失敗'
  } finally {
    savingId.value = null
  }
}

const deleteTarget = ref<AdminTag | null>(null)
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

function askDelete(tag: AdminTag) {
  deleteTarget.value = tag
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/admin/tags/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    deleteTarget.value = null
    await refresh()
  } catch (err) {
    deleteError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '刪除失敗'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-8">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">
        主題標籤
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        賞櫻、親子、美食這類主題。地點與景點各自有獨立的管理頁，不放在這裡。
      </p>
    </div>

    <div class="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="newName"
          placeholder="新標籤名稱"
          class="w-full sm:w-56"
          @keyup.enter="createTag"
        />
        <UButton color="primary" :loading="creating" @click="createTag">
          新增標籤
        </UButton>
      </div>
      <p v-if="createError" class="mt-2 text-sm text-red-600">
        {{ createError }}
      </p>
      <p class="mt-2 text-xs text-gray-400">
        中文名稱會自動產生一組暫時的網址代稱，可以在下方改成有意義的英文。
      </p>

      <div class="mt-5 divide-y divide-gray-100">
        <div v-for="tag in tags ?? []" :key="tag.id" class="py-3">
          <div v-if="editingId === tag.id" class="flex flex-wrap items-end gap-2">
            <UFormField label="名稱">
              <UInput v-model="editForm.name" size="sm" class="w-36" />
            </UFormField>
            <UFormField label="網址代稱">
              <UInput v-model="editForm.slug" size="sm" class="w-44" />
            </UFormField>
            <UButton size="sm" color="primary" :loading="savingId === tag.id" @click="saveEdit(tag)">
              儲存
            </UButton>
            <UButton size="sm" color="neutral" variant="ghost" @click="editingId = null">
              取消
            </UButton>
          </div>

          <div v-else class="flex flex-wrap items-center gap-3">
            <span class="font-medium text-gray-900">{{ tag.name }}</span>
            <span class="font-mono text-xs text-gray-400">{{ tag.slug }}</span>
            <span class="text-xs text-gray-400">
              {{ tag.tripCount ? `${tag.tripCount} 個行程使用中` : '未使用' }}
            </span>
            <div class="ml-auto flex gap-2">
              <UButton size="xs" color="neutral" variant="soft" @click="startEdit(tag)">
                編輯
              </UButton>
              <UButton size="xs" color="error" variant="ghost" @click="askDelete(tag)">
                刪除
              </UButton>
            </div>
          </div>
        </div>

        <p v-if="!(tags ?? []).length" class="py-10 text-center text-sm text-gray-400">
          尚無標籤
        </p>
      </div>

      <p v-if="rowError" class="mt-3 text-sm text-red-600">
        {{ rowError }}
      </p>
    </div>

    <AdminConfirmDialog v-model:open="deleteOpen" title="刪除標籤" :loading="deleting" @confirm="confirmDelete">
      <p class="text-sm text-gray-600">
        確定要刪除「<span class="font-medium text-gray-900">{{ deleteTarget?.name }}</span>」嗎？
      </p>
      <p v-if="deleteError" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {{ deleteError }}
      </p>
    </AdminConfirmDialog>
  </div>
</template>
