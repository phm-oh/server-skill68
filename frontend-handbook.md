# Frontend Handbook: Comprehensive Guide (45 Files)

คู่มือการสร้างโปรเจ็ค Frontend Vue 3 แบบละเอียดทุกขั้นตอน เรียงลำดับตาม Strict Dependency Order (สร้างตัวที่ถูกเรียกใช้ก่อนเสมอ) เพื่อให้ทำตามแล้วไม่เกิด Error "Module not found"

---

## Phase 1: Project Initialization & Configuration
**เป้าหมาย:** เตรียมโครงสร้างโปรเจ็คและติดตั้ง Library

### 1.1 Init Project (Vite)
สร้างโปรเจ็คด้วย Vite (เลือก Vue)
```bash
npm create vite@latest frontend -- --template vue
cd frontend
npm install
```

### 1.2 Install Dependencies
ติดตั้ง Library ที่จำเป็น
```bash
npm install vue-router pinia axios jwt-decode @mdi/font vuetify vite-plugin-vuetify
```

### 1.3 Configure Vite (`vite.config.js`)
ตั้งค่า Plugin และ Alias `@`
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 1.4 Environment Variables (`.env`)
```env
VITE_API_URL=http://localhost:7000/api
```

---

## Phase 2: Utils & Helpers (Level 0)
**เป้าหมาย:** สร้างไฟล์ Utility ที่ไม่มี Dependency กับไฟล์อื่นในโปรเจ็ค (ต้องสร้างก่อนเพื่อน)

### 2.1 `src/utils/constants.js`
ค่าคงที่ต่างๆ
```javascript
export const ROLES = {
  ADMIN: 'admin',
  EVALUATOR: 'evaluator',
  EVALUATEE: 'evaluatee'
};
```

### 2.2 `src/utils/validators.js`
ฟังก์ชันตรวจสอบความถูกต้อง (ใช้ใน Form)
```javascript
export const required = (v) => !!v || 'กรุณากรอกข้อมูล';
export const email = (v) => /.+@.+\..+/.test(v) || 'รูปแบบอีเมลไม่ถูกต้อง';
```

### 2.3 `src/utils/helpers.js`
ฟังก์ชันช่วยเหลือทั่วไป (Format วันที่, คำนวณคะแนน)
```javascript
export const formatDate = (date) => { /* ... */ };
export const calculateScore = (val, weight) => { /* ... */ };
```

---

## Phase 3: Services (Level 1)
**เป้าหมาย:** สร้างไฟล์ติดต่อ API (ต้องสร้างก่อน Store)

### 3.1 `src/services/api.js`
ตัวกลาง Axios (ต้องสร้างก่อน Service อื่นๆ)
```javascript
import axios from 'axios';
const api = axios.create({ /* config */ });
// ... interceptors ...
export default api;
```

### 3.2 Domain Services
สร้าง Service ย่อยๆ (เรียกใช้ `api.js`)
*   `src/services/authService.js`: Login, Register
*   `src/services/userService.js`: CRUD Users
*   `src/services/topicService.js`: CRUD Topics
*   `src/services/assignmentService.js`: CRUD Assignments
*   `src/services/evaluationService.js`: Submit Scores
*   `src/services/uploadService.js`: Upload Files
*   `src/services/signatureService.js`: Save Signatures

---

## Phase 4: Stores (Level 2)
**เป้าหมาย:** ระบบจัดการ State (เรียกใช้ Services)

### 4.1 `src/stores/auth.js`
จัดการ User State (เรียกใช้ `authService`, `userService`)
```javascript
import { defineStore } from 'pinia';
import authService from '@/services/authService';
import userService from '@/services/userService'; // ต้องมีไฟล์นี้ก่อน!

export const useAuthStore = defineStore('auth', {
  // ... actions: login, fetchCurrentUser ...
});
```

