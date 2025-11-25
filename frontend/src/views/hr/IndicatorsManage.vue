<template>
  <v-container fluid>
    <v-btn variant="text" color="primary" to="/admin" class="mb-2">
      <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
    </v-btn>
    <h1 class="text-h4 mb-4">จัดการตัวชี้วัด</h1>
    <v-row class="mb-4">
      <v-col cols="12">
        <v-select v-model="selectedTopic" :items="topics" item-title="title_th" item-value="id"
          label="เลือกหัวข้อการประเมิน" variant="outlined" density="compact"
          :loading="loadingTopics" @update:modelValue="fetchIndicators"></v-select>
      </v-col>
    </v-row>
    <div v-if="selectedTopic" class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h6">รายการตัวชี้วัด</h2>
      <v-btn color="primary" @click="openDialog()">
        <v-icon icon="mdi-plus" start></v-icon>เพิ่มตัวชี้วัด
      </v-btn>
    </div>
    <base-table v-if="selectedTopic" :headers="headers" :items="indicators" :loading="loading">
      <template v-slot:item.weight="{ item }">{{ item.weight }}</template>
      <template v-slot:item.type="{ item }">{{ getEvaluationTypeText(item.type) }}</template>
      <template v-slot:item.active="{ item }">
        <status-chip :status="item.active ? 'active' : 'inactive'" />
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" color="primary" @click="openDialog(item)"></v-btn>
        <v-btn :icon="item.active ? 'mdi-eye-off' : 'mdi-eye'" size="small" variant="text"
          :color="item.active ? 'warning' : 'success'" @click="toggleActive(item)"></v-btn>
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDelete(item)"></v-btn>
      </template>
    </base-table>
    <v-alert v-else type="info" variant="tonal" class="mt-4">
      กรุณาเลือกรอบการประเมินและหัวข้อการประเมินเพื่อดูรายการตัวชี้วัด
    </v-alert>
    <base-dialog v-model="dialog" :title="isEdit ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัด'"
      icon="mdi-chart-line" :loading="saving" @confirm="handleSave" @cancel="dialog = false">
      <v-form ref="formRef" v-model="valid">
        <v-text-field v-model="form.code" label="รหัสตัวชี้วัด"
          :rules="[v => !!v || 'กรุณากรอกรหัสตัวชี้วัด']" variant="outlined" density="compact" class="mb-3" :readonly="isEdit"></v-text-field>
        <v-text-field v-model="form.name_th" label="ชื่อตัวชี้วัด"
          :rules="[v => !!v || 'กรุณากรอกชื่อตัวชี้วัด']" variant="outlined" density="compact" class="mb-3"></v-text-field>
        <v-text-field v-model.number="form.weight" label="น้ำหนัก" type="number"
          :rules="[v => v !== null && v !== '' || 'กรุณากรอกน้ำหนัก', v => v >= 0 || 'น้ำหนักต้องมากกว่าหรือเท่ากับ 0']"
          variant="outlined" density="compact" class="mb-3"></v-text-field>
        <v-select v-model="form.type" :items="evaluationTypes" item-title="text" item-value="value"
          label="ประเภทการประเมิน" variant="outlined" density="compact" class="mb-3"></v-select>
        <v-textarea v-model="form.description" label="รายละเอียด (ไม่บังคับ)"
          variant="outlined" density="compact" rows="2" class="mb-3"></v-textarea>
        <v-checkbox v-model="form.active" label="เปิดใช้งาน" color="primary" hide-details></v-checkbox>
      </v-form>
    </base-dialog>
    <base-dialog v-model="deleteDialog" title="ยืนยันการลบ" icon="mdi-alert" confirm-text="ลบ"
      confirm-color="error" :loading="deleting" @confirm="handleDelete" @cancel="deleteDialog = false">
      <v-alert type="warning" variant="tonal" class="mb-4">
        คุณต้องการลบตัวชี้วัด "<strong>{{ deleteItem?.name_th }}</strong>" หรือไม่?
      </v-alert>
      <p class="text-body-2">การลบจะไม่สามารถย้อนกลับได้</p>
    </base-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import BaseTable from '@/components/base/BaseTable.vue';
