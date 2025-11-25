<template>
  <v-container fluid>
    <v-btn variant="text" color="primary" to="/evaluatee" class="mb-2">
      <v-icon icon="mdi-arrow-left" start></v-icon>กลับหน้าหลัก
    </v-btn>
    <div class="d-flex justify-space-between align-center mb-4">
      <h1 class="text-h4">รายงานผลการประเมิน</h1>
      <v-btn color="primary" @click="exportPDF" :disabled="!selectedAssignment">
        <v-icon icon="mdi-file-pdf-box" start></v-icon>Export PDF
      </v-btn>
    </div>
    <v-card class="mb-4">
      <v-card-text>
        <v-select v-model="selectedAssignment" :items="assignments" :item-title="(item) => formatAssignmentInfo(item)" item-value="id"
          label="เลือกรอบการประเมิน" variant="outlined" density="comfortable" @update:modelValue="fetchReportData" />
      </v-card-text>
    </v-card>
    <template v-if="selectedAssignment && !loading">
      <v-row>
        <v-col cols="12" md="4">
          <score-display :total-score="summary.totalScore" :max-score="summary.maxScore" :topic-scores="summary.topicScores" />
        </v-col>
        <v-col cols="12" md="8">
          <v-card>
            <v-card-title>สรุปผลการประเมิน</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <div class="text-subtitle-2 text-grey">คะแนนตนเอง</div>
                  <div class="text-h5 text-primary">{{ summary.selfTotal?.toFixed(2) || '0.00' }}</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-subtitle-2 text-grey">คะแนนจากกรรมการ</div>
                  <div class="text-h5 text-success">{{ summary.evaluatorTotal?.toFixed(2) || '0.00' }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-card class="mt-4">
        <v-card-title>รายละเอียดการประเมิน</v-card-title>
        <v-card-text>
          <base-table :headers="tableHeaders" :items="tableData" :loading="loading">
            <template #item.topic_name="{ item }">
              <span class="font-weight-bold">{{ item.topic_name }}</span>
            </template>
            <template #item.self_score="{ item }">
              <span class="text-primary">{{ item.self_score?.toFixed(2) || '-' }}</span>
            </template>
            <template #item.evaluator_score="{ item }">
              <span class="text-success">{{ item.evaluator_score?.toFixed(2) || '-' }}</span>
            </template>
            <template #item.difference="{ item }">
              <v-chip :color="getDifferenceColor(item.difference)" size="small" variant="flat">
                {{ item.difference?.toFixed(2) || '0.00' }}
              </v-chip>
            </template>
            <template #item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
                {{ getStatusText(item.status) }}
              </v-chip>
            </template>
          </base-table>
        </v-card-text>
      </v-card>
      <v-row class="mt-4">
        <v-col cols="12" md="6" v-for="type in commentTypes" :key="type.key">
          <v-card>
            <v-card-title :class="`bg-${type.color}-lighten-5`">
              <v-icon :icon="type.icon" start></v-icon>{{ type.title }}
            </v-card-title>
            <v-card-text>
              <div v-if="comments[type.key].length > 0">
                <div v-for="(c, i) in comments[type.key]" :key="i" class="mb-3 pa-3 bg-grey-lighten-5 rounded">
                  <div class="text-subtitle-2 font-weight-bold mb-1">{{ c.indicator_name }}</div>
                  <div class="text-body-2">{{ c.comment || 'ไม่มีความเห็น' }}</div>
                </div>
              </div>
              <v-alert v-else type="info" variant="tonal">{{ type.emptyText }}</v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <v-card-title class="bg-success-lighten-5">
              <v-icon icon="mdi-pen" start></v-icon>ลายเซ็นกรรมการผู้ประเมิน
            </v-card-title>
            <v-card-text>
              <div v-if="signature" class="pa-4 bg-grey-lighten-5 rounded">
                <div class="text-body-2 mb-2">
                  <div v-if="signature.evaluator_name || getEvaluatorNameFromData(signature)">
                    <strong>ลงนามโดย:</strong> {{ signature.evaluator_name || getEvaluatorNameFromData(signature) }}
                  </div>
                  <div>
                    <strong>ตำแหน่ง:</strong> กรรมการประเมิน
                  </div>
                  <div>
                    <strong>ลงนามเมื่อ:</strong> {{ formatDateTime(signature.signed_at) }}
                  </div>
                </div>
              </div>
              <v-alert v-else type="info" variant="tonal">
                <v-icon icon="mdi-information" start></v-icon>
                ยังไม่มีลายเซ็นกรรมการ (รอการอนุมัติ)
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
    <v-alert v-else-if="!selectedAssignment && !loading" type="info" variant="tonal" class="mt-4">
      กรุณาเลือกรอบการประเมินเพื่อดูรายงาน
    </v-alert>
    <loading-overlay v-model="loading" message="กำลังโหลดข้อมูล..." />
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import assignmentService from '@/services/assignmentService';
import evaluationService from '@/services/evaluationService';
import signatureService from '@/services/signatureService';
import ScoreDisplay from '@/components/common/ScoreDisplay.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import LoadingOverlay from '@/components/base/LoadingOverlay.vue';
import { formatDateTime } from '@/utils/helpers';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const loading = ref(false);
const assignments = ref([]);
const selectedAssignment = ref(null);
const tableData = ref([]);
const summary = ref({ totalScore: 0, maxScore: 100, topicScores: [], selfTotal: 0, evaluatorTotal: 0 });
const comments = ref({ self: [], evaluator: [] });
const signature = ref(null);

const commentTypes = [
  { key: 'self', title: 'ความเห็นตนเอง', icon: 'mdi-account-edit', color: 'blue', emptyText: 'ไม่มีความเห็น' },
  { key: 'evaluator', title: 'ความเห็นจากกรรมการ', icon: 'mdi-account-check', color: 'green', emptyText: 'ยังไม่มีความเห็นจากกรรมการ' }
];

const tableHeaders = [
  { title: 'หัวข้อ', key: 'topic_name', sortable: true },
  { title: 'ตัวชี้วัด', key: 'indicator_name', sortable: true },
  { title: 'คะแนนตนเอง', key: 'self_score', sortable: true, align: 'center' },
  { title: 'คะแนนกรรมการ', key: 'evaluator_score', sortable: true, align: 'center' },
  { title: 'ส่วนต่าง', key: 'difference', sortable: true, align: 'center' },
  { title: 'สถานะ', key: 'status', sortable: true, align: 'center' }
];

// Format assignment info for display
const formatAssignmentInfo = (assignment) => {
  if (assignment.start_date && assignment.end_date) {
    return `${new Date(assignment.start_date).toLocaleDateString('th-TH')} - ${new Date(assignment.end_date).toLocaleDateString('th-TH')}`;
  }
  return 'ไม่ระบุช่วงเวลา';
};

const fetchAssignments = async () => {
  try {
    const response = await assignmentService.getMine();
    // Backend ส่ง { success: true, items: [...] }
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
    console.log('[MyReport] Fetching for assignment:', selectedAssignment.value);
    const [resultsRes, summaryRes] = await Promise.all([
      evaluationService.getMyResults(selectedAssignment.value),
      evaluationService.getSummary(authStore.user.id, selectedAssignment.value)
    ]);

    const results = resultsRes.data.items || resultsRes.data.data || [];
    const summaryData = summaryRes.data.data || {};

    console.log('[MyReport] Results:', results);
    console.log('[MyReport] Summary:', summaryData);

    tableData.value = results.map(r => ({
      topic_name: r.topic_title || r.topic_name || '-',
      indicator_name: r.indicator_name || '-',
      self_score: parseFloat(r.self_score) || 0,
      evaluator_score: parseFloat(r.evaluator_score) || 0,
      difference: (parseFloat(r.evaluator_score) || 0) - (parseFloat(r.self_score) || 0),
      status: r.evaluator_score !== null && r.evaluator_score !== undefined ? 'evaluated' : 'pending'
    }));

    summary.value = {
      totalScore: summaryData.total_score || summaryData.final_score || 0,
      maxScore: 100,
      topicScores: summaryData.topic_scores || [],
      selfTotal: summaryData.self_total || 0,
      evaluatorTotal: summaryData.evaluator_total || summaryData.total_score || 0
    };

    comments.value.self = results.filter(r => r.self_note).map(r => ({
      indicator_name: r.indicator_name,
      comment: r.self_note
    }));
    comments.value.evaluator = results.filter(r => r.evaluator_note).map(r => ({
      indicator_name: r.indicator_name,
      comment: r.evaluator_note
    }));

    // Fetch signature
    try {
      const signatureRes = await signatureService.getByEvaluatee(authStore.user.id, selectedAssignment.value);
      const signatures = signatureRes.data.items || signatureRes.data.data || [];
      signature.value = signatures.length > 0 ? signatures[0] : null;
      console.log('[MyReport] Signature:', signature.value);
      console.log('[MyReport] Signature evaluator_name:', signature.value?.evaluator_name);
      console.log('[MyReport] Signature evaluator_id:', signature.value?.evaluator_id);
      console.log('[MyReport] Signature signature_data:', signature.value?.signature_data);
    } catch (error) {
      console.log('[MyReport] No signature found or error:', error);
      signature.value = null;
    }
  } catch (error) {
    console.error('[MyReport] Fetch error:', error);
    notificationStore.error('ไม่สามารถโหลดข้อมูลรายงานได้: ' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
  }
};

const getDifferenceColor = (diff) => !diff ? 'grey' : diff > 0 ? 'success' : 'error';
const getStatusColor = (s) => ({ evaluated: 'success', pending: 'warning', draft: 'grey' }[s] || 'grey');
const getStatusText = (s) => ({ evaluated: 'ประเมินแล้ว', pending: 'รอการประเมิน', draft: 'ร่าง' }[s] || s);

// ดึงชื่อกรรมการจาก signature_data (fallback ถ้า evaluator_name ไม่มี)
const getEvaluatorNameFromData = (sig) => {
  if (!sig || !sig.signature_data) return null;
  
  try {
    const lines = sig.signature_data.split('\n');
    const nameLine = lines.find(line => line.includes('ลงนามโดย:'));
    if (nameLine) {
      const name = nameLine.replace('ลงนามโดย:', '').trim();
      if (name && name !== 'undefined' && name !== 'null') return name;
    }
  } catch (e) {
    console.error('[MyReport] Error parsing signature_data:', e);
  }
  
  return null;
};

const exportPDF = () => {
  if (!selectedAssignment.value) {
    notificationStore.error('กรุณาเลือกรอบการประเมินก่อน');
    return;
  }
  window.print();
};

onMounted(fetchAssignments);
</script>

<style scoped>
@media print {
  .v-btn, .v-select {
    display: none !important;
  }
}
</style>
