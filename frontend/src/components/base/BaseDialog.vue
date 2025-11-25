<template>
  <v-dialog v-model="show" :max-width="maxWidth" :persistent="persistent">
    <v-card>
      <v-card-title class="text-h6 bg-primary">
        <v-icon v-if="icon" :icon="icon" class="mr-2"></v-icon>
        {{ title }}
      </v-card-title>

      <v-card-text class="pt-4">
        <slot></slot>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          v-if="!hideCancel"
          variant="text"
          @click="handleCancel"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          :color="confirmColor"
          :loading="loading"
          variant="elevated"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, required: true },
  icon: String,
  maxWidth: { type: String, default: '600px' },
  persistent: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  confirmText: { type: String, default: 'ตกลง' },
  cancelText: { type: String, default: 'ยกเลิก' },
  confirmColor: { type: String, default: 'primary' },
  hideCancel: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
  show.value = false;
};
</script>
