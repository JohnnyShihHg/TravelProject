<script setup lang="ts">
const year = new Date().getFullYear()

const links = [
  { label: '首頁', to: '/' },
  { label: '出團資訊', to: '/trips' },
  { label: '關於無穹', to: '/about' },
  { label: '聯絡我們', to: '/contact' }
]
</script>

<template>
  <footer class="border-t border-gray-100 bg-gray-50">
    <div class="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
      <div>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-compass" class="size-6 text-primary" />
          <span class="text-base font-bold text-gray-900">無穹旅行社</span>
        </div>
        <p class="mt-3 text-sm text-gray-500">
          帶你走進每一段值得記住的旅程。
        </p>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900">
          快速連結
        </h3>
        <ul class="mt-3 space-y-2">
          <li v-for="link in links" :key="link.label">
            <NuxtLink :to="link.to" class="text-sm text-gray-500 hover:text-primary">
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-900">
          聯絡方式
        </h3>
        <ul class="mt-3 space-y-2 text-sm text-gray-500">
          <li class="flex items-center gap-2">
            <UIcon name="i-lucide-mail" class="size-4" />
            hello@wuqiong-travel.example
          </li>
          <li class="flex items-center gap-2">
            <UIcon name="i-lucide-phone" class="size-4" />
            02-0000-0000
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-gray-100 px-4 py-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <p class="text-xs text-gray-400">
          © {{ year }} 無穹旅行社. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>
