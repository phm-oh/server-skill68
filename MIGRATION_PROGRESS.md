# สรุปงาน Migration: ลบ Periods → ย้ายไปที่ Assignments

## 📊 สรุปสถานะ (Quick Summary)

**Backend:** ✅ **เสร็จ 100%**

**Frontend:** ⏳ **เสร็จประมาณ 70%** - เหลืออีก **8 ไฟล์**

---

## 📝 ไฟล์ที่ยังต้องแก้ (8 ไฟล์)

1. `frontend/src/views/committee/AssignmentsList.vue`
2. `frontend/src/views/committee/EvaluationReview.vue`
3. `frontend/src/views/committee/ApprovalPage.vue`
4. `frontend/src/views/committee/CommitteeDashboard.vue`
5. `frontend/src/views/evaluatee/EvidenceManage.vue`
6. `frontend/src/views/evaluatee/MyReport.vue`
7. `frontend/src/views/hr/ReportsView.vue`
8. `frontend/src/components/common/EvidenceUpload.vue`

---

## 🔑 แนวทางการแก้ไข (สรุปสั้นๆ)

### การเปลี่ยนแปลงหลัก:
- ❌ `periodId` / `period_id` → ✅ `assignmentId` / `assignment_id`
- ❌ ลบ `periodService` imports → ✅ ใช้ `assignmentService` แทน
- ❌ API calls ใช้ `period_id` → ✅ ใช้ `assignment_id`
- ❌ Routes ใช้ `:periodId` → ✅ ใช้ `:assignmentId`
- ❌ แสดง `periods` → ✅ แสดง `assignments`

### API Changes สำคัญ:
- ❌ `/api/periods/active` → ✅ `/api/assignments/active`
- ❌ `period_id` parameter → ✅ `assignment_id` parameter

### Assignment Object Structure:
```javascript
// ✅ ใหม่ - Assignment object มี:
{
  id: 1,
  evaluator_id: 2,
  evaluatee_id: 3,
  start_date: "2025-01-01",
  end_date: "2025-06-30",
  is_active: 1
  // ไม่มี period_id แล้ว
}
```

---

## ✅ สิ่งที่ทำเสร็จแล้ว (100%)

### 🗄️ Database Schema (schema.sql)
- ✅ ลบตาราง `periods` และ `period_topics`
- ✅ เพิ่มฟิลด์ใน `assignments`: `start_date`, `end_date`, `is_active`
- ✅ ลบ `period_id` ออกจาก `assignments`
- ✅ เปลี่ยน `period_id` → `assignment_id` ใน:
  - `results`
  - `attachments`
  - `signatures`
  - `comments`

### 🔧 Backend - ลบไฟล์
- ✅ ลบ `backend/controllers/periods.controller.js`
- ✅ ลบ `backend/repositories/periods.repository.js`
- ✅ ลบ `backend/routes/periods.routes.js`

### 🔧 Backend - แก้ไข Repositories
- ✅ `assignments.repository.js` - เพิ่ม start_date/end_date/is_active, ลบ period_id
- ✅ `results.repository.js` - เปลี่ยน period_id → assignment_id ทั้งหมด
- ✅ `attachments.js` - เปลี่ยน period_id → assignment_id
- ✅ `signatures.repository.js` - เปลี่ยน period_id → assignment_id
- ✅ `comments.repository.js` - เปลี่ยน period_id → assignment_id
- ✅ `reports.repository.js` - เปลี่ยน period_id → assignment_id

### 🔧 Backend - แก้ไข Controllers
- ✅ `assignments.controller.js` - เพิ่ม update, แก้ create/createBulk
- ✅ `results.controller.js` - เปลี่ยน period_id → assignment_id ทั้งหมด
- ✅ `upload.controller.js` - เปลี่ยน period_id → assignment_id
- ✅ `signatures.controller.js` - เปลี่ยน period_id → assignment_id
- ✅ `comments.controller.js` - เปลี่ยน period_id → assignment_id
- ✅ `reports.controller.js` - เปลี่ยน period_id → assignment_id

### 🔧 Backend - แก้ไข Routes
- ✅ `app.js` - ลบ periods routes
- ✅ `assignments.routes.js` - เพิ่ม PUT route
- ✅ `results.routes.js` - เปลี่ยน periodId → assignmentId
- ✅ `attachments.js` - เปลี่ยน `/periods/active` → `/assignments/active`
- ✅ `signatures.routes.js` - เปลี่ยน periodId → assignmentId
- ✅ `comments.routes.js` - เปลี่ยน period → assignment
- ✅ `reports.routes.js` - เปลี่ยน periodId → assignmentId

