<template>
  <v-snackbar
    v-model="show"
    :color="color"
    :timeout="timeout"
    :location="location"
  >
    <div class="d-flex align-center">
      <v-icon :icon="alertIcon" class="mr-2"></v-icon>
      <span>{{ message }}</span>
    </div>

    <template v-slot:actions>
      <v-btn
        variant="text"
        @click="show = false"
      >
        ปิด
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  timeout: { type: Number, default: 3000 },
  location: { type: String, default: 'top' }
});

const emit = defineEmits(['update:modelValue']);

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const color = computed(() => {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  return colors[props.type] || 'info';
});

const alertIcon = computed(() => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  };
  return icons[props.type] || 'mdi-information';
});
</script>
