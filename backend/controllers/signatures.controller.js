// backend/controllers/signatures.controller.js
// Controller สำหรับจัดการลายเซ็นดิจิทัล
const signaturesRepo = require('../repositories/signatures.repository');

// GET /api/signatures/evaluatee/:evaluateeId/:assignmentId (เปลี่ยน periodId → assignmentId)
exports.getByEvaluateeAndAssignment = async (req, res, next) => {
  try {
    const { evaluateeId, assignmentId } = req.params;
    const items = await signaturesRepo.findByEvaluateeAndAssignment(evaluateeId, assignmentId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// POST /api/signatures (เปลี่ยน period_id → assignment_id)
exports.create = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { evaluatee_id, assignment_id, signature_data } = req.body;

    // ตรวจ input: ต้องมี signature_data, evaluatee_id และ assignment_id
    if (!signature_data) {
      return res.status(400).json({ success: false, message: 'signature_data required' });
    }
    if (!evaluatee_id) {
      return res.status(400).json({ success: false, message: 'evaluatee_id required' });
    }
    if (!assignment_id) {
      return res.status(400).json({ success: false, message: 'assignment_id required' });
    }

    // ตรวจสิทธิ์: ต้องเป็น evaluator หรือ admin
    if (req.user.role !== 'evaluator' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only evaluator or admin can sign' });
    }

    // สร้าง
    const data = await signaturesRepo.create({
      evaluatee_id: parseInt(evaluatee_id),
      assignment_id: parseInt(assignment_id),
      evaluator_id: userId,
      signature_data
    });

    res.status(201).json({ success: true, data });
  } catch (e) {
    if (e.message.includes('already exists')) {
      return res.status(409).json({ success: false, message: e.message });
    }
    next(e);
  }
};
