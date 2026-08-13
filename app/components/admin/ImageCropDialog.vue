<script setup lang="ts">
/**
 * 上傳前的拖拉裁切對話框。
 *
 * 刻意做成「吃一個 File，吐一個 File」＋ 一個 aspect 參數，不綁任何特定用途：
 * 目前只有首頁分享圖（og:image，1.91:1）在用，但四個上傳點（行程照片、Hero、
 * 內文插圖、媒體庫）的流程本來就都是
 *   使用者選的 File → resizeImageForUpload() → FormData → POST /api/admin/media
 * 裁切插在這條線的最前面，其他地方要接只需要傳自己的 aspect。
 *
 * ⚠️ 媒體庫的照片是共用資產（同一張會掛在多個行程、以不同比例顯示），
 * 所以裁切結果應該另存一張，不要覆蓋原圖 —— 呼叫端要自己遵守這件事。
 */

const props = withDefaults(defineProps<{
  /** 要裁切的原始檔案。傳 null 代表關閉 */
  file: File | null
  /** 裁切框的寬高比，例如 1200/630。預設 1:1 */
  aspect?: number
  /** 輸出的目標寬度，高度由 aspect 推算。不傳就用裁切框的實際像素 */
  outputWidth?: number
  title?: string
  /** 顯示在對話框底部的說明，通常寫上目標尺寸 */
  hint?: string
}>(), {
  aspect: 1,
  outputWidth: undefined,
  title: '裁切圖片',
  hint: ''
})

const emit = defineEmits<{ cropped: [file: File], cancel: [] }>()

const imgEl = ref<HTMLImageElement>()
const frameEl = ref<HTMLDivElement>()
const objectUrl = ref('')
const naturalSize = ref({ width: 0, height: 0 })

/**
 * 裁切框以「顯示後的圖片」為座標系，單位是 px。
 * 存顯示座標而不是原圖座標，是因為拖拉時每一幀都要換算回顯示座標才能畫出來；
 * 只有最後輸出那一次需要換算成原圖座標，換算一次比每幀換算便宜也不容易累積誤差。
 */
const crop = ref({ x: 0, y: 0, width: 0, height: 0 })
const displaySize = ref({ width: 0, height: 0 })

watch(() => props.file, (file) => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = file ? URL.createObjectURL(file) : ''
}, { immediate: true })

onBeforeUnmount(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

/** 圖片載入完成後，放一個置中、盡可能大的裁切框當起點 */
function onImageLoad() {
  const img = imgEl.value
  if (!img) return
  naturalSize.value = { width: img.naturalWidth, height: img.naturalHeight }
  displaySize.value = { width: img.clientWidth, height: img.clientHeight }
  resetCrop()
}

function resetCrop() {
  const { width: dw, height: dh } = displaySize.value
  if (!dw || !dh) return

  // 先假設寬度填滿，高度不夠再反過來以高度為準 —— 這樣不管圖是橫的還是直的
  // 都會得到「塞得進畫面的最大裁切框」
  let w = dw
  let h = w / props.aspect
  if (h > dh) {
    h = dh
    w = h * props.aspect
  }
  crop.value = { x: (dw - w) / 2, y: (dh - h) / 2, width: w, height: h }
}

/** 把裁切框夾在圖片範圍內，拖出界時貼齊邊緣而不是被擋住不能動 */
function clampPosition(x: number, y: number) {
  const { width: dw, height: dh } = displaySize.value
  return {
    x: Math.min(Math.max(0, x), dw - crop.value.width),
    y: Math.min(Math.max(0, y), dh - crop.value.height)
  }
}

type DragMode = 'move' | 'resize'
let dragMode: DragMode | null = null
let dragStart = { pointerX: 0, pointerY: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 }

function onPointerDown(e: PointerEvent, mode: DragMode) {
  e.preventDefault()
  e.stopPropagation()
  dragMode = mode
  dragStart = {
    pointerX: e.clientX,
    pointerY: e.clientY,
    cropX: crop.value.x,
    cropY: crop.value.y,
    cropW: crop.value.width,
    cropH: crop.value.height
  }
  // 指標事件抓在啟動元素上，拖到框外甚至視窗外都還收得到移動事件
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragMode) return
  const dx = e.clientX - dragStart.pointerX
  const dy = e.clientY - dragStart.pointerY

  if (dragMode === 'move') {
    crop.value = { ...crop.value, ...clampPosition(dragStart.cropX + dx, dragStart.cropY + dy) }
    return
  }

  // 縮放一律以左上角為錨點，並且強制維持 aspect：寬度是使用者實際拖的量，
  // 高度直接由 aspect 算出來，這樣框永遠不可能歪掉。
  const { width: dw, height: dh } = displaySize.value
  const maxW = Math.min(dw - dragStart.cropX, (dh - dragStart.cropY) * props.aspect)
  const width = Math.min(Math.max(40, dragStart.cropW + dx), maxW)
  crop.value = { ...crop.value, width, height: width / props.aspect }
}

