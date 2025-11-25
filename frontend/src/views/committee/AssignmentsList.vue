<template>
  <v-container fluid>
    <v-btn variant="text" color="primary" to="/evaluator" class="mb-2">
      <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
    </v-btn>
    <h1 class="text-h4 mb-4">รายการงานประเมินที่ได้รับมอบหมาย</h1>

    <v-card class="mb-4">
      <v-tabs v-model="selectedTab" bg-color="primary">
        <v-tab value="all">
          ทั้งหมด
          <v-badge v-if="counts.all > 0" :content="counts.all" color="white" text-color="primary" inline class="ml-2"></v-badge>
        </v-tab>
        <v-tab value="pending">
          รอประเมิน
          <v-badge v-if="counts.pending > 0" :content="counts.pending" color="warning" inline class="ml-2"></v-badge>
        </v-tab>
        <v-tab value="approved">
          อนุมัติแล้ว
          <v-badge v-if="counts.approved > 0" :content="counts.approved" color="success" inline class="ml-2"></v-badge>
        </v-tab>
      </v-tabs>
    </v-card>

    <BaseTable :headers="headers" :items="filteredItems" :loading="loading">
      <template #item.submission_status="{ item }">
        <v-chip
          :color="item.submission_status === 'submitted' ? 'blue' : 'grey'"
          size="small"
          variant="flat"
        >
          {{ item.submission_status === 'submitted' ? 'ส่งแล้ว' : 'ยังไม่ส่ง' }}
        </v-chip>
      </template>

      <template #item.actions="{ item }">
        <v-btn
          color="primary"
          size="small"
          variant="tonal"
          @click="goToEvaluate(item)"
        >
          <v-icon icon="mdi-clipboard-edit" start></v-icon>
          ประเมิน
        </v-btn>
      </template>
    </BaseTable>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notification';
import BaseTable from '@/components/base/BaseTable.vue';
import StatusChip from '@/components/base/StatusChip.vue';
import assignmentService from '@/services/assignmentService';
import evaluationService from '@/services/evaluationService';

const router = useRouter();
const notificationStore = useNotificationStore();

const loading = ref(false);
const selectedTab = ref('all');
const assignments = ref([]);
const evaluations = ref([]);

const headers = [
  { title: 'ชื่อ-สกุล', key: 'full_name', sortable: true },
  { title: 'รอบการประเมิน', key: 'assignment_info', sortable: true },
  { title: 'สถานะการส่งงาน', key: 'submission_status', sortable: true, align: 'center' },
  { title: 'จัดการ', key: 'actions', sortable: false, align: 'center' }
];

// รวมข้อมูล assignments และ evaluations
const combinedData = computed(() => {
  console.log('[AssignmentsList] assignments:', assignments.value);
  console.log('[AssignmentsList] evaluations:', evaluations.value);

  return assignments.value.map(assignment => {
    // Get all evaluation results for this assignment
    const results = evaluations.value.filter(
      e => e.evaluatee_id === assignment.evaluatee_id && e.assignment_id === assignment.id
    );

    console.log(`[AssignmentsList] Assignment ${assignment.evaluatee_name} (${assignment.evaluatee_id}/${assignment.id}):`, {
      resultsCount: results.length,
      results: results,
      selfScores: results.map(r => r.self_score)
    });

    // Determine submission and evaluation status
    let submissionStatus = 'not_submitted';
    let evaluationStatus = 'pending';

    if (results.length > 0) {
      const anySubmitted = results.some(r => r.self_score !== null && r.self_score !== undefined);
      const anyApproved = results.some(r => r.status === 'approved');

      console.log(`[AssignmentsList] Status check for ${assignment.evaluatee_name}:`, {
        anySubmitted,
        anyApproved
      });

      if (anySubmitted) {
        submissionStatus = 'submitted';
      }

      if (anyApproved) {
        evaluationStatus = 'approved';
      } else if (anySubmitted) {
        evaluationStatus = 'pending'; // Submitted but not approved yet
      }
    }

    // Format assignment info from start_date and end_date
    const assignmentInfo = assignment.start_date && assignment.end_date
      ? `${new Date(assignment.start_date).toLocaleDateString('th-TH')} - ${new Date(assignment.end_date).toLocaleDateString('th-TH')}`
      : 'ไม่ระบุช่วงเวลา';

    return {
      id: assignment.id,
      evaluatee_id: assignment.evaluatee_id,
      assignment_id: assignment.id,
      full_name: assignment.evaluatee_name || '-',
      assignment_info: assignmentInfo,
      submission_status: submissionStatus,
      evaluation_status: evaluationStatus
    };
  });
});

// กรองตาม tab ที่เลือก
const filteredItems = computed(() => {
  if (selectedTab.value === 'all') {
    return combinedData.value;
  }
  return combinedData.value.filter(item => item.evaluation_status === selectedTab.value);
});

// นับจำนวนแต่ละสถานะ
const counts = computed(() => ({
  all: combinedData.value.length,
  pending: combinedData.value.filter(item => item.evaluation_status === 'pending').length,
  approved: combinedData.value.filter(item => item.evaluation_status === 'approved').length
}));

// ไปหน้าประเมิน
const goToEvaluate = (item) => {
  router.push(`/evaluator/review/${item.evaluatee_id}/${item.assignment_id}`);
};

// โหลดข้อมูล
const fetchData = async () => {
  loading.value = true;
  try {
    const assignmentsRes = await assignmentService.getMine();
    assignments.value = assignmentsRes.data.items || assignmentsRes.data.data || [];

    // Fetch evaluations for each assignment
    const evaluationPromises = assignments.value.map(assignment =>
      evaluationService.getByEvaluatee(assignment.evaluatee_id, assignment.id)
        .then(res => res.data.items || res.data.data || [])
        .catch(() => [])
    );

    const evaluationResults = await Promise.all(evaluationPromises);
    evaluations.value = evaluationResults.flat();
  } catch (error) {
    console.error('[AssignmentsList] Error fetching data:', error);
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
</style>
