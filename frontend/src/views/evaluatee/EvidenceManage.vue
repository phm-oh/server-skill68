<template>
  <v-container fluid>
    <v-btn variant="text" color="primary" to="/evaluatee" class="mb-2">
      <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
    </v-btn>
    <h1 class="text-h4 mb-4">จัดการหลักฐาน</h1>

    <base-card title="เลือกรอบการประเมิน" icon="mdi-calendar" class="mb-4">
      <v-select
        v-model="selectedAssignmentId"
        :items="assignments"
        :item-title="(item) => formatAssignmentInfo(item)"
        item-value="id"
        label="รอบการประเมิน"
        variant="outlined"
        density="compact"
        @update:model-value="loadTopicsAndIndicators"
      ></v-select>
    </base-card>

    <template v-if="selectedAssignmentId && !loading">
      <base-card
        v-for="topic in topics"
        :key="topic.id"
        :title="topic.title_th"
        :subtitle="`น้ำหนัก ${topic.weight}%`"
        icon="mdi-book-open-variant"
        class="mb-4"
      >
        <div v-for="indicator in topic.indicators" :key="indicator.id" class="mb-6">
          <v-divider class="mb-4"></v-divider>

          <div class="d-flex align-center mb-3">
            <v-icon icon="mdi-checkbox-marked-circle-outline" class="mr-2" color="primary"></v-icon>
            <span class="text-subtitle-1 font-weight-medium">{{ indicator.name_th }}</span>
            <v-chip size="small" color="primary" class="ml-2">{{ indicator.weight }}%</v-chip>
          </div>

          <div v-if="getIndicatorFiles(indicator.id).length > 0" class="mb-3">
            <div class="text-subtitle-2 mb-2">ไฟล์ที่อัปโหลดแล้ว:</div>
            <v-list density="compact" class="bg-grey-lighten-5 rounded">
              <v-list-item v-for="file in getIndicatorFiles(indicator.id)" :key="file.id">
                <template v-slot:prepend>
                  <v-icon :icon="getFileIcon(file.file_name)" color="primary"></v-icon>
                </template>
                <v-list-item-title>{{ file.file_name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatFileSize(file.size_bytes) }} | {{ formatDate(file.created_at) }}
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon="mdi-eye" size="small" variant="text" color="primary" @click="viewFile(file)"></v-btn>
                  <v-btn icon="mdi-download" size="small" variant="text" color="success" @click="downloadFile(file)"></v-btn>
                  <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDelete(file)"></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <evidence-upload
            :assignment-id="selectedAssignmentId"
            :indicator-id="indicator.id"
            :evidence-type-id="1"
            @uploaded="handleFileUploaded"
            @error="handleUploadError"
          ></evidence-upload>
        </div>
      </base-card>
    </template>

    <loading-overlay :loading="loading"></loading-overlay>

    <base-dialog
      v-model="deleteDialog"
      title="ยืนยันการลบไฟล์"
      icon="mdi-delete-alert"
      confirm-text="ลบ"
      confirm-color="error"
      @confirm="deleteFile"
      @cancel="deleteDialog = false"
    >
      <p>คุณต้องการลบไฟล์ "{{ fileToDelete?.file_name }}" หรือไม่?</p>
      <v-alert type="warning" variant="tonal" class="mt-2">การลบไฟล์ไม่สามารถกู้คืนได้</v-alert>
    </base-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import topicService from '@/services/topicService';
import uploadService from '@/services/uploadService';
import assignmentService from '@/services/assignmentService';
import { formatDate, formatFileSize } from '@/utils/helpers';
import BaseCard from '@/components/base/BaseCard.vue';
import EvidenceUpload from '@/components/common/EvidenceUpload.vue';
import LoadingOverlay from '@/components/base/LoadingOverlay.vue';
import BaseDialog from '@/components/base/BaseDialog.vue';

const notificationStore = useNotificationStore();
const assignments = ref([]);
const selectedAssignmentId = ref(null);
const topics = ref([]);
const uploadedFiles = ref([]);
const loading = ref(false);
const deleteDialog = ref(false);
const fileToDelete = ref(null);

// Format assignment info for display
const formatAssignmentInfo = (assignment) => {
  if (assignment.start_date && assignment.end_date) {
    return `${new Date(assignment.start_date).toLocaleDateString('th-TH')} - ${new Date(assignment.end_date).toLocaleDateString('th-TH')}`;
  }
  return 'ไม่ระบุช่วงเวลา';
};

