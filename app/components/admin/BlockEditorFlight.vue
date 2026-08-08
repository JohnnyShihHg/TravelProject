<script setup lang="ts">
import type { FlightBlockData, FlightLeg } from '~/types/trip'

const props = defineProps<{ modelValue: FlightBlockData }>()
const emit = defineEmits<{ 'update:modelValue': [value: FlightBlockData] }>()

function emptyLeg(label: string): FlightLeg {
  return { label, date: '', airline: '', fromCode: '', fromName: '', toCode: '', toName: '', departTime: '', arriveTime: '', duration: '' }
}

function addLeg(label: string) {
  emit('update:modelValue', { legs: [...props.modelValue.legs, emptyLeg(label)] })
}

function updateLeg(index: number, patch: Partial<FlightLeg>) {
  const legs = props.modelValue.legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg))
  emit('update:modelValue', { legs })
}

function removeLeg(index: number) {
  emit('update:modelValue', { legs: props.modelValue.legs.filter((_, i) => i !== index) })
}
</script>

<template>
  <div class="space-y-3">
    <div v-for="(leg, i) in modelValue.legs" :key="i" class="rounded-lg border border-gray-200 p-3">
      <div class="mb-2 flex items-center justify-between">
        <UInput :model-value="leg.label" size="xs" class="w-24" placeholder="去程/回程" @update:model-value="(v) => updateLeg(i, { label: String(v) })" />
        <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="removeLeg(i)" />
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <UInput :model-value="leg.date" type="date" size="xs" @update:model-value="(v) => updateLeg(i, { date: String(v) })" />
        <UInput :model-value="leg.airline" size="xs" placeholder="航空公司" @update:model-value="(v) => updateLeg(i, { airline: String(v) })" />
        <UInput :model-value="leg.duration" size="xs" placeholder="飛行時間 3h25m" @update:model-value="(v) => updateLeg(i, { duration: String(v) })" />
        <div class="hidden sm:block" />
        <UInput :model-value="leg.fromCode" size="xs" placeholder="出發代碼 TPE" @update:model-value="(v) => updateLeg(i, { fromCode: String(v) })" />
        <UInput :model-value="leg.fromName" size="xs" placeholder="出發機場名稱" @update:model-value="(v) => updateLeg(i, { fromName: String(v) })" />
        <UInput :model-value="leg.departTime" size="xs" placeholder="起飛時間 08:30" @update:model-value="(v) => updateLeg(i, { departTime: String(v) })" />
        <div class="hidden sm:block" />
        <UInput :model-value="leg.toCode" size="xs" placeholder="抵達代碼 NRT" @update:model-value="(v) => updateLeg(i, { toCode: String(v) })" />
        <UInput :model-value="leg.toName" size="xs" placeholder="抵達機場名稱" @update:model-value="(v) => updateLeg(i, { toName: String(v) })" />
        <UInput :model-value="leg.arriveTime" size="xs" placeholder="抵達時間 12:55" @update:model-value="(v) => updateLeg(i, { arriveTime: String(v) })" />
      </div>
    </div>

    <div class="flex gap-2">
      <UButton size="xs" color="neutral" variant="soft" @click="addLeg('去程')">
        ＋新增去程
      </UButton>
      <UButton size="xs" color="neutral" variant="soft" @click="addLeg('回程')">
        ＋新增回程
      </UButton>
    </div>
  </div>
</template>
