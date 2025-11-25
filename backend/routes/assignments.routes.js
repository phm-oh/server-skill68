// backend/routes/assignments.routes.js
// Routes สำหรับจัดการ assignments (การมอบหมายงานประเมิน)
// ✨ แก้ไข: เพิ่ม route GET /mine สำหรับดึงงานของตัวเอง

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assignments.controller');
const auth = require('../middlewares/auth');

// ทุก route ต้อง login
router.use(auth());



// ============================================================
// ⭐ สำคัญ: ลำดับ routes ต้องเรียงจาก specific -> general
// 1. /mine (specific)
// 2. / (general list)
// 3. /:id (dynamic parameter)
// ============================================================

// ✨ GET /api/assignments/mine - ดึงงานของตัวเอง
router.get('/mine', ctrl.getMine);

// ⭐ FIX: GET /api/assignments - ดึงทั้งหมด (ต้องอยู่ก่อน /:id)
router.get('/', ctrl.list);

// GET /api/assignments/:id - ดึงรายการเดียว
router.get('/:id', ctrl.get);

// POST /api/assignments/bulk - สร้างหลายรายการ (admin only)
router.post('/bulk', ctrl.createBulk);

// POST /api/assignments - สร้างใหม่ (admin only)
router.post('/', ctrl.create);

// PUT /api/assignments/:id - แก้ไข (admin only)
router.put('/:id', ctrl.update);

// DELETE /api/assignments/:id - ลบ (admin only)
router.delete('/:id', ctrl.remove);

module.exports = router;