const fetchAssignments = async () => {
  try {
    // ดึง assignments ที่ user ถูก assign และ active เท่านั้น
    const assignmentsRes = await assignmentService.getMine();
    const allAssignments = assignmentsRes.data.items || assignmentsRes.data.data || [];
    
    // Filter เฉพาะ assignments ที่ is_active = 1
    assignments.value = allAssignments.filter(a => a.is_active === 1);
    
    // เพิ่ม assignmentInfo property สำหรับ display
    assignments.value = assignments.value.map(a => ({
      ...a,
      assignmentInfo: formatAssignmentInfo(a)
    }));
    
    // เลือก assignment แรกที่ active
    if (assignments.value.length > 0) {
      selectedAssignmentId.value = assignments.value[0].id;
      await loadTopicsAndIndicators();
    }
  } catch (error) {
    console.error('[EvidenceManage] Error fetching assignments:', error);
    notificationStore.error('ไม่สามารถโหลดรอบการประเมินได้');
  }
};

const loadTopicsAndIndicators = async () => {
  if (!selectedAssignmentId.value) return;
  loading.value = true;
  try {
    const topicsRes = await topicService.getAll();
    // Backend ส่ง { success: true, items: [...] }
    const allTopics = topicsRes.data.items || topicsRes.data.data || [];

    for (const topic of allTopics) {
      const indicatorsRes = await topicService.getIndicatorsByTopic(topic.id);
      topic.indicators = indicatorsRes.data.items || indicatorsRes.data.data || [];
    }
    topics.value = allTopics;

    // Filter files เฉพาะ assignment ที่เลือก
    const res = await uploadService.getMine();
    const allFiles = res.data.items || res.data.data || [];
    uploadedFiles.value = allFiles.filter(f => f.assignment_id === selectedAssignmentId.value);
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดข้อมูลได้');
  } finally {
    loading.value = false;
  }
};

const getIndicatorFiles = (indicatorId) => uploadedFiles.value.filter(f => f.indicator_id === indicatorId);

const handleFileUploaded = async () => {
  const res = await uploadService.getMine();
  const allFiles = res.data.items || res.data.data || [];
  // Filter files เฉพาะ assignment ที่เลือก
  uploadedFiles.value = allFiles.filter(f => f.assignment_id === selectedAssignmentId.value);
  notificationStore.success('อัปโหลดไฟล์สำเร็จ');
};

const handleUploadError = (message) => notificationStore.error(message);

const confirmDelete = (file) => {
  fileToDelete.value = file;
  deleteDialog.value = true;
};

const deleteFile = async () => {
  try {
    await uploadService.delete(fileToDelete.value.id);
    uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== fileToDelete.value.id);
    notificationStore.success('ลบไฟล์สำเร็จ');
    deleteDialog.value = false;
    fileToDelete.value = null;
  } catch (error) {
    notificationStore.error('ไม่สามารถลบไฟล์ได้');
  }
};

const getFileUrl = (file) => {
  const relativePath = file.file_url || file.url;
  if (!relativePath) return null;
  // ถ้าเป็น relative path (/uploads/...) ให้เพิ่ม base URL
  if (relativePath.startsWith('/')) {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api';
    // เอา /api ออกเพื่อให้ได้ http://localhost:7000
    const apiBase = baseURL.replace('/api', '');
    return apiBase + relativePath;
  }
  // ถ้าเป็น full URL แล้วใช้เลย
  return relativePath;
};

const viewFile = (file) => {
  const fileUrl = getFileUrl(file);
  if (fileUrl) {
    window.open(fileUrl, '_blank');
  } else {
    notificationStore.error('ไม่พบ URL ของไฟล์');
  }
};

const downloadFile = (file) => {
  const link = document.createElement('a');
  link.href = getFileUrl(file);
  link.download = file.file_name;
  link.click();
};

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const icons = { pdf: 'mdi-file-pdf-box', doc: 'mdi-file-word', docx: 'mdi-file-word',
    xls: 'mdi-file-excel', xlsx: 'mdi-file-excel', jpg: 'mdi-file-image',
    jpeg: 'mdi-file-image', png: 'mdi-file-image', gif: 'mdi-file-image' };
  return icons[ext] || 'mdi-file-document';
};


onMounted(fetchAssignments);
</script>
