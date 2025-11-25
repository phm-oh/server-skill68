<template>
  <v-container fluid>
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <v-btn variant="text" color="primary" to="/admin" class="mb-2">
          <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
        </v-btn>
        <h1 class="text-h4">จัดการมอบหมายงานประเมิน</h1>
      </div>
      <div class="d-flex gap-2">
        <v-btn color="secondary" @click="openDialog('bulk')">
          <v-icon icon="mdi-account-multiple-plus" start></v-icon>มอบหมายแบบ Bulk
        </v-btn>
        <v-btn color="primary" @click="openDialog('single')">
          <v-icon icon="mdi-account-plus" start></v-icon>มอบหมายเดี่ยว
        </v-btn>
      </div>
    </div>

    <BaseTable :headers="headers" :items="assignments" :loading="loading">
      <template #item.start_date="{ item }">{{ formatDate(item.start_date) }}</template>
      <template #item.end_date="{ item }">{{ formatDate(item.end_date) }}</template>
      <template #item.is_active="{ item }">
        <status-chip :status="item.is_active ? 'active' : 'inactive'" />
      </template>
      <template #item.created_at="{ item }">{{ formatDate(item.created_at) }}</template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" color="primary" @click="openDialog('single', item)"></v-btn>
        <v-btn :icon="item.is_active ? 'mdi-eye-off' : 'mdi-eye'" size="small" variant="text"
          :color="item.is_active ? 'warning' : 'success'" @click="toggleActive(item)"></v-btn>
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDelete(item)"></v-btn>
      </template>
    </BaseTable>

    <!-- Single Assignment Dialog -->
    <BaseDialog v-model="singleDialog" :title="isEdit ? 'แก้ไขการมอบหมายงาน' : 'มอบหมายงานประเมิน (เดี่ยว)'" icon="mdi-account-plus"
      :loading="saving" @confirm="handleSaveSingle" @cancel="handleCancelSingle">
      <v-form ref="singleFormRef">
        <v-select v-model="singleForm.evaluator_id" :items="evaluators" item-title="name_th" item-value="id"
          label="เลือกกรรมการผู้ประเมิน" :rules="[v => !!v || 'กรุณาเลือกกรรมการ']"
          variant="outlined" density="compact" class="mb-3" :readonly="isEdit"></v-select>
        <v-select v-model="singleForm.evaluatee_id" :items="evaluatees" item-title="name_th" item-value="id"
          label="เลือกผู้รับการประเมิน" :rules="[v => !!v || 'กรุณาเลือกผู้รับการประเมิน']"
          variant="outlined" density="compact" class="mb-3" :readonly="isEdit"></v-select>
        <v-text-field v-model="singleForm.start_date" label="วันที่เริ่มต้น" type="date"
          :rules="[v => !!v || 'กรุณาเลือกวันที่เริ่มต้น']" variant="outlined" density="compact" class="mb-3"></v-text-field>
        <v-text-field v-model="singleForm.end_date" label="วันที่สิ้นสุด" type="date"
          :rules="[
            v => !!v || 'กรุณาเลือกวันที่สิ้นสุด',
            v => !singleForm.start_date || v > singleForm.start_date || 'วันที่สิ้นสุดต้องหลังวันที่เริ่มต้น'
          ]" variant="outlined" density="compact" class="mb-3"></v-text-field>
        <v-switch v-model="singleForm.is_active" label="เปิดใช้งาน" color="success" class="mb-3"></v-switch>
      </v-form>
    </BaseDialog>

    <!-- Bulk Assignment Dialog -->
    <BaseDialog v-model="bulkDialog" title="มอบหมายงานประเมิน (Bulk)" icon="mdi-account-multiple-plus"
      :loading="saving" @confirm="handleSaveBulk" @cancel="bulkDialog = false">
      <v-form ref="bulkFormRef">
        <v-select v-model="bulkForm.evaluator_ids" :items="evaluators" item-title="name_th" item-value="id"
          label="เลือกกรรมการผู้ประเมิน (หลายคน)" :rules="[v => v?.length > 0 || 'กรุณาเลือกอย่างน้อย 1 คน']"
          variant="outlined" density="compact" multiple chips closable-chips class="mb-3"></v-select>
        <v-select v-model="bulkForm.evaluatee_ids" :items="evaluatees" item-title="name_th" item-value="id"
          label="เลือกผู้รับการประเมิน (หลายคน)" :rules="[v => v?.length > 0 || 'กรุณาเลือกอย่างน้อย 1 คน']"
          variant="outlined" density="compact" multiple chips closable-chips class="mb-3"></v-select>
        <v-text-field v-model="bulkForm.start_date" label="วันที่เริ่มต้น" type="date"
          :rules="[v => !!v || 'กรุณาเลือกวันที่เริ่มต้น']" variant="outlined" density="compact" class="mb-3"></v-text-field>
        <v-text-field v-model="bulkForm.end_date" label="วันที่สิ้นสุด" type="date"
          :rules="[
            v => !!v || 'กรุณาเลือกวันที่สิ้นสุด',
            v => !bulkForm.start_date || v > bulkForm.start_date || 'วันที่สิ้นสุดต้องหลังวันที่เริ่มต้น'
          ]" variant="outlined" density="compact" class="mb-3"></v-text-field>
        <v-switch v-model="bulkForm.is_active" label="เปิดใช้งาน" color="success"></v-switch>
      </v-form>
    </BaseDialog>

    <!-- Delete Dialog -->
    <BaseDialog v-model="deleteDialog" title="ยืนยันการลบ" icon="mdi-delete" confirm-text="ลบ"
      confirm-color="error" :loading="deleting" @confirm="handleDelete" @cancel="deleteDialog = false">
      <v-alert type="warning" variant="tonal">
        คุณต้องการลบการมอบหมาย <strong>{{ deleteItem?.evaluator_name }}</strong>
        ประเมิน <strong>{{ deleteItem?.evaluatee_name }}</strong> ใช่หรือไม่?
      </v-alert>
    </BaseDialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import BaseTable from '@/components/base/BaseTable.vue';
