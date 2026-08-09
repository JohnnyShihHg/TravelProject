function useMediaQuery(query: string, initial = false) {
  const matches = ref(initial)

  let mql: MediaQueryList | undefined
  function update() {
    if (mql) matches.value = mql.matches
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    update()
    mql.addEventListener('change', update)
  })

  onBeforeUnmount(() => mql?.removeEventListener('change', update))

  return matches
}

// Tailwind lg 斷點。用來決定 hero 展開的區塊要渲染在哪裡：
// 桌機放在 hero 下方，手機則直接接在被點的那一列底下（手風琴）。
// 不能只靠 CSS 隱藏其中一份，因為 Embla 輪播在 display:none 的容器裡量不到寬度。
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)', true)
}

// 輪播一次看得到幾張，對應 basis-full / sm:basis-1/2 / lg:basis-1/4。
// Embla 要能循環，卡片數必須夠繞完整一圈（前後各補滿一個可視寬），
// 大約是可視張數的兩倍；不足時硬開 loop 會讓輪播完全不能動。
export function useCardsPerView() {
  const isDesktop = useMediaQuery('(min-width: 1024px)', true)
  const isTablet = useMediaQuery('(min-width: 640px)', true)

  return computed(() => {
    if (isDesktop.value) return 4
    if (isTablet.value) return 2
    return 1
  })
}
