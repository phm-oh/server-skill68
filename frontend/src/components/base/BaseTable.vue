<template>
  <div>
    <v-text-field
      v-model="searchQuery"
      label="ค้นหา"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      class="mb-4"
      clearable
    ></v-text-field>

    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      :search="searchQuery"
      :items-per-page="itemsPerPage"
      class="elevation-1"
    >
      <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
        <slot :name="slot" v-bind="scope" />
      </template>

      <template v-slot:no-data>
        <v-alert type="info" variant="tonal" class="ma-2">
          ไม่พบข้อมูล
        </v-alert>
      </template>

      <template v-slot:loading>
        <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
      </template>
    </v-data-table>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  headers: { type: Array, required: true },
  items: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  itemsPerPage: { type: Number, default: 10 }
});

const searchQuery = ref('');
</script>
