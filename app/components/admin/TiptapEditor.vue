<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] })
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
</script>

<template>
  <div class="rounded-lg border border-gray-200">
    <div v-if="editor" class="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-1.5">
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
    </div>
    <EditorContent :editor="editor" class="prose prose-sm max-w-none px-3 py-2" />
  </div>
</template>
