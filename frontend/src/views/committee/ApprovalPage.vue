<template>
  <v-container fluid>
    <v-btn variant="text" color="primary" to="/evaluator" class="mb-2">
      <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
    </v-btn>
    <h1 class="text-h4 mb-4">ประวัติการประเมิน</h1>
    <v-card class="mb-4 pa-4">
      <div class="d-flex align-center">
        <v-icon icon="mdi-check-circle" color="success" class="mr-2"></v-icon>
        <div>
          <div class="text-h6">การประเมินที่เสร็จสมบูรณ์</div>
          <div class="text-caption text-grey">รายการที่ประเมินและลงนามแล้ว</div>
        </div>
      </div>
    </v-card>
    <BaseTable :headers="headers" :items="filteredItems" :loading="loading">
      <template #item.select="{ item }">
        <v-checkbox-btn v-if="selectedTab === 'pending'" :model-value="isSelected(item)" @update:model-value="toggleSelect(item)" hide-details></v-checkbox-btn>
      </template>
      <template #item.total_score="{ item }">
        <span class="font-weight-bold">{{ item.total_score || '-' }}</span>
      </template>
      <template #item.signed_at="{ item }">
        <div v-if="item.signed_at" class="text-caption">
          <v-icon icon="mdi-pen" size="small" color="success" class="mr-1"></v-icon>
          {{ formatDateTime(item.signed_at) }}
        </div>
        <span v-else class="text-grey">-</span>
      </template>
      <template #item.actions="{ item }">
        <v-btn color="primary" size="small" variant="tonal" @click="goToReview(item)">
          <v-icon icon="mdi-eye" start></v-icon>ดูรายละเอียด
        </v-btn>
      </template>
    </BaseTable>
    <BaseDialog v-model="approveDialog.show" :title="approveDialog.isBulk ? 'ยืนยันการอนุมัติหลายรายการ' : 'ยืนยันการอนุมัติ'" icon="mdi-check-circle" confirm-text="อนุมัติ" confirm-color="success" :loading="approving" @confirm="handleApprove" @cancel="closeApproveDialog">
      <div v-if="approveDialog.isBulk">
        <p>คุณต้องการอนุมัติการประเมินจำนวน <strong>{{ approveDialog.items.length }}</strong> รายการ ใช่หรือไม่?</p>
        <v-list density="compact" class="mt-3">
          <v-list-item v-for="item in approveDialog.items" :key="item.id">
            <template #prepend><v-icon icon="mdi-account" color="primary"></v-icon></template>
            <v-list-item-title>{{ item.full_name }}</v-list-item-title>
            <v-list-item-subtitle>{{ item.assignment_info }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
      <div v-else>
        <p>คุณต้องการอนุมัติการประเมินของ</p>
        <v-card class="mt-3 pa-3" variant="tonal">
          <div><strong>ชื่อ:</strong> {{ approveDialog.items[0]?.full_name }}</div>
          <div><strong>รอบการประเมิน:</strong> {{ approveDialog.items[0]?.assignment_info }}</div>
          <div><strong>คะแนนรวม:</strong> {{ approveDialog.items[0]?.total_score }}</div>
        </v-card>
      </div>
    </BaseDialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import BaseTable from '@/components/base/BaseTable.vue';
import BaseDialog from '@/components/base/BaseDialog.vue';
import StatusChip from '@/components/base/StatusChip.vue';
import assignmentService from '@/services/assignmentService';
import evaluationService from '@/services/evaluationService';
import signatureService from '@/services/signatureService';
import { formatDateTime } from '@/utils/helpers';

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const loading = ref(false);
const approving = ref(false);
const selectedTab = ref('approved'); // Changed to approved since auto-approve is enabled
const assignments = ref([]);
const evaluations = ref([]);
const signatures = ref([]);
const selected = ref([]);
const approveDialog = ref({ show: false, isBulk: false, items: [] });

const headers = [
  { title: 'ชื่อ-สกุล', key: 'full_name', sortable: true },
  { title: 'รอบการประเมิน', key: 'assignment_info', sortable: true },
  { title: 'คะแนนรวม', key: 'total_score', sortable: true, align: 'center' },
  { title: 'ลงนามเมื่อ', key: 'signed_at', sortable: true, align: 'center' },
  { title: 'จัดการ', key: 'actions', sortable: false, align: 'center' }
];

// Combine assignments with their evaluation status
const combinedData = computed(() => {
  console.log('[ApprovalPage] assignments:', assignments.value);
  console.log('[ApprovalPage] evaluations:', evaluations.value);

  return assignments.value.map(assignment => {
    // Get all evaluation results for this assignment
    const results = evaluations.value.filter(
      e => e.evaluatee_id === assignment.evaluatee_id && e.assignment_id === assignment.id
    );

    // Determine evaluation status
    let status = 'pending';
    let totalScore = 0;
    let signedAt = null;

    if (results.length > 0) {
      const allEvaluated = results.every(r => r.evaluator_score !== null && r.evaluator_score !== undefined);
      const anyApproved = results.some(r => r.status === 'approved');

      if (anyApproved) {
        status = 'approved';
      } else if (allEvaluated) {
        status = 'evaluated';
      }

      // Calculate total score
      totalScore = results.reduce((sum, r) => sum + (parseFloat(r.evaluator_score) || 0), 0);
    }

    // Find signature for this evaluatee and assignment
    const signature = signatures.value.find(
      s => s.evaluatee_id === assignment.evaluatee_id && s.assignment_id === assignment.id
    );
    if (signature) {
      signedAt = signature.signed_at;
    }

    // Format assignment info from start_date and end_date
    const assignmentInfo = assignment.start_date && assignment.end_date
      ? `${new Date(assignment.start_date).toLocaleDateString('th-TH')} - ${new Date(assignment.end_date).toLocaleDateString('th-TH')}`
      : 'ไม่ระบุช่วงเวลา';

    return {
      id: `${assignment.evaluatee_id}-${assignment.id}`,
      evaluatee_id: assignment.evaluatee_id,
      assignment_id: assignment.id,
      full_name: assignment.evaluatee_name || '-',
      assignment_info: assignmentInfo,
      total_score: totalScore.toFixed(2),
      status: status,
      signed_at: signedAt,
      results: results
    };
  });
});

const filteredItems = computed(() => {
  const targetStatus = selectedTab.value === 'pending' ? 'evaluated' : 'approved';
  return combinedData.value.filter(item => item.status === targetStatus);
});

const counts = computed(() => ({
  pending: combinedData.value.filter(item => item.status === 'evaluated').length,
  approved: combinedData.value.filter(item => item.status === 'approved').length
}));

const isSelected = (item) => selected.value.some(s => s.id === item.id);

const toggleSelect = (item) => {
  const index = selected.value.findIndex(s => s.id === item.id);
  index > -1 ? selected.value.splice(index, 1) : selected.value.push(item);
};

const goToReview = (item) => router.push(`/evaluator/review/${item.evaluatee_id}/${item.assignment_id}`);

const openApproveDialog = (item) => {
  approveDialog.value = { show: true, isBulk: false, items: [item] };
};

const openBulkApproveDialog = () => {
  approveDialog.value = { show: true, isBulk: true, items: [...selected.value] };
};

const closeApproveDialog = () => {
  approveDialog.value = { show: false, isBulk: false, items: [] };
};

const handleApprove = async () => {
  approving.value = true;
  try {
    const items = approveDialog.value.items;

    // Approve all evaluation results for each item
    for (const item of items) {
      if (item.results && item.results.length > 0) {
        await Promise.all(item.results.map(result =>
          // Update each evaluation result to approved status
          evaluationService.evaluate({
            evaluatee_id: item.evaluatee_id,
            indicator_id: result.indicator_id,
            assignment_id: item.assignment_id,
            score: result.evaluator_score
          })
        ));
      }
    }

    notificationStore.success(`อนุมัติการประเมินสำเร็จ ${items.length} รายการ`);
    selected.value = [];
    closeApproveDialog();
    await fetchData();
  } catch (error) {
    console.error('[ApprovalPage] Approve error:', error);
    notificationStore.error('ไม่สามารถอนุมัติได้: ' + (error.response?.data?.message || error.message));
  } finally {
    approving.value = false;
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    console.log('[ApprovalPage] Fetching data...');
    const assignmentsRes = await assignmentService.getMine();
    assignments.value = assignmentsRes.data.items || assignmentsRes.data.data || [];

    console.log('[ApprovalPage] Assignments:', assignments.value);

    // Fetch evaluations for each assignment
    const evaluationPromises = assignments.value.map(assignment =>
      evaluationService.getByEvaluatee(assignment.evaluatee_id, assignment.id)
        .then(res => res.data.items || res.data.data || [])
        .catch(err => {
          console.error(`[ApprovalPage] Error fetching evaluations for ${assignment.evaluatee_id}:`, err);
          return [];
        })
    );

    const evaluationResults = await Promise.all(evaluationPromises);
    evaluations.value = evaluationResults.flat();

    console.log('[ApprovalPage] Evaluations:', evaluations.value);

    // Fetch signatures for each assignment
    const signaturePromises = assignments.value.map(assignment =>
      signatureService.getByEvaluatee(assignment.evaluatee_id, assignment.id)
        .then(res => {
          const sigs = res.data.items || res.data.data || [];
          // Add evaluatee_id and assignment_id to each signature for matching
          return sigs.map(sig => ({
            ...sig,
            evaluatee_id: assignment.evaluatee_id,
            assignment_id: assignment.id
          }));
        })
        .catch(err => {
          console.error(`[ApprovalPage] Error fetching signatures for ${assignment.evaluatee_id}:`, err);
          return [];
        })
    );

    const signatureResults = await Promise.all(signaturePromises);
    signatures.value = signatureResults.flat();

    console.log('[ApprovalPage] Signatures:', signatures.value);
  } catch (error) {
    console.error('[ApprovalPage] Fetch error:', error);
    notificationStore.error('ไม่สามารถโหลดข้อมูลได้: ' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);
</script>

<style scoped>
.ml-2 {
  margin-left: 8px;
}

@media print {
  .v-btn, .v-select, [class*="actions"] {
    display: none !important;
  }
}
</style>
