<template>
  <v-card elevation="2" color="blue-lighten-5" border>
    <v-card-title class="bg-blue-lighten-4">
      <v-icon icon="mdi-file-upload" start color="primary"></v-icon>
      แนบหลักฐาน
    </v-card-title>

    <v-card-text>
      <!-- File Upload -->
      <v-file-input
        v-model="selectedFiles"
        :accept="acceptedTypes"
        label="เลือกไฟล์"
        prepend-icon="mdi-paperclip"
        multiple
        chips
        show-size
        :disabled="uploading"
        @update:model-value="handleFileSelect"
      >
        <template v-slot:selection="{ fileNames }">
          <v-chip
            v-for="fileName in fileNames"
            :key="fileName"
            color="primary"
            label
            size="small"
          >
            {{ fileName }}
          </v-chip>
        </template>
      </v-file-input>

      <!-- Progress Bar -->
      <v-progress-linear
        v-if="uploading"
        v-model="uploadProgress"
        color="primary"
        height="20"
        class="mt-2"
      >
        <template v-slot:default="{ value }">
          <strong>{{ Math.ceil(value) }}%</strong>
        </template>
      </v-progress-linear>

      <!-- Upload Button -->
      <v-btn
        v-if="selectedFiles.length > 0"
        color="primary"
        :loading="uploading"
        @click="uploadFiles"
        class="mt-2"
      >
        <v-icon icon="mdi-upload" start></v-icon>
        อัปโหลด
      </v-btn>

      <!-- Uploaded Files List -->
      <div v-if="uploadedFiles.length > 0" class="mt-4">
        <v-divider class="mb-2"></v-divider>
        <div class="text-subtitle-2 mb-2">ไฟล์ที่อัปโหลดแล้ว:</div>
        <v-chip
          v-for="file in uploadedFiles"
          :key="file.id"
          closable
          @click:close="removeFile(file.id)"
          class="ma-1"
        >
          <v-icon icon="mdi-file" start></v-icon>
          {{ file.file_name }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import uploadService from '@/services/uploadService';

const props = defineProps({
  acceptedTypes: {
    type: String,
    default: 'application/pdf,image/jpeg,image/png'
  },
  maxSize: { type: Number, default: 5 * 1024 * 1024 },
  assignmentId: { type: Number, required: false },
  indicatorId: { type: Number, required: false },
  evidenceTypeId: { type: Number, default: 1 }
});

const emit = defineEmits(['uploaded', 'error']);

const selectedFiles = ref([]);
const uploadedFiles = ref([]);
const uploading = ref(false);
const uploadProgress = ref(0);

const handleFileSelect = (files) => {
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (file.size > props.maxSize) {
      emit('error', `ไฟล์ ${file.name} มีขนาดเกิน 5MB`);
      selectedFiles.value = [];
      return;
    }
  }
};

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return;

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const metadata = {
      assignment_id: props.assignmentId,
      indicator_id: props.indicatorId,
      evidence_type_id: props.evidenceTypeId
    };

    for (const file of selectedFiles.value) {
      const result = await uploadService.upload(file, (progress) => {
        uploadProgress.value = progress;
      }, metadata);
      uploadedFiles.value.push(result.data.data);
    }

    selectedFiles.value = [];
    emit('uploaded', uploadedFiles.value);
  } catch (error) {
    emit('error', error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
};

const removeFile = async (id) => {
  try {
    await uploadService.delete(id);
    uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== id);
  } catch (error) {
    emit('error', 'ไม่สามารถลบไฟล์ได้');
  }
};

defineExpose({
  getUploadedFiles: () => uploadedFiles.value,
  reset: () => {
    selectedFiles.value = [];
    uploadedFiles.value = [];
  }
});
</script>
