<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-btn variant="text" color="primary" to="/admin" class="mb-2">
          <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
        </v-btn>
        <div class="d-flex justify-space-between align-center mb-4">
          <h1 class="text-h4">รายงานการประเมิน</h1>
          <v-btn color="primary" @click="exportPDF" :disabled="!selectedAssignment">
            <v-icon icon="mdi-printer" start></v-icon>Export PDF
          </v-btn>
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="6">
        <v-select v-model="selectedAssignment" :items="assignments" :item-title="(item) => formatAssignmentInfo(item)"
          item-value="id" label="เลือกรอบการประเมิน" variant="outlined"
          density="comfortable" prepend-inner-icon="mdi-calendar"
          @update:model-value="fetchReportData"></v-select>
      </v-col>
    </v-row>
    <v-row v-if="selectedAssignment">
      <v-col cols="12" md="3">
        <v-card color="primary">
          <v-card-text class="text-white">
            <div class="text-subtitle-1">ผู้รับการประเมินทั้งหมด</div>
            <div class="text-h3">{{ statistics.totalEvaluatees }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="blue">
          <v-card-text class="text-white">
            <div class="text-subtitle-1">จำนวนที่ส่งแล้ว</div>
            <div class="text-h3">{{ statistics.submitted }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="orange">
          <v-card-text class="text-white">
            <div class="text-subtitle-1">จำนวนที่ประเมินแล้ว</div>
            <div class="text-h3">{{ statistics.evaluated }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="success">
          <v-card-text class="text-white">
            <div class="text-subtitle-1">อัตราการส่งงาน</div>
            <div class="text-h3">{{ statistics.submissionRate }}%</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="selectedAssignment" class="mt-4">
      <v-col cols="12">
        <base-card title="รายงานรายบุคคล" icon="mdi-table">
          <base-table :headers="headers" :items="reportItems" :loading="loading">
            <template #item.full_name="{ item }">
              <div class="font-weight-medium">{{ item.full_name }}</div>
            </template>
            <template #item.status="{ item }">
              <status-chip :status="item.status" />
            </template>
            <template #item.total_score="{ item }">
              <div v-if="item.total_score !== null" class="text-center">
                <span class="font-weight-bold text-h6" :class="getScoreColor(item.total_score)">
                  {{ item.total_score.toFixed(2) }}
                </span>
                <span class="text-caption text-grey ml-1">/ 100</span>
              </div>
              <span v-else class="text-grey">-</span>
            </template>
            <template #item.signed_at="{ item }">
              <div v-if="item.signed_at" class="text-caption">
                <v-icon icon="mdi-pen" size="small" color="success" class="mr-1"></v-icon>
                {{ formatDateTime(item.signed_at) }}
              </div>
              <span v-else class="text-grey">-</span>
            </template>
          </base-table>
        </base-card>
      </v-col>
    </v-row>
    <loading-overlay v-model="loading" message="กำลังโหลดข้อมูล..." />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import assignmentService from '@/services/assignmentService';
import evaluationService from '@/services/evaluationService';
import signatureService from '@/services/signatureService';
import BaseCard from '@/components/base/BaseCard.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import StatusChip from '@/components/base/StatusChip.vue';
import LoadingOverlay from '@/components/base/LoadingOverlay.vue';
import { formatDateTime } from '@/utils/helpers';

const notificationStore = useNotificationStore();
const loading = ref(false);
const assignments = ref([]);
const selectedAssignment = ref(null);
const reportData = ref([]);
const signatures = ref([]);

const headers = [
  { title: 'ชื่อ-นามสกุล', key: 'full_name', sortable: true },
  { title: 'สถานะ', key: 'status', sortable: true },
  { title: 'คะแนนรวม', key: 'total_score', sortable: true, align: 'center' },
  { title: 'ลงนามเมื่อ', key: 'signed_at', sortable: true, align: 'center' }
];

// Format assignment info for display
const formatAssignmentInfo = (assignment) => {
  if (assignment.start_date && assignment.end_date) {
    return `${new Date(assignment.start_date).toLocaleDateString('th-TH')} - ${new Date(assignment.end_date).toLocaleDateString('th-TH')}`;
  }
  return 'ไม่ระบุช่วงเวลา';
};

const reportItems = computed(() => reportData.value.map(item => {
  // Find signature for this evaluatee
  const signature = signatures.value.find(s =>
    s.evaluatee_id === item.evaluatee_id && s.assignment_id === selectedAssignment.value
  );

  return {
    evaluatee_id: item.evaluatee_id,
    full_name: item.evaluatee_name || item.name_th || '-',
    status: item.status || 'draft',
    total_score: item.total_score,
    signed_at: signature?.signed_at || null
  };
}));

const statistics = computed(() => {
  const total = reportItems.value.length;
  const submitted = reportItems.value.filter(item =>
    ['submitted', 'evaluated', 'approved'].includes(item.status)).length;
  const evaluated = reportItems.value.filter(item =>
    ['evaluated', 'approved'].includes(item.status)).length;
  const submissionRate = total > 0 ? ((submitted / total) * 100).toFixed(1) : 0;
  return { totalEvaluatees: total, submitted, evaluated, submissionRate };
});

const getScoreColor = (score) => {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-error';
};

const exportPDF = () => {
  if (!selectedAssignment.value) {
    notificationStore.error('กรุณาเลือกรอบการประเมินก่อน');
    return;
  }
  window.print();
};

const fetchAssignments = async () => {
  try {
    const response = await assignmentService.getAll();
    const allAssignments = response.data.items || response.data.data || [];
    // Filter เฉพาะ assignments ที่ is_active = 1
    assignments.value = allAssignments.filter(a => a.is_active === 1);
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดรอบการประเมินได้');
  }
};

const fetchReportData = async () => {
  if (!selectedAssignment.value) return;
  loading.value = true;
  try {
    // Fetch all assignments for this assignment to get evaluatee list
    const assignmentsRes = await evaluationService.getAll();
    const allResults = assignmentsRes.data.items || assignmentsRes.data.data || [];

    // Filter by assignment and group by evaluatee
    const evaluateeIds = [...new Set(
      allResults
        .filter(r => r.assignment_id === selectedAssignment.value)
        .map(r => r.evaluatee_id)
    )];

    console.log('[ReportsView] Evaluatee IDs:', evaluateeIds);

    // Fetch summary for each evaluatee
    const summaryPromises = evaluateeIds.map(evaluateeId => {
      // แปลงเป็น number เพื่อให้แน่ใจว่า API รับ parameter ถูกต้อง
      const evaluateeIdNum = parseInt(evaluateeId);
      const assignmentIdNum = parseInt(selectedAssignment.value);
      
      console.log(`[ReportsView] Fetching summary for evaluatee ${evaluateeIdNum}, assignment ${assignmentIdNum}`);
      
      return evaluationService.getSummary(evaluateeIdNum, assignmentIdNum)
        .then(res => {
          // คะแนนที่ได้จาก calculateFinal คือคะแนนรวมที่ normalize เป็น 100 แล้ว
          // total_score ควรจะอยู่ในช่วง 0-100
          let totalScore = res.data.data?.total_score ?? res.data.data?.evaluator_total ?? 0;
          
          // แปลงเป็น number เพื่อให้แน่ใจ
          totalScore = parseFloat(totalScore) || 0;
          
          // Backend จะ normalize คะแนนเป็น 100 แล้ว
          // ถ้าคะแนนเกิน 100 มาก (เช่น 875.00) แสดงว่ามีปัญหาในการคำนวณ
          if (totalScore > 1000) {
            console.warn(`[ReportsView] Invalid score detected: ${totalScore} for evaluatee ${evaluateeIdNum}`);
            totalScore = 0;
          } else if (totalScore > 100) {
            // ถ้าคะแนนเกิน 100 แต่ไม่เกิน 1000 อาจเป็นเพราะ normalize ผิด
            // ให้ cap ที่ 100
            console.warn(`[ReportsView] Score exceeds 100: ${totalScore}, capping to 100`);
            totalScore = 100;
          }
          
          console.log(`[ReportsView] Summary for ${evaluateeIdNum}:`, {
            total_score: totalScore,
            evaluator_total: res.data.data?.evaluator_total,
            self_total: res.data.data?.self_total,
            total_weight: res.data.data?.total_weight,
            raw_data: res.data.data
          });
          
          return {
            evaluatee_id: evaluateeIdNum,
            evaluatee_name: res.data.data?.evaluatee_name || '-',
            total_score: totalScore,
            status: res.data.data?.status || 'draft'
          };
        })
        .catch(err => {
          console.error(`[ReportsView] Error fetching summary for ${evaluateeIdNum}:`, err);
          console.error(`[ReportsView] Error details:`, err.response?.data || err.message);
          return {
            evaluatee_id: evaluateeIdNum,
            evaluatee_name: '-',
            total_score: 0,
            status: 'draft'
          };
        });
    });

    const summaries = await Promise.all(summaryPromises);

    // Get evaluatee names from results if not in summary
    summaries.forEach(summary => {
      if (summary.evaluatee_name === '-') {
        const result = allResults.find(r => r.evaluatee_id === summary.evaluatee_id);
        if (result) {
          summary.evaluatee_name = result.evaluatee_name || result.name_th || '-';
        }
      }

      // Determine status from results if not in summary
      if (summary.status === 'draft') {
        const evaluateeResults = allResults.filter(r =>
          r.evaluatee_id === summary.evaluatee_id &&
          r.assignment_id === selectedAssignment.value
        );
        const anyApproved = evaluateeResults.some(r => r.status === 'approved');
        const anyEvaluated = evaluateeResults.some(r => r.evaluator_score !== null);
        const anySubmitted = evaluateeResults.some(r => r.self_score !== null);

        if (anyApproved) summary.status = 'approved';
        else if (anyEvaluated) summary.status = 'evaluated';
        else if (anySubmitted) summary.status = 'submitted';
      }
    });

    console.log('[ReportsView] Summaries:', summaries);
    reportData.value = summaries;

    // Fetch signatures for each evaluatee
    const signaturePromises = evaluateeIds.map(evaluateeId =>
      signatureService.getByEvaluatee(evaluateeId, selectedAssignment.value)
        .then(res => {
          const sigs = res.data.items || res.data.data || [];
          return sigs.map(sig => ({
            ...sig,
            evaluatee_id: evaluateeId,
            assignment_id: selectedAssignment.value
          }));
        })
        .catch(err => {
          console.error(`[ReportsView] Error fetching signatures for ${evaluateeId}:`, err);
          return [];
        })
    );

    const signatureResults = await Promise.all(signaturePromises);
    signatures.value = signatureResults.flat();

    console.log('[ReportsView] Signatures:', signatures.value);
  } catch (error) {
    console.error('[ReportsView] Fetch error:', error);
    notificationStore.error('ไม่สามารถโหลดข้อมูลรายงานได้');
  } finally {
    loading.value = false;
  }
};

onMounted(() => { fetchAssignments(); });
</script>

<style scoped>
@media print {
  .v-btn, .v-select, [class*="actions"] { display: none !important; }
}
</style>
