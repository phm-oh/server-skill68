<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1 class="text-h4">Dashboard - ผู้ถูกประเมิน</h1>
          <v-btn color="error" @click="handleLogout">
            <v-icon icon="mdi-logout" start></v-icon>ออกจากระบบ
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row v-if="activeAssignments.length > 0">
      <v-col cols="12" v-for="assignment in activeAssignments" :key="assignment.id">
        <base-card :title="`การประเมิน: ${assignment.evaluator_name || 'กรรมการ'}`" icon="mdi-calendar-clock">
          <v-row>
            <v-col cols="12" md="8">
              <div class="d-flex gap-4 align-center flex-wrap">
                <div><v-icon icon="mdi-account-star" size="small"></v-icon> กรรมการ: {{ assignment.evaluator_name || '-' }}</div>
                <div><v-icon icon="mdi-calendar-start" size="small"></v-icon> เริ่ม: {{ formatDate(assignment.start_date) }}</div>
                <div><v-icon icon="mdi-calendar-end" size="small"></v-icon> สิ้นสุด: {{ formatDate(assignment.end_date) }}</div>
                <div>
                  <v-chip :color="assignment.is_active ? 'success' : 'error'" variant="flat">
                    <v-icon :icon="assignment.is_active ? 'mdi-eye' : 'mdi-eye-off'" start></v-icon>
                    {{ assignment.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                  </v-chip>
                </div>
                <div v-if="assignment.is_active">
                  <v-chip color="warning" variant="flat">
                    <v-icon icon="mdi-clock-alert" start></v-icon>เหลือเวลาอีก {{ getDaysRemaining(assignment.end_date) }} วัน
                  </v-chip>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center justify-center">
              <div class="text-center">
                <div class="text-subtitle-2 mb-2">สถานะการประเมิน</div>
                <status-chip :status="getEvaluationStatus(assignment.id)" size="large" />
              </div>
            </v-col>
          </v-row>
        </base-card>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12">
        <base-card title="เมนูด่วน" icon="mdi-lightning-bolt">
          <v-row>
            <v-col cols="12" md="4" v-for="action in quickActions" :key="action.title">
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

    <v-row v-if="!loading && activeAssignments.length === 0">
      <v-col cols="12">
        <v-alert type="info" variant="tonal" prominent>
          <v-alert-title>ยังไม่มีการมอบหมายงานประเมิน</v-alert-title>
          กรุณารอจนกว่าฝ่าย HR จะมอบหมายงานประเมินให้คุณ
        </v-alert>
      </v-col>
    </v-row>
    <loading-overlay v-model="loading" message="กำลังโหลดข้อมูล..." />
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import assignmentService from '@/services/assignmentService';
import evaluationService from '@/services/evaluationService';
import BaseCard from '@/components/base/BaseCard.vue';
import LoadingOverlay from '@/components/base/LoadingOverlay.vue';
import StatusChip from '@/components/base/StatusChip.vue';
import { formatDate, getDaysRemaining } from '@/utils/helpers';

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const loading = ref(false);
const activeAssignments = ref([]);
const evaluationData = ref({});

const quickActions = [
  { title: 'ประเมินตนเอง', icon: 'mdi-clipboard-check', color: 'primary', path: '/evaluatee/evaluation', description: 'กรอกแบบประเมินตนเอง' },
  { title: 'อัปโหลดหลักฐาน', icon: 'mdi-file-upload', color: 'success', path: '/evaluatee/evidence', description: 'จัดการไฟล์หลักฐาน' },
  { title: 'ดูรายงาน', icon: 'mdi-chart-box', color: 'info', path: '/evaluatee/report', description: 'ดูผลการประเมินของคุณ' }
];

const fetchData = async () => {
  loading.value = true;
  try {
    // ดึง assignments ของ evaluatee (เปลี่ยนจาก periods เป็น assignments โดยตรง)
    const assignmentsRes = await assignmentService.getMine();
    const assignments = assignmentsRes.data.items || assignmentsRes.data.data || [];

    // กรองเฉพาะที่ active และแสดงทั้งหมด (หรือจะแสดงเฉพาะ active ก็ได้)
    activeAssignments.value = assignments.filter(a => a.is_active === 1 || a.is_active === true);

    // ดึงข้อมูลการประเมินสำหรับแต่ละ assignment
    for (const assignment of activeAssignments.value) {
      try {
        const evalRes = await evaluationService.getMyResults(assignment.id);
        const results = evalRes.data.items || evalRes.data.data || [];
        evaluationData.value[assignment.id] = { status: determineStatus(results), results };
      } catch (err) {
        console.error(`Error fetching data for assignment ${assignment.id}:`, err);
      }
    }
  } catch (error) {
    notificationStore.error('ไม่สามารถโหลดข้อมูลได้');
  } finally {
    loading.value = false;
  }
};

const determineStatus = (results) => {
  if (!results || results.length === 0) return 'draft';
  const hasApproved = results.some(r => r.approver_score !== null);
  const hasEvaluated = results.some(r => r.evaluator_score !== null);
  const allSubmitted = results.every(r => r.self_score !== null);
  if (hasApproved) return 'approved';
  if (hasEvaluated) return 'evaluated';
  if (allSubmitted) return 'submitted';
  return 'draft';
};

const getEvaluationStatus = (assignmentId) => evaluationData.value[assignmentId]?.status || 'draft';

const handleLogout = async () => { await authStore.logout(); };

onMounted(() => { fetchData(); });
</script>

<style scoped>
.gap-4 { gap: 1rem; }
</style>
