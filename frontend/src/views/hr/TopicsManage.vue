<template>
  <v-container fluid>
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <v-btn variant="text" color="primary" to="/admin" class="mb-2">
          <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
        </v-btn>
        <h1 class="text-h4">จัดการหัวข้อการประเมิน</h1>
      </div>
      <v-btn color="primary" @click="openDialog()">
        <v-icon icon="mdi-plus" start></v-icon>
        เพิ่มหัวข้อใหม่
      </v-btn>
    </div>

    <base-table :headers="headers" :items="topics" :loading="loading">
      <template v-slot:item.weight="{ item }">{{ item.weight }}</template>
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

    <base-dialog v-model="dialog" :title="isEdit ? 'แก้ไขหัวข้อ' : 'เพิ่มหัวข้อใหม่'"
      icon="mdi-file-document-outline" :loading="saving" @confirm="handleSave" @cancel="dialog = false">
      <v-form ref="formRef" v-model="valid">
        <v-text-field v-model="form.code" label="รหัสหัวข้อ"
          :rules="[v => !!v || 'กรุณากรอกรหัสหัวข้อ']" variant="outlined" density="compact" class="mb-3" :readonly="isEdit"></v-text-field>
        <v-text-field v-model="form.title_th" label="ชื่อหัวข้อ"
          :rules="[v => !!v || 'กรุณากรอกชื่อหัวข้อ']" variant="outlined" density="compact" class="mb-3"></v-text-field>
        <v-textarea v-model="form.description" label="รายละเอียด" variant="outlined" density="compact" rows="2" class="mb-3"></v-textarea>
        <v-text-field v-model.number="form.weight" label="น้ำหนัก" type="number"
          :rules="[v => v !== '' && v !== null || 'กรุณากรอกน้ำหนัก', v => v >= 0 || 'น้ำหนักต้องมากกว่าหรือเท่ากับ 0']"
          variant="outlined" density="compact" class="mb-3" min="0"></v-text-field>
        <v-checkbox v-model="form.active" label="เปิดใช้งาน" color="primary" hide-details></v-checkbox>
      </v-form>
    </base-dialog>

    <base-dialog v-model="deleteDialog" title="ยืนยันการลบ" icon="mdi-alert" confirm-text="ลบ"
      confirm-color="error" :loading="deleting" @confirm="handleDelete" @cancel="deleteDialog = false">
      <v-alert type="warning" variant="tonal" class="mb-4">
        คุณต้องการลบหัวข้อ "<strong>{{ deleteItem?.title_th }}</strong>" หรือไม่?
      </v-alert>
      <p class="text-body-2">การลบจะทำให้ตัวชี้วัดทั้งหมดในหัวข้อนี้ถูกลบด้วย</p>
    </base-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import BaseTable from '@/components/base/BaseTable.vue';
import BaseDialog from '@/components/base/BaseDialog.vue';
import StatusChip from '@/components/base/StatusChip.vue';
import topicService from '@/services/topicService';

const notificationStore = useNotificationStore();
const headers = [
  { title: 'รหัส', key: 'code', sortable: true },
  { title: 'ชื่อหัวข้อ', key: 'title_th', sortable: true },
  { title: 'น้ำหนัก', key: 'weight', sortable: true },
  { title: 'สถานะ', key: 'active', sortable: true },
  { title: 'จัดการ', key: 'actions', sortable: false }
];

const topics = ref([]);
const loading = ref(false);
const dialog = ref(false);
const deleteDialog = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const deleting = ref(false);
const valid = ref(false);
const formRef = ref(null);
const deleteItem = ref(null);
const form = ref({ code: '', title_th: '', description: '', weight: 0, active: 1 });

const totalWeight = computed(() => {
  return topics.value.reduce((sum, topic) => sum + (parseFloat(topic.weight) || 0), 0);
});

const fetchTopics = async () => {
  loading.value = true;
  try {
    const response = await topicService.getAll();
    topics.value = response.data.items || response.data.data || [];
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดข้อมูลหัวข้อได้');
  } finally {
    loading.value = false;
  }
};

const openDialog = (item = null) => {
  isEdit.value = !!item;
  if (item) {
    form.value = { ...item };
    deleteItem.value = { ...item };
  } else {
    form.value = { code: '', title_th: '', description: '', weight: 0, active: 1 };
  }
  dialog.value = true;
};

const handleSave = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    const data = {
      code: form.value.code,
      title_th: form.value.title_th,
      description: form.value.description || null,
      weight: form.value.weight,
      active: form.value.active ? 1 : 0
    };
    if (isEdit.value) {
      await topicService.update(form.value.id, data);
      notificationStore.success('แก้ไขหัวข้อสำเร็จ');
    } else {
      await topicService.create(data);
      notificationStore.success('เพิ่มหัวข้อสำเร็จ');
    }
    dialog.value = false;
    fetchTopics();
  } catch (error) {
    notificationStore.error('เกิดข้อผิดพลาด: ' + (error.response?.data?.message || error.message));
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (item) => {
  try {
    const data = { ...item, active: item.active ? 0 : 1 };
    await topicService.update(item.id, data);
    notificationStore.success('เปลี่ยนสถานะสำเร็จ');
    fetchTopics();
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
    await topicService.delete(deleteItem.value.id);
    notificationStore.success('ลบหัวข้อสำเร็จ');
    deleteDialog.value = false;
    fetchTopics();
  } catch (error) {
    notificationStore.error('ไม่สามารถลบได้');
  } finally {
    deleting.value = false;
  }
};

onMounted(fetchTopics);
</script>
