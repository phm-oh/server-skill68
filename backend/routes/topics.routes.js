// backend/routes/topics.routes.js
// Routes สำหรับจัดการหัวข้อการประเมิน
const router = require('express').Router();
const ctrl = require('../controllers/topics.controller');
const auth = require('../middlewares/auth');

// ทุก route ต้อง login (auth() = ทุก role ผ่าน)
router.use(auth());

// Routes
router.get('/active', ctrl.listActive);  // ต้องอยู่ก่อน /:id
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);           // admin only (ตรวจใน controller)
router.put('/:id', ctrl.update);         // admin only
router.delete('/:id', ctrl.remove);      // admin only

module.exports = router;