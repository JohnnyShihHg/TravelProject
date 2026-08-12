<script setup lang="ts">
import type { ContentBlock, ContentBlockType, ContentSnippet, BlockData } from '~/types/trip'

const props = defineProps<{ tripId: number, blocks: ContentBlock[] }>()
const emit = defineEmits<{ refresh: [] }>()

const BLOCK_LABELS: Record<ContentBlockType, { label: string, icon: string }> = {
  richtext: { label: '文字段落', icon: 'i-lucide-text' },
  highlights: { label: '行程亮點', icon: 'i-lucide-sparkles' },
  flight: { label: '參考航班', icon: 'i-lucide-plane' },
  daily_itinerary: { label: '每日行程', icon: 'i-lucide-calendar-days' }
}
const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as ContentBlockType[]

const sortedBlocks = computed(() => [...props.blocks].sort((a, b) => a.sortOrder - b.sortOrder))

// 引用模式的區塊不可在這裡編輯（要改就去範本庫改，改一次全部引用處一起更新）。
// snippets 清單已經為了下方「插入範本」面板抓過了，這裡直接拿來對照名稱。
function snippetName(block: ContentBlock) {
  return snippets.value?.find(s => s.id === block.snippetId)?.name ?? '（範本已被刪除，改成可自行編輯的空白內容）'
}

const expandedId = ref<number | null>(null)
const drafts = reactive<Record<number, BlockData>>({})
const saving = ref<number | null>(null)

function preview(block: ContentBlock) {
  if (block.type === 'richtext' || block.type === 'highlights') {
    const html = (block.data as { html: string }).html
    return html.replace(/<[^>]*>/g, ' ').trim().slice(0, 40) || '（空白）'
  }
  if (block.type === 'flight') {
    const legs = (block.data as { legs: unknown[] }).legs
    return `${legs.length} 段航班`
  }
  if (block.type === 'daily_itinerary') {
    const days = (block.data as { days: unknown[] }).days
    return `${days.length} 天行程`
  }
  return ''
}

function toggleExpand(block: ContentBlock) {
  if (expandedId.value === block.id) {
    expandedId.value = null
    return
  }
  drafts[block.id] = structuredClone(block.data)
  expandedId.value = block.id
}

async function saveBlock(block: ContentBlock) {
  saving.value = block.id
  try {
    // 引用模式沒有「這個行程自己的版本」——編輯它就是編輯範本本身，
    // 存進 content_snippets 才會讓所有引用這個範本的行程一起更新。
    if (block.snippetId) {
      await $fetch(`/api/admin/snippets/${block.snippetId}`, { method: 'PATCH', body: { data: drafts[block.id] } })
      await refreshSnippets()
    } else {
      await $fetch(`/api/admin/blocks/${block.id}`, { method: 'PATCH', body: { data: drafts[block.id] } })
    }
    emit('refresh')
  } finally {
    saving.value = null
  }
}

// 刪除確認（區塊與範本共用同一個對話框）
const confirmOpen = ref(false)
const confirming = ref(false)
const confirmMessage = ref('')
let confirmAction: (() => Promise<void>) | null = null

function askConfirm(message: string, action: () => Promise<void>) {
  confirmMessage.value = message
  confirmAction = action
  confirmOpen.value = true
}

async function runConfirm() {
  if (!confirmAction) return
  confirming.value = true
  try {
    await confirmAction()
    confirmOpen.value = false
    confirmAction = null
  } finally {
    confirming.value = false
  }
}

function removeBlock(block: ContentBlock) {
  askConfirm('確定要刪除這個區塊嗎？此動作無法復原。', async () => {
    await $fetch(`/api/admin/blocks/${block.id}`, { method: 'DELETE' })
    emit('refresh')
  })
}

async function move(block: ContentBlock, direction: -1 | 1) {
  const ids = sortedBlocks.value.map(b => b.id)
  const index = ids.indexOf(block.id)
  const target = index + direction
  if (target < 0 || target >= ids.length) return
  const temp = ids[index]!
  ids[index] = ids[target]!
  ids[target] = temp
  await $fetch(`/api/admin/trips/${props.tripId}/blocks/reorder`, { method: 'POST', body: { blockIds: ids } })
  emit('refresh')
}

async function saveAsSnippet(block: ContentBlock) {
  const name = prompt('範本名稱（例如：出國旅遊安全須知）')
  if (!name?.trim()) return
  // 用 confirm 而不是額外做一個小 modal：只有兩個選項，跟現有 prompt() 的簡陋程度一致，
  // 不需要為這個決策點另外設計 UI 元件。
  const asReference = confirm(
    '要設成「共用範本」嗎？\n\n'
    + '共用範本：之後在任何行程編輯這個範本，所有用到它的地方會一起更新（適合退稅說明、取消政策這類制式條款）。\n'
    + '一般範本：插入後各自獨立，之後修改互不影響（適合每日行程骨架這類起手模板）。\n\n'
    + '按「確定」= 共用範本，按「取消」= 一般範本'
  )
  await $fetch('/api/admin/snippets', {
    method: 'POST',
    body: { name: name.trim(), type: block.type, data: drafts[block.id] ?? block.data, mode: asReference ? 'reference' : 'copy' }
  })
  await refreshSnippets()
}

