<template>
  <v-overlay
    v-model="show"
    class="align-center justify-center"
    persistent
  >
    <v-progress-circular
      :size="size"
      :width="width"
      color="primary"
      indeterminate
    ></v-progress-circular>
    <div v-if="message" class="text-center mt-4">
      <span class="text-h6">{{ message }}</span>
    </div>
  </v-overlay>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  message: String,
  size: { type: Number, default: 70 },
  width: { type: Number, default: 7 }
});

const emit = defineEmits(['update:modelValue']);

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});
</script>