import BaseDialog from '@/components/base/BaseDialog.vue';
import StatusChip from '@/components/base/StatusChip.vue';
import assignmentService from '@/services/assignmentService';
import userService from '@/services/userService';
import { formatDate } from '@/utils/helpers';

const notificationStore = useNotificationStore();
const loading = ref(false), saving = ref(false), deleting = ref(false);
const singleDialog = ref(false), bulkDialog = ref(false), deleteDialog = ref(false);
const singleFormRef = ref(null), bulkFormRef = ref(null);

const assignments = ref([]), evaluators = ref([]), evaluatees = ref([]);
const deleteItem = ref(null);
const singleForm = ref({ 
  evaluator_id: null, 
  evaluatee_id: null, 
  start_date: null, 
  end_date: null, 
  is_active: true 
});
const bulkForm = ref({ 
  evaluator_ids: [], 
  evaluatee_ids: [], 
  start_date: null, 
  end_date: null, 
  is_active: true 
});

const headers = [
  { title: 'กรรมการผู้ประเมิน', key: 'evaluator_name', sortable: true },
  { title: 'ผู้รับการประเมิน', key: 'evaluatee_name', sortable: true },
  { title: 'วันที่เริ่มต้น', key: 'start_date', sortable: true },
  { title: 'วันที่สิ้นสุด', key: 'end_date', sortable: true },
  { title: 'สถานะ', key: 'is_active', sortable: true },
  { title: 'วันที่สร้าง', key: 'created_at', sortable: true },
  { title: 'จัดการ', key: 'actions', sortable: false, align: 'center' }
];

const fetchAssignments = async () => {
  loading.value = true;
  try {
    const response = await assignmentService.getAll();
    assignments.value = response.data.items || response.data.data || [];
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดข้อมูลการมอบหมายได้');
  } finally {
    loading.value = false;
  }
};

const fetchUsers = async () => {
  try {
    const [evalResponse, evaluResponse] = await Promise.all([
      userService.getByRole('evaluator'),
      userService.getByRole('evaluatee')
    ]);
    evaluators.value = evalResponse.data.items || evalResponse.data.data || [];
    evaluatees.value = evaluResponse.data.items || evaluResponse.data.data || [];
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
  }
};

const isEdit = ref(false);
const editingId = ref(null);

const openDialog = (type, item = null) => {
  if (type === 'single') {
    if (item) {
      // Edit mode
      isEdit.value = true;
      editingId.value = item.id;
      // Format dates for date input (YYYY-MM-DD)
      const formatDateForInput = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      };
      singleForm.value = {
        evaluator_id: item.evaluator_id,
        evaluatee_id: item.evaluatee_id,
        start_date: formatDateForInput(item.start_date),
        end_date: formatDateForInput(item.end_date),
        is_active: item.is_active === 1 || item.is_active === true
      };
      console.log('[AssignmentsManage] Opening edit dialog:', {
        isEdit: isEdit.value,
        editingId: editingId.value,
        formData: singleForm.value
      });
    } else {
      // Create mode
      isEdit.value = false;
      editingId.value = null;
      singleForm.value = {
        evaluator_id: null,
        evaluatee_id: null,
        start_date: null,
        end_date: null,
        is_active: true
      };
      console.log('[AssignmentsManage] Opening create dialog');
    }
    singleDialog.value = true;
  } else {
    bulkForm.value = {
      evaluator_ids: [],
      evaluatee_ids: [],
      start_date: null,
      end_date: null,
      is_active: true
    };
    bulkDialog.value = true;
  }
};