### 4.2 `src/stores/notification.js`
จัดการ Alert/Snackbar กลาง
```javascript
import { defineStore } from 'pinia';
export const useNotificationStore = defineStore('notification', { /* ... */ });
```

---

## Phase 5: Base Components (Level 3)
**เป้าหมาย:** UI Components พื้นฐาน (เรียกใช้ Utils/Stores)

### 5.1 Base UI
*   `src/components/base/BaseAlert.vue`
*   `src/components/base/BaseCard.vue`
*   `src/components/base/BaseDialog.vue`
*   `src/components/base/BaseTable.vue`
*   `src/components/base/LoadingOverlay.vue`
*   `src/components/base/StatusChip.vue`

### 5.2 Common Logic Components
*   `src/components/common/EvidenceUpload.vue` (ใช้ `uploadService`)
*   `src/components/common/ScoreDisplay.vue` (ใช้ `helpers.js`)

---

## Phase 6: Views & Pages (Level 4)
**เป้าหมาย:** หน้าจอหลัก (เรียกใช้ Components & Stores)

### 6.1 Public Views
*   `src/views/LoginPage.vue` (ใช้ `authStore`)

### 6.2 Admin Views (`src/views/hr/*`)
*   `HRDashboard.vue`
*   `UsersManage.vue` (ใช้ `userService`, `BaseTable`)
*   `TopicsManage.vue` (ใช้ `topicService`)
*   `IndicatorsManage.vue`
*   `AssignmentsManage.vue` (ใช้ `assignmentService`)
*   `ReportsView.vue`

### 6.3 Evaluatee Views (`src/views/evaluatee/*`)
*   `EvaluateeDashboard.vue`
*   `SelfEvaluation.vue` (ใช้ `evaluationService`, `ScoreDisplay`)
*   `EvidenceManage.vue` (ใช้ `EvidenceUpload`)
*   `MyReport.vue`

### 6.4 Evaluator Views (`src/views/committee/*`)
*   `CommitteeDashboard.vue`
*   `AssignmentsList.vue`
*   `EvaluationReview.vue` (ใช้ `evaluationService`)
*   `ApprovalPage.vue` (ใช้ `signatureService`)

---

## Phase 7: App Entry & Routing (Level 5)
**เป้าหมาย:** เชื่อมทุกอย่างเข้าด้วยกัน (ทำเป็นลำดับสุดท้าย)

### 7.1 `src/router/index.js`
กำหนด Route (Import Views ทั้งหมดที่สร้างมา)
```javascript
import { createRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
// Import Views...
const routes = [ /* ... */ ];
// ... guards ...
export default router;
```

### 7.2 `src/plugins/vuetify.js`
Config Vuetify

### 7.3 `src/App.vue`
Root Component (วาง `<router-view>`)

### 7.4 `src/main.js`
จุดเริ่มต้น (Import Router, Store, Vuetify)
```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router'; // ต้องมี router/index.js ก่อน
import vuetify from './plugins/vuetify';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(vuetify);
app.mount('#app');
```

---

## Checklist การตรวจสอบความถูกต้อง
1.  **Utils**: สร้างก่อนเสมอ เพราะไม่มี Dependency
2.  **Services**: สร้าง `api.js` ก่อน แล้วค่อยสร้าง Service อื่นๆ
3.  **Stores**: สร้างหลังจาก Services ครบแล้ว (เพราะ Store เรียก Service)
4.  **Components**: สร้างหลังจาก Utils/Stores (ถ้ามีการเรียกใช้)
5.  **Views**: สร้างหลังจาก Components ครบแล้ว
6.  **Router**: สร้างหลังสุด เพราะต้อง Import Views
7.  **Main**: สร้างหลังสุด เพราะต้อง Import Router/Store

ถ้าทำตามลำดับ Level 0 -> Level 5 นี้ รับรองว่า **Compile ผ่านทุกขั้นตอน** และไม่มี Error เรื่อง Import แน่นอนครับ!
