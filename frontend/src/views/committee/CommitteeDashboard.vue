<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1 class="text-h4">Dashboard - กรรมการประเมิน</h1>
          <v-btn color="error" @click="handleLogout">
            <v-icon icon="mdi-logout" start></v-icon>ออกจากระบบ
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="3" v-for="card in statCards" :key="card.title">
        <v-card :color="card.color">
          <v-card-text class="text-white">
            <div class="text-h6">{{ card.title }}</div>
            <div class="text-h3">{{ card.value }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <base-card title="เมนูด่วน" icon="mdi-lightning-bolt">
          <v-row>
            <v-col cols="12" md="6" v-for="action in quickActions" :key="action.title">
              <v-card class="pa-4 text-center" hover @click="$router.push(action.path)" :color="action.color" variant="tonal">
                <v-icon :icon="action.icon" size="56" :color="action.color"></v-icon>
                <div class="text-h6 mt-3">{{ action.title }}</div>
                <div class="text-caption text-grey-darken-1 mt-1">{{ action.description }}</div>
              </v-card>
            </v-col>
          </v-row>
        </base-card>
      </v-col>
    </v-row>

    <loading-overlay v-model="loading" message="กำลังโหลดข้อมูล..." />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import assignmentService from '@/services/assignmentService';
import evaluationService from '@/services/evaluationService';
import BaseCard from '@/components/base/BaseCard.vue';
import StatusChip from '@/components/base/StatusChip.vue';
import LoadingOverlay from '@/components/base/LoadingOverlay.vue';

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const loading = ref(false);
const assignments = ref([]);
const evaluations = ref([]);

const quickActions = [
  { title: 'ดูรายการทั้งหมด', icon: 'mdi-format-list-bulleted', color: 'primary', path: '/evaluator/assignments', description: 'ดูงานที่ได้รับมอบหมายทั้งหมด' },
  { title: 'อนุมัติการประเมิน', icon: 'mdi-check-circle', color: 'success', path: '/evaluator/approval', description: 'อนุมัติผลการประเมิน' }
];

const stats = computed(() => {
  // Count from assignments and aggregate evaluation status
  let pending = 0, evaluated = 0, approved = 0;

  assignments.value.forEach(assignment => {
    // Get all evaluation results for this assignment
    const results = evaluations.value.filter(
      e => e.evaluatee_id === assignment.evaluatee_id && e.assignment_id === assignment.id
    );

    if (results.length === 0) {
      // No evaluation data yet
      pending++;
      return;
    }

    // Check if all results have evaluator scores
    const allEvaluated = results.every(r => r.evaluator_score !== null && r.evaluator_score !== undefined);
    const anyApproved = results.some(r => r.status === 'approved');
    const anySubmitted = results.some(r => r.self_score !== null && r.self_score !== undefined);

    if (anyApproved) {
      approved++;
    } else if (allEvaluated) {
      evaluated++;
    } else if (anySubmitted) {
      pending++; // Submitted but not evaluated yet
    } else {
      pending++; // Not submitted yet
    }
  });

  const total = assignments.value.length;
  const progress = total > 0 ? Math.round(((evaluated + approved) / total) * 100) : 0;
  return { pending, evaluated, approved, progress };
});

const statCards = computed(() => [
  { title: 'รอประเมิน', value: stats.value.pending, color: 'warning' },
  { title: 'ประเมินแล้ว', value: stats.value.evaluated, color: 'orange' },
  { title: 'อนุมัติแล้ว', value: stats.value.approved, color: 'success' },
  { title: 'ความคืบหน้า', value: `${stats.value.progress}%`, color: 'primary' }
]);

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
    console.error('[CommitteeDashboard] Error fetching data:', error);
    notificationStore.error('ไม่สามารถโหลดข้อมูลได้');
  } finally {
    loading.value = false;
  }
};

const handleLogout = async () => await authStore.logout();

onMounted(() => fetchData());
</script>
