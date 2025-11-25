<template>
  <v-card :class="cardClass" :elevation="elevation">
    <v-card-title v-if="title" class="text-h6">
      <v-icon v-if="icon" :icon="icon" class="mr-2"></v-icon>
      {{ title }}
    </v-card-title>

    <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>

    <v-card-text>
      <slot></slot>
    </v-card-text>

    <v-card-actions v-if="$slots.actions">
      <slot name="actions"></slot>
    </v-card-actions>
  </v-card>
</template>

<script setup>
defineProps({
  title: String,
  subtitle: String,
  icon: String,
  elevation: { type: Number, default: 2 },
  cardClass: { type: String, default: '' }
});
</script>
