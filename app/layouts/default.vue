<template>
  <div class="flex min-h-screen flex-col">
    <div class="print:hidden">
      <AppHeader />
    </div>
    <main class="flex-1">
      <slot />
    </main>
    <div class="print:hidden">
      <AppFooter />
    </div>
  </div>
</template>