const handleSaveSingle = async () => {
  const { valid } = await singleFormRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    // Debug: ตรวจสอบค่า isEdit และ editingId
    console.log('[AssignmentsManage] handleSaveSingle:', {
      isEdit: isEdit.value,
      editingId: editingId.value,
      formData: singleForm.value
    });

    // ตรวจสอบว่าเป็น edit mode หรือไม่ (ตรวจสอบทั้ง isEdit และ editingId)
    const isEditMode = isEdit.value && editingId.value;
    
    if (isEditMode) {
      // Edit mode: ใช้ PUT /api/assignments/:id
      console.log('[AssignmentsManage] Updating assignment:', editingId.value);
      await assignmentService.update(editingId.value, singleForm.value);
      notificationStore.success('แก้ไขการมอบหมายสำเร็จ');
    } else {
      // Create mode: ใช้ POST /api/assignments
      console.log('[AssignmentsManage] Creating new assignment');
      await assignmentService.create(singleForm.value);
      notificationStore.success('มอบหมายงานสำเร็จ');
    }
    singleDialog.value = false;
    // Reset form state
    isEdit.value = false;
    editingId.value = null;
    await fetchAssignments();
  } catch (error) {
    console.error('[AssignmentsManage] Save error:', error);
    notificationStore.error(error.response?.data?.message || 'เกิดข้อผิดพลาด');
  } finally {
    saving.value = false;
  }
};

const handleSaveBulk = async () => {
  const { valid } = await bulkFormRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    // แปลง evaluator_ids และ evaluatee_ids เป็น items array (เพิ่ม start_date, end_date, is_active)
    const items = [];
    for (const evaluatorId of bulkForm.value.evaluator_ids) {
      for (const evaluateeId of bulkForm.value.evaluatee_ids) {
        items.push({
          evaluator_id: evaluatorId,
          evaluatee_id: evaluateeId,
          start_date: bulkForm.value.start_date,
          end_date: bulkForm.value.end_date,
          is_active: bulkForm.value.is_active ? 1 : 0
        });
      }
    }

    const response = await assignmentService.createBulk({ items });
    const result = response.data.data;

    // แสดงผลลัพธ์
    if (result.skipped > 0) {
      notificationStore.success(
        `สร้างสำเร็จ ${result.created} รายการ, ข้าม ${result.skipped} รายการที่ซ้ำ (จากทั้งหมด ${result.total} รายการ)`
      );
    } else {
      notificationStore.success(`มอบหมายงานแบบ Bulk สำเร็จ (${result.created} รายการ)`);
    }

    bulkDialog.value = false;
    await fetchAssignments();
  } catch (error) {
    notificationStore.error(error.response?.data?.message || 'เกิดข้อผิดพลาด');
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (item) => {
  saving.value = true;
  try {
    await assignmentService.update(item.id, { is_active: !item.is_active });
    notificationStore.success('เปลี่ยนสถานะสำเร็จ');
    await fetchAssignments();
  } catch (error) {
    notificationStore.error('ไม่สามารถเปลี่ยนสถานะได้');
  } finally {
    saving.value = false;
  }
};

const handleCancelSingle = () => {
  singleDialog.value = false;
  // Reset form state when canceling
  isEdit.value = false;
  editingId.value = null;
  singleForm.value = {
    evaluator_id: null,
    evaluatee_id: null,
    start_date: null,
    end_date: null,
    is_active: true
  };
};

const confirmDelete = (item) => {
  deleteItem.value = item;
  deleteDialog.value = true;
};

const handleDelete = async () => {
  deleting.value = true;
  try {
    await assignmentService.delete(deleteItem.value.id);
    notificationStore.success('ลบการมอบหมายสำเร็จ');
    deleteDialog.value = false;
    await fetchAssignments();
  } catch (error) {
    notificationStore.error('ไม่สามารถลบได้');
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  await fetchUsers();
  await fetchAssignments();
});
</script>