import BaseDialog from '@/components/base/BaseDialog.vue';
import StatusChip from '@/components/base/StatusChip.vue';
import topicService from '@/services/topicService';

const notificationStore = useNotificationStore();
const headers = [
  { title: 'รหัส', key: 'code', sortable: true },
  { title: 'ชื่อตัวชี้วัด', key: 'name_th', sortable: true },
  { title: 'น้ำหนัก', key: 'weight', sortable: true },
  { title: 'ประเภท', key: 'type', sortable: true },
  { title: 'สถานะ', key: 'active', sortable: true },
  { title: 'จัดการ', key: 'actions', sortable: false }
];
const evaluationTypes = [
  { text: 'แบบมาตราส่วน 1-4', value: 'score_1_4' },
  { text: 'แบบ ใช่/ไม่ใช่', value: 'yes_no' },
  { text: 'แบบ URL ไฟล์', value: 'file_url' }
];
const topics = ref([]);
const indicators = ref([]);
const selectedTopic = ref(null);
const loadingTopics = ref(false);
const loading = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const deleting = ref(false);
const valid = ref(false);
const formRef = ref(null);
const deleteItem = ref(null);
const form = ref({ code: '', name_th: '', weight: null, type: 'score_1_4', description: '', topic_id: null, active: 1 });

const getEvaluationTypeText = (type) => {
  const found = evaluationTypes.find(t => t.value === type);
  return found ? found.text : type;
};

const fetchTopics = async () => {
  loadingTopics.value = true;
  try {
    const response = await topicService.getAll();
    topics.value = response.data.items || response.data.data || [];
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดหัวข้อการประเมินได้');
  } finally {
    loadingTopics.value = false;
  }
};

const fetchIndicators = async () => {
  if (!selectedTopic.value) {
    indicators.value = [];
    return;
  }
  loading.value = true;
  try {
    const response = await topicService.getIndicatorsByTopic(selectedTopic.value);
    indicators.value = response.data.items || response.data.data || [];
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดตัวชี้วัดได้');
  } finally {
    loading.value = false;
  }
};

const openDialog = (item = null) => {
  isEdit.value = !!item;
  form.value = item ? { ...item } : { code: '', name_th: '', weight: null, type: 'score_1_4', description: '', topic_id: selectedTopic.value, active: 1 };
  dialog.value = true;
};

const handleSave = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    form.value.topic_id = selectedTopic.value;
    if (isEdit.value) {
      await topicService.updateIndicator(form.value.id, form.value);
      notificationStore.success('แก้ไขตัวชี้วัดสำเร็จ');
    } else {
      await topicService.createIndicator(form.value);
      notificationStore.success('เพิ่มตัวชี้วัดสำเร็จ');
    }
    dialog.value = false;
    fetchIndicators();
  } catch (error) {
    notificationStore.error('เกิดข้อผิดพลาด: ' + (error.response?.data?.message || error.message));
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (item) => {
  try {
    const data = { ...item, active: item.active ? 0 : 1 };
    await topicService.updateIndicator(item.id, data);
    notificationStore.success('เปลี่ยนสถานะสำเร็จ');
    fetchIndicators();
  } catch (error) {
    notificationStore.error('ไม่สามารถเปลี่ยนสถานะได้');
  }
};

const confirmDelete = (item) => {
  deleteItem.value = item;
  deleteDialog.value = true;
};

const handleDelete = async () => {
  deleting.value = true;
  try {
    await topicService.deleteIndicator(deleteItem.value.id);
    notificationStore.success('ลบตัวชี้วัดสำเร็จ');
    deleteDialog.value = false;
    fetchIndicators();
  } catch (error) {
    notificationStore.error('ไม่สามารถลบได้');
  } finally {
    deleting.value = false;
  }
};

onMounted(fetchTopics);
</script>