function onPointerUp() {
  dragMode = null
}

const cropping = ref(false)

async function confirm() {
  const img = imgEl.value
  if (!img || cropping.value) return
  cropping.value = true
  try {
    // 顯示座標 → 原圖座標。圖片被 CSS 縮放過，兩者的比例就是縮放倍率。
    const scale = naturalSize.value.width / displaySize.value.width
    const sx = crop.value.x * scale
    const sy = crop.value.y * scale
    const sw = crop.value.width * scale
    const sh = crop.value.height * scale

    // 沒指定輸出寬度就用裁下來的原始像素，但不放大 —— 放大只會變模糊、檔案還更大
    const outW = Math.round(props.outputWidth ? Math.min(props.outputWidth, sw) : sw)
    const outH = Math.round(outW / props.aspect)

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('無法建立 canvas')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/webp', 0.9)
    )
    if (!blob) throw new Error('裁切失敗')

    const name = (props.file?.name ?? 'image').replace(/\.[^.]+$/, '')
    emit('cropped', new File([blob], `${name}-crop.webp`, { type: 'image/webp' }))
  } finally {
    cropping.value = false
  }
}

const outputLabel = computed(() => {
  if (!props.outputWidth) return ''
  return `${props.outputWidth}×${Math.round(props.outputWidth / props.aspect)}`
})
</script>

<template>
  <UModal :open="!!file" :title="title" @update:open="!$event && emit('cancel')">
    <template #body>
      <div class="space-y-4">
        <!--
          select-none + touch-none：拖拉時瀏覽器預設會選取圖片、或在手機上把整頁捲走，
          兩者都會讓裁切框拖到一半失控
        -->
        <div
          ref="frameEl"
          class="relative mx-auto max-h-[60vh] w-fit touch-none select-none overflow-hidden rounded-lg bg-gray-900"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <img
            v-if="objectUrl"
            ref="imgEl"
            :src="objectUrl"
            alt=""
            class="max-h-[60vh] w-auto"
            draggable="false"
            @load="onImageLoad"
          >

          <!-- 框外壓暗，讓使用者一眼看出哪一塊會被保留 -->
          <div
            v-if="crop.width"
            class="pointer-events-none absolute inset-0 bg-black/50"
            :style="{
              clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                ${crop.x}px ${crop.y}px,
                ${crop.x}px ${crop.y + crop.height}px,
                ${crop.x + crop.width}px ${crop.y + crop.height}px,
                ${crop.x + crop.width}px ${crop.y}px,
                ${crop.x}px ${crop.y}px)`
            }"
          />

          <div
            v-if="crop.width"
            class="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.4)]"
            :style="{ left: `${crop.x}px`, top: `${crop.y}px`, width: `${crop.width}px`, height: `${crop.height}px` }"
            @pointerdown="onPointerDown($event, 'move')"
          >
            <!-- 右下角的縮放把手。做大一點（16px）手機才點得到 -->
            <div
              class="absolute -bottom-2 -right-2 size-4 cursor-se-resize rounded-full border-2 border-gray-900 bg-white"
              @pointerdown="onPointerDown($event, 'resize')"
            />
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 text-xs text-gray-500">
          <p>{{ hint || '拖曳方框移動位置，拉右下角圓點調整大小。' }}</p>
          <UButton size="xs" color="neutral" variant="ghost" @click="resetCrop">
            重設
          </UButton>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <p class="text-xs text-gray-400">
          <template v-if="outputLabel">輸出 {{ outputLabel }}</template>
        </p>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" @click="emit('cancel')">
            取消
          </UButton>
          <UButton color="primary" :loading="cropping" @click="confirm">
            裁切並上傳
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
