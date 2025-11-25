<template>
  <v-container fluid>
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <v-btn variant="text" color="primary" to="/admin" class="mb-2">
          <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
        </v-btn>
        <h1 class="text-h4">จัดการผู้ใช้</h1>
      </div>
      <v-btn color="primary" @click="openCreateDialog">
        <v-icon icon="mdi-plus" start></v-icon>เพิ่มผู้ใช้
      </v-btn>
    </div>

    <BaseTable :headers="headers" :items="users" :loading="loading" :items-per-page="15">
      <template #item.role="{ item }">
        <v-chip :color="getRoleColor(item.role)" size="small">{{ getRoleText(item.role) }}</v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" color="primary" @click="openEditDialog(item)"></v-btn>
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDeleteDialog(item)"></v-btn>
      </template>
    </BaseTable>

    <BaseDialog
      v-model="dialog"
      :title="isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'"
      :icon="isEdit ? 'mdi-pencil' : 'mdi-plus'"
      :loading="saving"
      @confirm="handleSave"
      @cancel="closeDialog">
      <v-form ref="formRef" @submit.prevent="handleSave">
        <v-text-field v-model="form.name_th" label="ชื่อ-นามสกุล" :rules="[v => !!v || 'กรุณากรอกชื่อ-นามสกุล']" required></v-text-field>
        <v-text-field v-model="form.email" label="อีเมล" type="email" :rules="emailRules" required></v-text-field>
        <v-text-field v-if="!isEdit" v-model="form.password" label="รหัสผ่าน" type="password" :rules="[v => !!v || 'กรุณากรอกรหัสผ่าน']" required></v-text-field>
        <v-select v-model="form.role" label="บทบาท" :items="roles" item-title="text" item-value="value" :rules="[v => !!v || 'กรุณาเลือกบทบาท']" required></v-select>
      </v-form>
    </BaseDialog>

    <BaseDialog v-model="deleteDialog" title="ยืนยันการลบ" icon="mdi-delete" confirm-text="ลบ" confirm-color="error" :loading="deleting" @confirm="handleDelete" @cancel="deleteDialog = false">
      <v-alert type="warning" variant="tonal">
        คุณต้องการลบผู้ใช้ <strong>{{ selectedUser?.name_th }}</strong> ใช่หรือไม่?<br>การกระทำนี้ไม่สามารถยกเลิกได้
      </v-alert>
    </BaseDialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import userService from '@/services/userService';
import BaseTable from '@/components/base/BaseTable.vue';
import BaseDialog from '@/components/base/BaseDialog.vue';

const notificationStore = useNotificationStore();
const loading = ref(false), saving = ref(false), deleting = ref(false);
const dialog = ref(false), deleteDialog = ref(false), isEdit = ref(false);
const users = ref([]), selectedUser = ref(null), formRef = ref(null);
const form = ref({ name_th: '', email: '', password: '', role: '' });

const headers = [
  { title: 'ชื่อ-นามสกุล', key: 'name_th' },
  { title: 'อีเมล', key: 'email' },
  { title: 'บทบาท', key: 'role', align: 'center' },
  { title: 'จัดการ', key: 'actions', align: 'center', sortable: false }
];

const roles = [
  { text: 'ผู้ดูแลระบบ', value: 'admin' },
  { text: 'ผู้ประเมิน', value: 'evaluator' },
  { text: 'ผู้ถูกประเมิน', value: 'evaluatee' }
];

const emailRules = [v => !!v || 'กรุณากรอกอีเมล', v => /.+@.+\..+/.test(v) || 'รูปแบบอีเมลไม่ถูกต้อง'];

const getRoleColor = (role) => ({ admin: 'error', evaluator: 'primary', evaluatee: 'success' }[role] || 'grey');
const getRoleText = (role) => ({ admin: 'ผู้ดูแลระบบ', evaluator: 'ผู้ประเมิน', evaluatee: 'ผู้ถูกประเมิน' }[role] || role);

const fetchUsers = async () => {
  loading.value = true;
  try {
    const response = await userService.getAll();
    users.value = response.data.items || response.data.data || [];
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
  } finally {
    loading.value = false;
  }
};

const resetForm = () => ({ name_th: '', email: '', password: '', role: '' });

const openCreateDialog = () => {
  isEdit.value = false;
  form.value = resetForm();
  dialog.value = true;
};

const openEditDialog = (user) => {
  isEdit.value = true;
  selectedUser.value = user;
  form.value = { ...user };
  dialog.value = true;
};

const openDeleteDialog = (user) => {
  selectedUser.value = user;
  deleteDialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
  form.value = resetForm();
  selectedUser.value = null;
};

const handleSave = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    if (isEdit.value) {
      await userService.update(selectedUser.value.id, form.value);
      notificationStore.success('แก้ไขผู้ใช้สำเร็จ');
    } else {
      await userService.create(form.value);
      notificationStore.success('เพิ่มผู้ใช้สำเร็จ');
    }
    closeDialog();
    await fetchUsers();
  } catch (error) {
    notificationStore.error(error.response?.data?.message || 'เกิดข้อผิดพลาด');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async () => {
  deleting.value = true;
  try {
    await userService.delete(selectedUser.value.id);
    notificationStore.success('ลบผู้ใช้สำเร็จ');
    deleteDialog.value = false;
    await fetchUsers();
  } catch (error) {
    notificationStore.error('ไม่สามารถลบผู้ใช้ได้');
  } finally {
    deleting.value = false;
  }
};

onMounted(fetchUsers);
</script>
