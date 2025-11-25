// backend/repositories/signatures.repository.js
// Repository สำหรับจัดการลายเซ็นดิจิทัล
const db = require('../db/knex');
const TABLE = 'signatures';

// ดึงตาม evaluatee_id และ assignment_id (เปลี่ยน period_id → assignment_id)
exports.findByEvaluateeAndAssignment = async (evaluateeId, assignmentId) => {
  try {
    return await db(TABLE)
      .select('signatures.*', 'users.name_th as evaluator_name')
      .leftJoin('users', 'signatures.evaluator_id', 'users.id')
      .where({
        'signatures.evaluatee_id': evaluateeId,
        'signatures.assignment_id': assignmentId
      })
      .orderBy('signatures.signed_at', 'desc');
  } catch (error) {
    // ถ้า column ไม่มี ให้ลอง query แบบไม่มี table prefix
    if (error.message && error.message.includes('Unknown column')) {
      return await db(TABLE)
        .select('signatures.*', 'users.name_th as evaluator_name')
        .leftJoin('users', 'signatures.evaluator_id', 'users.id')
        .where({
          evaluatee_id: evaluateeId,
          assignment_id: assignmentId
        })
        .orderBy('signed_at', 'desc');
    }
    throw error;
  }
};

// ตรวจสอบว่ามีลายเซ็นแล้วหรือไม่ (เปลี่ยน periodId → assignmentId)
exports.exists = async (evaluateeId, assignmentId, evaluatorId) => {
  const row = await db(TABLE)
    .where({
      evaluatee_id: evaluateeId,
      assignment_id: assignmentId,
      evaluator_id: evaluatorId
    })
    .first();
  return !!row;
};

// สร้างใหม่ (เปลี่ยน period_id → assignment_id)
exports.create = async (payload) => {
  // ตรวจสอบว่ามีลายเซ็นแล้วหรือไม่
  const exists = await exports.exists(payload.evaluatee_id, payload.assignment_id, payload.evaluator_id);
  if (exists) {
    throw new Error('Signature already exists for this evaluatee, assignment and evaluator');
  }

  const [id] = await db(TABLE).insert(payload);
  return exports.findByEvaluateeAndAssignment(payload.evaluatee_id, payload.assignment_id)
    .then(results => results.find(r => r.id === id));
};