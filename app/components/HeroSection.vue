<script setup lang="ts">
import type { HeroContent, HeroChoice } from '~/types/trip'

// 四頁的 hero 各自一組快取（key 不同），不要共用同一格，否則會拿到別頁的圖
const { data: hero } = await useFetch<HeroContent>('/api/hero', {
  key: 'hero-home',
  query: { page: 'home' }
})

// 選中的入口由首頁持有，桌機版要展開的區塊在 hero 外面
const selected = defineModel<HeroChoice | null>('selected', { default: null })

const isDesktop = useIsDesktop()

const options: { value: HeroChoice, label: string, hint: string }[] = [
  { value: 'domestic', label: '國內線', hint: '台灣在地小旅行' },
  { value: 'overseas', label: '國外線', hint: '日本、韓國等海外行程' },
  { value: 'flight', label: '機票', hint: '機票代訂諮詢' },
  { value: 'theme', label: '主題挑選', hint: '依旅遊主題探索' }
]

const HEADER_HEIGHT = 64

const barEl = ref<HTMLElement | null>(null)
const buttonEls = ref<HTMLElement[]>([])

function scrollUnderHeader(el: HTMLElement | null) {
  if (!el) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT,
    behavior: reduceMotion ? 'auto' : 'smooth'
  })
}

async function toggle(value: HeroChoice, index: number) {
  const closing = selected.value === value
  selected.value = closing ? null : value
  if (closing) return

  // 桌機：把整條選項列頂到導覽列下方，四個選項都還看得到才能繼續切換
  // 手機：把被點的那一列頂上去，展開的內容剛好接在下面
  const target = () => (isDesktop.value ? barEl.value : (buttonEls.value[index] ?? null))

  await nextTick()
  scrollUnderHeader(target())
  // 卡片資料回來後區塊會再長高，補一次落點，否則第一次會被頁面高度夾住
  setTimeout(() => scrollUnderHeader(target()), 350)
}
</script>

<template>
  <section class="relative flex min-h-[560px] flex-col overflow-hidden sm:min-h-[680px]">
    <!--
      圓點：桌機的入口列只有一排（約 80px），放 bottom-24 剛好在它上面；
      手機版入口列是四列疊起來的（超過 300px），底部整片都是內容，
      所以改放到上方、避開固定導覽列的高度。
    -->
    <HeroCarousel
      :images="hero?.images ?? []"
      :alt="`${hero?.title ?? '無穹旅行社'}主視覺`"
      dots-class="top-20 bottom-auto lg:bottom-24 lg:top-auto"
    />
    <div class="absolute inset-0 bg-gray-900/35" />
    <div class="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-gray-900/40" />

    <!-- pt-16 讓標題避開疊在上方的固定導覽列，視覺上才是置中的 -->
    <div class="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-16">
      <div class="text-center">
        <h1 class="text-5xl font-semibold tracking-tight text-white sm:text-7xl lg:text-8xl">
          {{ hero?.title ?? '無穹旅行社' }}
        </h1>
        <p class="mx-auto mt-5 max-w-md text-sm text-white/85 sm:text-base">
          {{ hero?.subtitle ?? '探索你的下一趟旅程' }}
        </p>
      </div>
    </div>

    <!-- 底部入口列：高斯玻璃，選中的格子轉成白底深字 -->
    <div ref="barEl" class="relative z-10 border-t border-white/20 bg-white/10 backdrop-blur-xl">
      <div class="grid grid-cols-1 lg:grid-cols-4">
        <template v-for="(option, index) in options" :key="option.value">
          <button
            :ref="el => { if (el) buttonEls[index] = el as HTMLElement }"
            type="button"
            class="group flex items-center justify-between gap-3 border-b border-white/20 px-5 py-4 text-left transition-colors lg:border-b-0 lg:border-r lg:last:border-r-0"
            :class="selected === option.value ? 'bg-white' : 'hover:bg-white/20'"
            :aria-pressed="selected === option.value"
            @click="toggle(option.value, index)"
          >
            <span class="flex flex-col gap-1">
              <span
                class="text-xs transition-colors"
                :class="selected === option.value ? 'text-gray-500' : 'text-white/70'"
              >
                {{ option.label }}
              </span>
              <span
                class="text-sm font-medium transition-colors"
                :class="selected === option.value ? 'text-gray-900' : 'text-white'"
              >
                {{ option.hint }}
              </span>
            </span>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 shrink-0 transition-transform duration-300"
              :class="selected === option.value ? 'rotate-180 text-gray-500' : 'text-white/60'"
            />
          </button>

          <!-- 手機版：展開的內容直接接在被點的那一列下方，不用捲到 hero 外面找 -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="!isDesktop && selected === option.value"
              class="border-b border-white/20 bg-white"
            >
              <HeroExploreSection :choice="option.value" dense />
            </div>
          </Transition>
        </template>
      </div>
    </div>
  </section>
</template>