### 🎨 Frontend - ลบไฟล์
- ✅ ลบ `frontend/src/views/hr/PeriodsManage.vue`
- ✅ ลบ `frontend/src/services/periodService.js`
- ✅ ลบ route `/admin/periods` จาก `router/index.js`

### 🎨 Frontend - แก้ไข Services
- ✅ `assignmentService.js` - เพิ่ม update()
- ✅ `evaluationService.js` - เปลี่ยน periodId → assignmentId
- ✅ `uploadService.js` - เปลี่ยน period_id → assignment_id
- ✅ `signatureService.js` - เปลี่ยน periodId → assignmentId
- ✅ `topicService.js` - ลบ periodId parameter

### 🎨 Frontend - แก้ไข Views
- ✅ `HRDashboard.vue` - ลบ periods stats, แก้ menus
- ✅ `AssignmentsManage.vue` - เพิ่ม start_date/end_date/is_active fields
- ✅ `EvaluateeDashboard.vue` - เปลี่ยนจาก periods → assignments
- ✅ `SelfEvaluation.vue` - เปลี่ยนจาก periods → assignments

---

## 📋 สิ่งที่ยังเหลือต้องทำ

### 🎨 Frontend Views (8 ไฟล์)

#### 1. `frontend/src/views/committee/AssignmentsList.vue`
**ต้องแก้:**
- เปลี่ยน `period_id` → `assignment_id`
- เปลี่ยน `period_name` → แสดง assignment info
- เปลี่ยน route `/evaluator/review/:evaluateeId/:periodId` → `/:evaluateeId/:assignmentId`
- เปลี่ยน `evaluationService.getByEvaluatee(evaluateeId, periodId)` → `(evaluateeId, assignmentId)`

#### 2. `frontend/src/views/committee/EvaluationReview.vue`
**ต้องแก้:**
- เปลี่ยน route parameter `:periodId` → `:assignmentId`
- เปลี่ยน `evaluationService.getByEvaluatee(evaluateeId, periodId)` → `(evaluateeId, assignmentId)`
- เปลี่ยน `evaluationService.evaluateBulk({ evaluatee_id, period_id, ... })` → `{ evaluatee_id, assignment_id, ... }`
- เปลี่ยน comments API จาก period → assignment

#### 3. `frontend/src/views/committee/ApprovalPage.vue`
**ต้องแก้:**
- เปลี่ยน `period_id` → `assignment_id`
- เปลี่ยน signature API จาก period → assignment
- เปลี่ยน comments API จาก period → assignment

#### 4. `frontend/src/views/committee/CommitteeDashboard.vue`
**ต้องแก้:**
- เปลี่ยนจากการแสดง periods → assignments
- เปลี่ยน `assignment.period_id` → `assignment.id`
- เปลี่ยน route `/evaluator/review/:evaluateeId/:periodId` → `/:evaluateeId/:assignmentId`

#### 5. `frontend/src/views/evaluatee/EvidenceManage.vue`
**ต้องแก้:**
- เปลี่ยน `period_id` → `assignment_id`
- เปลี่ยน `periodService.getAll()` → `assignmentService.getMine()` (filter active)
- เปลี่ยน upload metadata จาก `period_id` → `assignment_id`

#### 6. `frontend/src/views/evaluatee/MyReport.vue`
**ต้องแก้:**
- เปลี่ยน `period_id` → `assignment_id`
- เปลี่ยน reports API จาก period → assignment
- เปลี่ยน route parameter

#### 7. `frontend/src/views/hr/ReportsView.vue`
**ต้องแก้:**
- เปลี่ยน `period_id` → `assignment_id`
- เปลี่ยน reports API จาก period → assignment
- เปลี่ยน dropdown จาก periods → assignments

#### 8. `frontend/src/components/common/EvidenceUpload.vue`
**ต้องแก้:**
- เปลี่ยน props `periodId` → `assignmentId`
- เปลี่ยน metadata จาก `period_id` → `assignment_id`

---

## 🔑 จุดสำคัญที่ต้องจำ

### API Changes
- ❌ `/api/periods/active` → ✅ `/api/assignments/active`
- ❌ `period_id` parameter → ✅ `assignment_id` parameter
- ❌ `periodId` in routes → ✅ `assignmentId` in routes

