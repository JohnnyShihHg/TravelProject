<script setup lang="ts">
export interface Stage {
  id: string
  label: string
  /** 這一階段算不算已填好。只是提示，不會阻止儲存或發布。 */
  done: boolean
}

const props = defineProps<{ stages: Stage[] }>()

const activeId = ref(props.stages[0]?.id ?? '')

// 目前階段直接從各區塊的實際位置算出來，不用 IntersectionObserver。
//
// 曾經用 observer + rootMargin，但它的 callback 只會收到「這次穿越門檻」的區塊，
// 不是全部區塊。往上捲時已經在畫面內的那一段狀態沒變、不會進 callback，
// 於是高亮會直接跳過它（實測：SEO 往上捲會跳過「照片」直接到「行程內容」）。
// 改成每次都用完整清單重算，就沒有這種部分更新的問題，也不需要另外處理捲到底。
const ACTIVATION_LINE = 120 // 與 sticky 階段列的高度一致：標題捲到這條線就算進入該階段

let frame = 0

function updateActive() {
  frame = 0
  if (props.stages.length === 0) return

  // 捲到底時強制選最後一段：最後一段可能太短，永遠無法把標題頂到判定線以上
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
  if (atBottom) {
    activeId.value = props.stages[props.stages.length - 1]!.id
    return
  }

  // 取「標題已經捲過判定線」的最後一段；都還沒捲到就維持第一段
  let current = props.stages[0]!.id
  for (const stage of props.stages) {
    const el = document.getElementById(stage.id)
    if (el && el.getBoundingClientRect().top <= ACTIVATION_LINE) current = stage.id
  }
  activeId.value = current
}

// 用 rAF 節流：捲動事件一秒可以觸發上百次，但畫面一秒最多更新 60 次
function onScroll() {
  if (frame) return
  frame = requestAnimationFrame(updateActive)
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  updateActive()
})
onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})

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