const addPanelOpen = ref(false)

async function createBlock(type: ContentBlockType) {
  const created = await $fetch<ContentBlock>(`/api/admin/trips/${props.tripId}/blocks`, { method: 'POST', body: { type } })
  emit('refresh')
  addPanelOpen.value = false
  drafts[created.id] = structuredClone(created.data)
  expandedId.value = created.id
}

const { data: snippets, refresh: refreshSnippets } = await useFetch<ContentSnippet[]>('/api/admin/snippets')

async function insertSnippet(snippet: ContentSnippet) {
  await $fetch(`/api/admin/trips/${props.tripId}/blocks/from-snippet`, { method: 'POST', body: { snippetId: snippet.id } })
  emit('refresh')
  addPanelOpen.value = false
}

function deleteSnippet(snippet: ContentSnippet) {
  askConfirm(`確定要從範本庫刪除「${snippet.name}」嗎？此動作無法復原。`, async () => {
    await $fetch(`/api/admin/snippets/${snippet.id}`, { method: 'DELETE' })
    await refreshSnippets()
  })
}
</script>

<template>
  <div class="space-y-3">
    <div v-for="block in sortedBlocks" :key="block.id" class="rounded-lg border border-gray-200">
      <div class="flex flex-wrap items-center gap-2 p-3">
        <UIcon :name="BLOCK_LABELS[block.type].icon" class="size-4 shrink-0 text-primary" />
        <span class="shrink-0 text-xs font-semibold text-gray-900">{{ BLOCK_LABELS[block.type].label }}</span>
        <UBadge v-if="block.snippetId" color="info" variant="subtle" size="sm" icon="i-lucide-link" class="shrink-0">
          引用自範本：{{ snippetName(block) }}
        </UBadge>
        <span class="w-full min-w-0 text-xs text-gray-400 sm:w-auto sm:flex-1 sm:truncate">{{ preview(block) }}</span>
        <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-up" square @click="move(block, -1)" />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-down" square @click="move(block, 1)" />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :icon="expandedId === block.id ? 'i-lucide-chevron-up' : 'i-lucide-pencil'"
            @click="toggleExpand(block)"
          >
            {{ expandedId === block.id ? '收合' : (block.snippetId ? '編輯範本' : '編輯') }}
          </UButton>
          <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" square @click="removeBlock(block)" />
        </div>
      </div>

      <div v-if="expandedId === block.id" class="border-t border-gray-100 p-3">
        <!-- 引用模式沒有「這個行程自己的版本」，編輯它就是編輯範本，其他引用處會一起變 -->
        <p v-if="block.snippetId" class="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          正在編輯共用範本「{{ snippetName(block) }}」，儲存後所有用到它的行程會一起更新。
        </p>

        <AdminBlockEditorRichText v-if="block.type === 'richtext' || block.type === 'highlights'" v-model="(drafts[block.id] as any)" />
        <AdminBlockEditorFlight v-else-if="block.type === 'flight'" v-model="(drafts[block.id] as any)" />
        <AdminBlockEditorDailyItinerary v-else-if="block.type === 'daily_itinerary'" v-model="(drafts[block.id] as any)" />

        <div class="mt-3 flex flex-wrap gap-2">
          <UButton size="xs" color="primary" :loading="saving === block.id" @click="saveBlock(block)">
            {{ block.snippetId ? '儲存範本' : '儲存區塊' }}
          </UButton>
          <!-- 引用模式本身已經是範本了，「另存為範本」在這裡沒有意義 -->
          <UButton v-if="!block.snippetId" size="xs" color="neutral" variant="soft" @click="saveAsSnippet(block)">
            另存為範本
          </UButton>
        </div>
      </div>
    </div>

    <p v-if="!sortedBlocks.length" class="text-xs text-gray-400">
      尚無任何內容區塊，點下方按鈕新增
    </p>

    <div class="rounded-lg border border-dashed border-gray-300 p-3">
      <UButton size="xs" color="neutral" variant="soft" @click="addPanelOpen = !addPanelOpen">
        ＋新增區塊
      </UButton>

      <div v-if="addPanelOpen" class="mt-3 space-y-3">
        <div class="flex flex-wrap gap-2">
          <UButton v-for="type in BLOCK_TYPES" :key="type" size="xs" color="neutral" variant="outline" :icon="BLOCK_LABELS[type].icon" @click="createBlock(type)">
            {{ BLOCK_LABELS[type].label }}
          </UButton>
        </div>

        <div v-if="snippets?.length">
          <p class="mb-1 text-xs text-gray-400">
            或從範本庫插入：
          </p>
          <div class="flex flex-wrap gap-2">
            <div v-for="snippet in snippets" :key="snippet.id" class="flex items-center gap-1 rounded-full border border-gray-200 pl-3 pr-1 text-xs">
              <button type="button" class="py-1 hover:text-primary" @click="insertSnippet(snippet)">
                {{ snippet.name }}
              </button>
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" square @click="deleteSnippet(snippet)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <AdminConfirmDialog
      v-model:open="confirmOpen"
      :message="confirmMessage"
      :loading="confirming"
      @confirm="runConfirm"
    />
  </div>
</template>
