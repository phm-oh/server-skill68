// backend/routes/reports.routes.js
// Routes สำหรับ API รายงานสรุป (Reports)
const router = require('express').Router();
const ctrl = require('../controllers/reports.controller');
const auth = require('../middlewares/auth');

// ใช้ auth middleware สำหรับทุก route ในไฟล์นี้
router.use(auth());

// GET /api/reports/individual/:evaluateeId/:assignmentId (เปลี่ยน periodId → assignmentId)
// สรุปผลการประเมินรายบุคคล
router.get('/individual/:evaluateeId/:assignmentId', ctrl.getIndividualSummary);

// GET /api/reports/overall/:assignmentId (เปลี่ยน periodId → assignmentId)
// สรุปภาพรวมทั้งหมดใน assignment
router.get('/overall/:assignmentId', ctrl.getOverallSummary);

// GET /api/reports/topics/:assignmentId (เปลี่ยน periodId → assignmentId)
// สรุปคะแนนตามหัวข้อประเมิน
router.get('/topics/:assignmentId', ctrl.getTopicSummary);

// GET /api/reports/export-pdf/:evaluateeId/:assignmentId (เปลี่ยน periodId → assignmentId)
// Export PDF สำหรับรายงานรายบุคคล
router.get('/export-pdf/:evaluateeId/:assignmentId', ctrl.exportPDF);

module.exports = router;