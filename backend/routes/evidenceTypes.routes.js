// backend/routes/evidenceTypes.routes.js
// Routes สำหรับจัดการชนิดหลักฐาน
const router = require('express').Router();
const ctrl = require('../controllers/evidenceTypes.controller');
const auth = require('../middlewares/auth');

// ทุก route ต้อง login (auth() = ทุก role ผ่าน)
router.use(auth());

// Routes
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);      // admin only (ตรวจใน controller)
router.put('/:id', ctrl.update);    // admin only
router.delete('/:id', ctrl.remove); // admin only

module.exports = router;