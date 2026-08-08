<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit],
  onUpdate: ({ editor: e }) => emit('update:modelValue', e.getHTML())
})

watch(() => props.modelValue, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, { emitUpdate: false })
  }
})

function toggle(action: () => void) {
  action()
  editor.value?.chain().focus().run()
}
</script>

<template>
  <div class="rounded-lg border border-gray-200">
    <div v-if="editor" class="flex flex-wrap gap-1 border-b border-gray-200 p-2">
      <UButton size="xs" :color="editor.isActive('bold') ? 'primary' : 'neutral'" variant="soft" @click="toggle(() => editor!.chain().focus().toggleBold().run())">
        粗體
      </UButton>
      <UButton size="xs" :color="editor.isActive('heading', { level: 2 }) ? 'primary' : 'neutral'" variant="soft" @click="toggle(() => editor!.chain().focus().toggleHeading({ level: 2 }).run())">
        標題
      </UButton>
      <UButton size="xs" :color="editor.isActive('bulletList') ? 'primary' : 'neutral'" variant="soft" @click="toggle(() => editor!.chain().focus().toggleBulletList().run())">
        清單
      </UButton>
      <UButton size="xs" color="neutral" variant="soft" @click="toggle(() => editor!.chain().focus().undo().run())">
        復原
      </UButton>
    </div>
    <EditorContent :editor="editor" class="prose prose-sm max-w-none px-3 py-2" />
  </div>
</template>