### Service Methods
```javascript
// ❌ เดิม
evaluationService.getMyResults(periodId)
evaluationService.getByEvaluatee(evaluateeId, periodId)
evaluationService.saveSelfBulk({ period_id, ... })
uploadService.upload(file, onProgress, { period_id, ... })

// ✅ ใหม่
evaluationService.getMyResults(assignmentId)
evaluationService.getByEvaluatee(evaluateeId, assignmentId)
evaluationService.saveSelfBulk({ assignment_id, ... })
uploadService.upload(file, onProgress, { assignment_id, ... })
```

### Route Changes
```javascript
// ❌ เดิม
/evaluator/review/:evaluateeId/:periodId
/api/reports/individual/:evaluateeId/:periodId
/api/comments/evaluatee/:evaluateeId/period/:periodId

// ✅ ใหม่
/evaluator/review/:evaluateeId/:assignmentId
/api/reports/individual/:evaluateeId/:assignmentId
/api/comments/evaluatee/:evaluateeId/assignment/:assignmentId
```

### Data Structure Changes
```javascript
// ❌ เดิม - Assignment object
{
  id: 1,
  period_id: 5,
  evaluator_id: 2,
  evaluatee_id: 3,
  period_name: "รอบที่ 1 ปีการศึกษา 2568"
}

// ✅ ใหม่ - Assignment object
{
  id: 1,
  evaluator_id: 2,
  evaluatee_id: 3,
  evaluator_name: "Evaluator 1",
  evaluatee_name: "Teacher 1",
  start_date: "2025-01-01",
  end_date: "2025-06-30",
  is_active: 1
}
```

---

## 📝 แนวทางการแก้ไขแต่ละไฟล์

### Pattern ทั่วไปที่ต้องใช้:

1. **เปลี่ยน variable names:**
   - `periodId` → `assignmentId`
   - `period_id` → `assignment_id`
   - `selectedPeriodId` → `selectedAssignmentId`
   - `availablePeriods` → `availableAssignments`

2. **เปลี่ยน API calls:**
   - `periodService.getAll()` → ลบออก (ใช้ `assignmentService.getMine()` แทน)
   - เพิ่ม `assignmentService.getMine()` เพื่อดึง assignments
   - Filter assignments โดย `is_active === 1`

3. **เปลี่ยน route parameters:**
   - `/:periodId` → `/:assignmentId`
   - Update `router.push()` calls

4. **เปลี่ยน display:**
   - `period.name_th` → `assignment.evaluator_name` หรือแสดง start_date/end_date
   - เพิ่มแสดง `is_active` status

5. **Update computed/filtered data:**
   - เปลี่ยนจาก grouping by `period_id` → ใช้ `assignment.id` โดยตรง

---

## ✅ Checklist สำหรับแต่ละไฟล์

เมื่อแก้แต่ละไฟล์ ให้ตรวจสอบ:
- [ ] ลบ import `periodService`
- [ ] เปลี่ยน `periodId`/`period_id` → `assignmentId`/`assignment_id` ทั้งหมด
- [ ] แก้ API calls ให้ใช้ `assignment_id`
- [ ] แก้ routes ให้ใช้ `assignmentId`
- [ ] แก้ display labels (period → assignment)
- [ ] ทดสอบว่าไม่มี reference ไปยัง `period`/`periods` เหลืออยู่
- [ ] ตรวจสอบ computed properties และ filters

---

## 🎯 Next Steps

1. เริ่มแก้ทีละไฟล์ตามลำดับความสำคัญ:
   - Committee views (AssignmentsList, EvaluationReview, ApprovalPage, CommitteeDashboard)
   - Evaluatee views (EvidenceManage, MyReport)
   - HR views (ReportsView)
   - Components (EvidenceUpload)

2. ทดสอบแต่ละหน้าให้ทำงานได้

3. ตรวจสอบว่าไม่มี console errors

4. ทดสอบ workflow ทั้งหมด:
   - HR สร้าง assignment
   - Evaluatee ประเมินตนเอง
   - Evaluatee อัปโหลดหลักฐาน
   - Evaluator ตรวจสอบและให้คะแนน
   - Evaluator ลงลายเซ็น
   - ดูรายงาน

---

**Last Updated:** 2025-01-XX
**Status:** Backend 100% ✅ | Frontend ~70% (8 files remaining)

