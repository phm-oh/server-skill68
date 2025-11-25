// backend/routes/signatures.routes.js
// Routes สำหรับจัดการลายเซ็นดิจิทัล
const router = require('express').Router();
const ctrl = require('../controllers/signatures.controller');
const auth = require('../middlewares/auth');

// ทุก route ต้อง login
router.use(auth());

// Routes (เปลี่ยน periodId → assignmentId)
router.get('/evaluatee/:evaluateeId/:assignmentId', ctrl.getByEvaluateeAndAssignment);
router.post('/', ctrl.create);

module.exports = router;