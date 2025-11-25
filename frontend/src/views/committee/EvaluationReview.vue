<template>
  <v-container fluid>
    <v-btn color="grey" variant="text" @click="$router.back()" class="mb-4">
      <v-icon icon="mdi-arrow-left" start></v-icon>กลับ
    </v-btn>
    <h1 class="text-h4 mb-4">ประเมินผลงาน</h1>

    <base-card v-if="evaluatee" :title="evaluatee.name" icon="mdi-account" class="mb-4">
      <v-row>
        <v-col cols="12"><strong>รอบการประเมิน:</strong> {{ assignmentInfo || '-' }}</v-col>
      </v-row>
    </base-card>

    <v-row v-if="!loading">
      <v-col cols="12" md="8">
        <v-card v-for="topic in topics" :key="topic.id" class="mb-4">
          <v-card-title class="bg-primary">{{ topic.title_th }} ({{ topic.weight }}%)</v-card-title>
          <v-card-text>
            <div v-for="indicator in topic.indicators" :key="indicator.id" class="mb-4 pa-3 border rounded">
              <div class="d-flex justify-space-between mb-2">
                <strong>{{ indicator.name_th }}</strong>
                <v-chip size="small" color="primary">{{ indicator.weight }}%</v-chip>
              </div>
              <v-alert variant="tonal" density="compact" class="mb-3">
                <div class="text-caption"><strong>ประเมินตนเอง:</strong> {{ indicator.self_selected_value || '-' }} | คะแนน: {{ formatScore(indicator.self_score) }}</div>
                <div v-if="indicator.self_comment" class="text-body-2"><strong>ความเห็น:</strong> {{ indicator.self_comment }}</div>
              </v-alert>
              <div class="text-caption text-grey mb-2">{{ getEvaluationTypeText(indicator.type) }}</div>
              <v-radio-group v-model="indicator.evaluator_selected_value" :inline="true" density="compact" @update:modelValue="updateScore(indicator)">
                <v-radio v-for="option in getOptions(indicator.type)" :key="option.value" :label="option.label" :value="option.value"></v-radio>
              </v-radio-group>
              <v-textarea v-model="indicator.evaluator_comment" label="ความเห็นกรรมการ" variant="outlined" density="compact" rows="2" class="mt-2"></v-textarea>
              <div class="text-end">
                <span class="text-grey">คะแนนตนเอง: {{ formatScore(indicator.self_score) }}</span> |
                <span class="text-primary font-weight-bold">คะแนนกรรมการ: {{ formatScore(indicator.evaluator_score) }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <base-card title="หลักฐานที่อัปโหลด" icon="mdi-file-document" class="mb-4">
          <v-list v-if="evidencesWithFullURL.length > 0">
            <v-list-item v-for="evidence in evidencesWithFullURL" :key="evidence.id">
              <template v-slot:prepend>
                <v-icon :icon="evidence.mime_type?.includes('pdf') ? 'mdi-file-pdf' : 'mdi-image'" color="primary"></v-icon>
              </template>
              <v-list-item-title>{{ evidence.file_name }}</v-list-item-title>
              <v-list-item-subtitle v-if="evidence.size_bytes">ขนาด: {{ (evidence.size_bytes / 1024).toFixed(2) }} KB</v-list-item-subtitle>
              <template v-slot:append>
                <v-btn :href="evidence.fullUrl" target="_blank" size="small" color="primary" variant="tonal">
                  <v-icon icon="mdi-eye" start></v-icon>ดู
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
          <v-alert v-else type="info" variant="tonal">ไม่มีหลักฐานที่อัปโหลด</v-alert>
        </base-card>
      </v-col>

      <v-col cols="12" md="4">
        <div class="sticky-top">
          <score-display :total-score="totalScore" :max-score="100" :topic-scores="topicScores"></score-display>

          <v-card class="mt-4">
            <v-card-title class="text-h6">ลงนามการประเมิน</v-card-title>
            <v-card-text>
              <v-checkbox
                v-model="signatureConfirmed"
                color="primary"
                hide-details
              >
                <template v-slot:label>
                  <div class="text-body-2">
                    ข้าพเจ้ายืนยันว่าได้ประเมินผลงานตามความเป็นจริง<br>
                    และรับผิดชอบต่อการประเมินนี้
                  </div>
                </template>
              </v-checkbox>
            </v-card-text>
          </v-card>

          <v-card class="mt-4">
            <v-card-text>
              <v-btn block color="success" :loading="saving" @click="saveEvaluation" :disabled="!canSave || !signatureConfirmed">
                <v-icon icon="mdi-content-save" start></v-icon>บันทึกและลงนาม
              </v-btn>
            </v-card-text>
          </v-card>
        </div>
      </v-col>
    </v-row>
    <loading-overlay v-model="loading" message="กำลังโหลดข้อมูล..." />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import evaluationService from '@/services/evaluationService';
import uploadService from '@/services/uploadService';
import signatureService from '@/services/signatureService';
import ScoreDisplay from '@/components/common/ScoreDisplay.vue';
import BaseCard from '@/components/base/BaseCard.vue';
import LoadingOverlay from '@/components/base/LoadingOverlay.vue';
import { calculateScore, calculateTopicScore } from '@/utils/helpers';

const route = useRoute();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const evaluateeId = computed(() => route.params.evaluateeId);
const assignmentId = computed(() => route.params.assignmentId);
const loading = ref(false);
const saving = ref(false);
const evaluatee = ref(null);
const assignment = ref(null);
const topics = ref([]);
const signatureConfirmed = ref(false);
const evidences = ref([]);

// Backend base URL for file access
const backendURL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7000';

// Computed evidences with full URL
const evidencesWithFullURL = computed(() =>
  evidences.value.map(e => ({
    ...e,
    fullUrl: e.url?.startsWith('http') ? e.url : `${backendURL}${e.url}`
  }))
);

const evaluationTypes = [
  { text: 'แบบ ใช่/ไม่ใช่', value: 'yes_no' },
  { text: 'แบบมาตราส่วน 1-4', value: 'score_1_4' },
  { text: 'แบบ URL ไฟล์', value: 'file_url' }
];

const getEvaluationTypeText = (type) => evaluationTypes.find(t => t.value === type)?.text || type;
const getOptions = (type) => {
  if (type === 'yes_no') return [{ label: 'ไม่ใช่', value: 0 }, { label: 'ใช่', value: 1 }];
  if (type === 'score_1_4') return [{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }];
  if (type === 'file_url') return [{ label: 'ไม่มี', value: 0 }, { label: 'มี', value: 1 }];
  return [{ label: '0', value: 0 }, { label: '1', value: 1 }];
};

const formatScore = (score) => {
  const num = parseFloat(score);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

const updateScore = (indicator) => {
  // Determine max value based on indicator type
  const maxValue = indicator.type === 'score_1_4' ? 4 : 1;
  indicator.evaluator_score = calculateScore(indicator.evaluator_selected_value || 0, indicator.weight, maxValue);
};

const topicScores = computed(() => topics.value.map(topic => ({
  topic_name: topic.title_th,
  weight_percentage: topic.weight,
  topic_score: calculateTopicScore(topic.indicators?.map(ind => ({ selected_value: ind.evaluator_selected_value || 0, weight_score: ind.weight })) || [], topic.weight)
})));

const totalScore = computed(() => topics.value.reduce((sum, topic) =>
  sum + calculateTopicScore(topic.indicators?.map(ind => ({ selected_value: ind.evaluator_selected_value || 0, weight_score: ind.weight })) || [], topic.weight), 0
));

const canSave = computed(() => topics.value.every(topic => topic.indicators?.every(ind => ind.evaluator_selected_value !== undefined && ind.evaluator_selected_value !== null) ?? false));

const assignmentInfo = computed(() => {
  if (!assignment.value) return null;
  if (assignment.value.start_date && assignment.value.end_date) {
    return `${new Date(assignment.value.start_date).toLocaleDateString('th-TH')} - ${new Date(assignment.value.end_date).toLocaleDateString('th-TH')}`;
  }
  return 'ไม่ระบุช่วงเวลา';
});

const fetchData = async () => {
  loading.value = true;
  try {
    console.log('[EvaluationReview] Starting fetch for evaluateeId:', evaluateeId.value, 'assignmentId:', assignmentId.value);

    const [evalRes, evidenceRes] = await Promise.all([
      evaluationService.getByEvaluatee(evaluateeId.value, assignmentId.value),
      uploadService.getForEvaluator(evaluateeId.value)
    ]);

    // Backend ส่ง { success: true, items: [...] } - ข้อมูล flat structure
    const results = evalRes.data.items || evalRes.data.data || [];
    console.log('[EvaluationReview] Fetched results:', results);
    console.log('[EvaluationReview] Results count:', results.length);

    if (results.length === 0) {
      console.error('[EvaluationReview] No results found!');
      notificationStore.error('ไม่พบข้อมูลการประเมิน');
      return;
    }

    console.log('[EvaluationReview] First result:', results[0]);

    // ข้อมูล evaluatee จาก flat structure
    evaluatee.value = {
      name: results[0].evaluatee_name
    };

    // Fetch assignment info
    try {
      const assignmentRes = await assignmentService.getById(assignmentId.value);
      assignment.value = assignmentRes.data.data || assignmentRes.data;
    } catch (error) {
      console.error('[EvaluationReview] Error fetching assignment:', error);
    }

    console.log('[EvaluationReview] Evaluatee:', evaluatee.value);
    console.log('[EvaluationReview] Assignment:', assignment.value);

    const topicMap = new Map();
    results.forEach(result => {
      const topicId = result.topic_id;
      const topicName = result.topic_title;
      const topicWeight = result.topic_weight;

      console.log('[EvaluationReview] Processing result:', {
        topicId,
        topicName,
        indicatorId: result.indicator_id,
        indicatorName: result.indicator_name
      });

      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, { id: topicId, title_th: topicName, weight: topicWeight, indicators: [] });
      }

      // Calculate selected value from score
      // Formula: score = (selected_value / max_value) * weight
      // So: selected_value = (score / weight) * max_value
      const getMaxValue = (type) => type === 'score_1_4' ? 4 : 1;
      const maxValue = getMaxValue(result.indicator_type);
      
      const selfSelectedValue = result.self_score && result.indicator_weight
        ? Math.round((result.self_score / result.indicator_weight) * maxValue)
        : null;
      const evaluatorSelectedValue = result.evaluator_score && result.indicator_weight
        ? Math.round((result.evaluator_score / result.indicator_weight) * maxValue)
        : null;

      topicMap.get(topicId).indicators.push({
        id: result.indicator_id,
        name_th: result.indicator_name,
        type: result.indicator_type,
        weight: parseFloat(result.indicator_weight) || 0,
        self_selected_value: selfSelectedValue,
        self_score: parseFloat(result.self_score) || 0,
        self_comment: result.self_note,
        evaluator_selected_value: evaluatorSelectedValue,
        evaluator_score: parseFloat(result.evaluator_score) || 0,
        evaluator_comment: result.evaluator_note || ''
      });
    });

    topics.value = Array.from(topicMap.values());
    console.log('[EvaluationReview] Topics:', topics.value);
    console.log('[EvaluationReview] Topics count:', topics.value.length);

    // Backend returns { success: true, data: [...] } directly
    evidences.value = evidenceRes.data.data || [];
    console.log('[EvaluationReview] Evidences:', evidences.value);
  } catch (error) {
    console.error('[EvaluationReview] Fetch error:', error);
    notificationStore.error('ไม่สามารถโหลดข้อมูลได้: ' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
    console.log('[EvaluationReview] Loading finished, loading:', loading.value);
  }
};

const saveEvaluation = async () => {
  // Validate signature confirmation
  if (!signatureConfirmed.value) {
    notificationStore.error('กรุณายืนยันการลงนามก่อนบันทึก');
    return;
  }

  saving.value = true;
  try {
    const items = [];
    topics.value.forEach(topic => {
      topic.indicators.forEach(indicator => {
        const maxValue = indicator.type === 'score_1_4' ? 4 : 1;
        items.push({
          indicator_id: indicator.id,
          evaluator_score: calculateScore(indicator.evaluator_selected_value, indicator.weight, maxValue),
          evaluator_note: indicator.evaluator_comment
        });
      });
    });

    const data = {
      assignment_id: parseInt(assignmentId.value),
      evaluatee_id: parseInt(evaluateeId.value),
      items: items
    };

    console.log('[EvaluationReview] Saving evaluation:', data);
    await evaluationService.evaluateBulk(data);

    // Save signature
    const timestamp = new Date().toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    // ใช้ชื่อจาก authStore.user.name_th หรือ fallback
    const evaluatorName = authStore.user?.name_th || authStore.user?.name || 'กรรมการประเมิน';
    const signatureText = `ลงนามโดย: ${evaluatorName}\nตำแหน่ง: กรรมการประเมิน\nวันที่: ${timestamp}`;

    await signatureService.create({
      evaluatee_id: parseInt(evaluateeId.value),
      assignment_id: parseInt(assignmentId.value),
      signature_data: signatureText
    });

    console.log('[EvaluationReview] Signature saved');
    notificationStore.success('บันทึก ลงนาม และอนุมัติการประเมินสำเร็จ');
  } catch (error) {
    console.error('[EvaluationReview] Save error:', error);
    notificationStore.error('เกิดข้อผิดพลาด: ' + (error.response?.data?.message || error.message));
  } finally {
    saving.value = false;
  }
};

onMounted(fetchData);
</script>

<style scoped>
.sticky-top { position: sticky; top: 20px; }
.border { border: 1px solid #e0e0e0; }
</style>
