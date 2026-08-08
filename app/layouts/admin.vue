<template>
  <div class="min-h-screen bg-gray-50">
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NuxtLink to="/admin" class="flex items-center gap-2">
          <UIcon name="i-lucide-compass" class="size-5 text-primary" />
          <span class="text-sm font-bold text-gray-900">無穹旅行社 後台</span>
        </NuxtLink>
        <NuxtLink to="/" class="text-xs text-gray-400 hover:text-gray-600">
          回到前台網站 ↗
        </NuxtLink>
      </div>
    </header>
    <slot />
  </div>
</template>
