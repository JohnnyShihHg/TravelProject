<script setup lang="ts">
import type { CalendarBatch } from '~/types/trip'

const props = defineProps<{ batches: CalendarBatch[] }>()
const emit = defineEmits<{ selectDate: [date: string | null] }>()

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth()) // 0-indexed
const selectedDate = ref<string | null>(null)

const batchesByDate = computed(() => {
  const map = new Map<string, CalendarBatch[]>()
  for (const b of props.batches) {
    const list = map.get(b.departureDate) ?? []
    list.push(b)
    map.set(b.departureDate, list)
  }
  return map
})

const monthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`)

const weeks = computed(() => {
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()

  const cells: { date: string | null, day: number | null }[] = []
  for (let i = 0; i < startOffset; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date, day: d })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })

  const result: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
  return result
})

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- } else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ } else viewMonth.value++
}
function selectDate(date: string | null) {
  if (!date || !batchesByDate.value.has(date)) return
  selectedDate.value = selectedDate.value === date ? null : date
  emit('selectDate', selectedDate.value)
}
</script>

<template>
  <div class="rounded-xl border border-gray-100 bg-white/95 p-4 shadow-sm sm:p-6">
    <div class="mb-4 flex items-center justify-between">
      <!-- 只有圖示的按鈕一定要給 aria-label，否則螢幕閱讀器只會唸出「按鈕」 -->
      <UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" aria-label="上個月" @click="prevMonth" />
      <span class="text-sm font-semibold text-gray-900">{{ monthLabel }}</span>
      <UButton icon="i-lucide-chevron-right" color="neutral" variant="ghost" aria-label="下個月" @click="nextMonth" />
    </div>

    <div class="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
      <span v-for="d in ['日', '一', '二', '三', '四', '五', '六']" :key="d">{{ d }}</span>
    </div>

    <div v-for="(week, wi) in weeks" :key="wi" class="grid grid-cols-7 gap-1">
      <button
        v-for="(cell, ci) in week"
        :key="ci"
        type="button"
        class="flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors"
        :class="[
          cell.date && batchesByDate.has(cell.date) ? 'cursor-pointer font-semibold text-primary hover:bg-primary/10' : 'text-gray-700',
          cell.date === selectedDate ? 'bg-primary/15' : '',
          !cell.day ? 'invisible' : ''
        ]"
        :disabled="!cell.date || !batchesByDate.has(cell.date)"
        @click="selectDate(cell.date)"
      >
        <span>{{ cell.day }}</span>
        <span v-if="cell.date && batchesByDate.has(cell.date)" class="mt-0.5 size-1 rounded-full bg-primary" />
      </button>
    </div>

    <p class="mt-3 text-xs text-gray-400">
      標記日期為近期出團日，點選可篩選下方行程列表
    </p>
  </div>
</template>
