<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image
  ],
  onUpdate: ({ editor: e }) => emit('update:modelValue', e.getHTML())
})

watch(() => props.modelValue, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, { emitUpdate: false })
  }
})

function run(action: (chain: ReturnType<NonNullable<typeof editor.value>['chain']>) => unknown) {
  if (!editor.value) return
  action(editor.value.chain().focus())
}

interface ToolbarButton {
  icon: string
  title: string
  active: () => boolean
  run: () => void
}

const buttons = computed<ToolbarButton[]>(() => {
  const e = editor.value
  if (!e) return []
  return [
    { icon: 'i-lucide-bold', title: '粗體', active: () => e.isActive('bold'), run: () => run(c => c.toggleBold().run()) },
    { icon: 'i-lucide-italic', title: '斜體', active: () => e.isActive('italic'), run: () => run(c => c.toggleItalic().run()) },
    { icon: 'i-lucide-underline', title: '底線', active: () => e.isActive('underline'), run: () => run(c => c.toggleUnderline().run()) },
    { icon: 'i-lucide-heading-2', title: '標題', active: () => e.isActive('heading', { level: 2 }), run: () => run(c => c.toggleHeading({ level: 2 }).run()) },
    { icon: 'i-lucide-list', title: '項目清單', active: () => e.isActive('bulletList'), run: () => run(c => c.toggleBulletList().run()) },
    { icon: 'i-lucide-list-ordered', title: '數字清單', active: () => e.isActive('orderedList'), run: () => run(c => c.toggleOrderedList().run()) },
    { icon: 'i-lucide-align-left', title: '靠左對齊', active: () => e.isActive({ textAlign: 'left' }), run: () => run(c => c.setTextAlign('left').run()) },
    { icon: 'i-lucide-align-center', title: '置中對齊', active: () => e.isActive({ textAlign: 'center' }), run: () => run(c => c.setTextAlign('center').run()) },
    { icon: 'i-lucide-align-right', title: '靠右對齊', active: () => e.isActive({ textAlign: 'right' }), run: () => run(c => c.setTextAlign('right').run()) },
    { icon: 'i-lucide-undo-2', title: '復原', active: () => false, run: () => run(c => c.undo().run()) },
    { icon: 'i-lucide-redo-2', title: '重做', active: () => false, run: () => run(c => c.redo().run()) }
  ]
})

// 插入圖片：這裡插入的圖片是內文自己的圖，跟行程底下的「相簿」（trip_images）是兩回事，
// 但共用同一個媒體庫，方便挑選已經上傳過的照片。
interface MediaItem {
  id: number
  url: string
  category: string | null
}

const imagePanelOpen = ref(false)
const library = ref<MediaItem[]>([])
const loadingLibrary = ref(false)
const uploading = ref(false)

async function openImagePanel() {
  imagePanelOpen.value = !imagePanelOpen.value
  if (imagePanelOpen.value && library.value.length === 0) {
    loadingLibrary.value = true
    try {
      library.value = await $fetch<MediaItem[]>('/api/admin/media')
    } finally {
      loadingLibrary.value = false
    }
  }
}

function insertImage(url: string) {
  run(c => c.setImage({ src: url }).run())
  imagePanelOpen.value = false
}

const fileInput = ref<HTMLInputElement>()
const uploadError = ref('')

function pickFile() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const created = await $fetch<MediaItem>('/api/admin/media', { method: 'POST', body: form })
    library.value = [created, ...library.value]
    insertImage(created.url)
  } catch (err) {
    uploadError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '上傳失敗'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="rounded-lg border border-gray-200">
    <div v-if="editor" class="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-1.5">
      <UButton
        v-for="btn in buttons"
        :key="btn.title"
        :icon="btn.icon"
        :title="btn.title"
        size="xs"
        :color="btn.active() ? 'primary' : 'neutral'"
        :variant="btn.active() ? 'soft' : 'ghost'"
        square
        @click="btn.run()"
      />
      <span class="mx-1 h-4 w-px bg-gray-200" />
      <UButton
        icon="i-lucide-image-plus"
        title="插入圖片"
        size="xs"
        :color="imagePanelOpen ? 'primary' : 'neutral'"
        :variant="imagePanelOpen ? 'soft' : 'ghost'"
        square
        @click="openImagePanel"
      />
    </div>

    <div v-if="imagePanelOpen" class="border-b border-gray-200 p-3">
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">從媒體庫選一張插入內文</span>
        <UButton size="xs" color="primary" variant="soft" :loading="uploading" @click="pickFile">
          上傳照片
        </UButton>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileSelected">
      </div>
      <p v-if="uploadError" class="mt-2 text-xs text-red-600">
        {{ uploadError }}
      </p>
      <p v-if="loadingLibrary" class="mt-2 text-xs text-gray-400">
        載入中…
      </p>
      <div v-else-if="library.length" class="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8">
        <button
          v-for="m in library"
          :key="m.id"
          type="button"
          class="overflow-hidden rounded-lg border border-gray-200 hover:ring-2 hover:ring-primary"
          @click="insertImage(m.url)"
        >
          <img :src="m.url" class="aspect-square w-full object-cover">
        </button>
      </div>
      <p v-else class="mt-2 text-xs text-gray-400">
        媒體庫還沒有照片，點右上角上傳一張
      </p>
    </div>

    <EditorContent :editor="editor" class="prose prose-sm max-w-none px-3 py-2" />
  </div>
</template>
