<template>
  <v-chip
    :color="chipColor"
    :variant="variant"
    :size="size"
  >
    <v-icon v-if="showIcon" :icon="chipIcon" start></v-icon>
    {{ chipText }}
  </v-chip>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, required: true },
  size: { type: String, default: 'default' },
  variant: { type: String, default: 'flat' },
  showIcon: { type: Boolean, default: true }
});

const statusConfig = {
  draft: { text: 'ร่าง', color: 'grey', icon: 'mdi-pencil' },
  submitted: { text: 'ส่งแล้ว', color: 'blue', icon: 'mdi-send' },
  evaluated: { text: 'ประเมินแล้ว', color: 'orange', icon: 'mdi-star' },
  approved: { text: 'อนุมัติแล้ว', color: 'green', icon: 'mdi-check-circle' },
  active: { text: 'เปิดใช้งาน', color: 'success', icon: 'mdi-check' },
  inactive: { text: 'ปิดใช้งาน', color: 'grey', icon: 'mdi-close' },
  pending: { text: 'รอดำเนินการ', color: 'warning', icon: 'mdi-clock' }
};

const chipColor = computed(() => statusConfig[props.status]?.color || 'grey');
const chipText = computed(() => statusConfig[props.status]?.text || props.status);
const chipIcon = computed(() => statusConfig[props.status]?.icon || 'mdi-information');
</script>
