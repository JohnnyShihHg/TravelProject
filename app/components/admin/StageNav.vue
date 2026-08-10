<script setup lang="ts">
export interface Stage {
  id: string
  label: string
  /** 這一階段算不算已填好。只是提示，不會阻止儲存或發布。 */
  done: boolean
}

const props = defineProps<{ stages: Stage[] }>()

const activeId = ref(props.stages[0]?.id ?? '')
let observer: IntersectionObserver | null = null

// 用 IntersectionObserver 做捲動追蹤，不用 scroll 事件：
// scroll 事件要自己節流、還要算每個區塊的位置，捲動時容易掉幀。
// rootMargin 上緣往下推 120px，是為了讓「剛捲到標題」就切換，
// 而不是等整個區塊都進畫面才切。
onMounted(() => {
  const sections = props.stages
    .map(s => document.getElementById(s.id))
    .filter((el): el is HTMLElement => el !== null)
  if (sections.length === 0) return

  observer = new IntersectionObserver((entries) => {
    // 可能同時有多個區塊在畫面內，取最靠近頂端的那個當作目前階段
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
    if (visible[0]) activeId.value = visible[0].target.id
  }, { rootMargin: '-120px 0px -55% 0px', threshold: 0 })

  for (const el of sections) observer.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())

function goTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  // 扣掉固定在上方的階段列高度，否則捲過去會被它蓋住標題
  const top = el.getBoundingClientRect().top + window.scrollY - 100
  window.scrollTo({ top, behavior: 'smooth' })
  activeId.value = id
}

const doneCount = computed(() => props.stages.filter(s => s.done).length)
</script>

<template>
  <div class="sticky top-0 z-30 -mx-4 border-b border-gray-200 bg-white/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
    <div class="flex items-center gap-3 overflow-x-auto py-3">
      <button
        v-for="(stage, i) in stages"
        :key="stage.id"
        type="button"
        class="group flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors"
        :class="activeId === stage.id
          ? 'bg-gray-900 text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'"
        @click="goTo(stage.id)"
      >
        <span
          class="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors"
          :class="stage.done
            ? 'bg-primary text-white'
            : activeId === stage.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'"
        >
          <UIcon v-if="stage.done" name="i-lucide-check" class="size-3" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="whitespace-nowrap font-medium">{{ stage.label }}</span>
      </button>

      <span class="ml-auto shrink-0 whitespace-nowrap pl-3 text-xs text-gray-400">
        {{ doneCount }} / {{ stages.length }} 已填
      </span>
    </div>
  </div>
</template>
