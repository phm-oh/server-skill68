// routes/auth.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');



// POST /api/auth/login - เข้าสู่ระบบ
router.post('/login', ctrl.login);

// 🆕 POST /api/auth/register (เพิ่มใหม่)
router.post('/register', ctrl.register);

module.exports = router;
