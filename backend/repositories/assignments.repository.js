// backend/repositories/assignments.repository.js
// Repository สำหรับจัดการ assignments (การมอบหมายงานประเมิน)

const db = require('../db/knex');
const TABLE = 'assignments';

// ============================================================
// ฟังก์ชันเดิม - ตรวจสอบสิทธิ์ (แก้ไขให้ใช้ assignment_id แทน period_id)
// ============================================================

// ยืนยันว่า evaluatee มี assignment
exports.hasEvaluateeAssignment = async (evaluatee_id) => {
  const row = await db(TABLE).where({ evaluatee_id, is_active: 1 }).first();
  return !!row;
};

// ยืนยันสิทธิ evaluator ต่อ evaluatee
exports.hasPair = async ({ evaluator_id, evaluatee_id }) => {
  const row = await db(TABLE)
    .where({ evaluator_id, evaluatee_id, is_active: 1 })
    .first();
  return !!row;
};

// ตรวจสอบ assignment active
exports.isActive = async (assignmentId) => {
  const row = await db(TABLE).where({ id: assignmentId, is_active: 1 }).first();
  return !!row;
};

// ============================================================
// ฟังก์ชัน CRUD พื้นฐาน
// ============================================================

// ดึงทั้งหมด พร้อม JOIN (ลบ periods join)
exports.findAll = async () => {
  return db(TABLE)
    .select(
      'assignments.*',
      'evaluator.name_th as evaluator_name',
      'evaluatee.name_th as evaluatee_name'
    )
    .leftJoin('users as evaluator', 'assignments.evaluator_id', 'evaluator.id')
    .leftJoin('users as evaluatee', 'assignments.evaluatee_id', 'evaluatee.id')
    .orderBy('assignments.created_at', 'desc');
};

// ดึงรายการเดียว
exports.findById = async (id) => {
  return db(TABLE).where({ id }).first();
};

// ดึงงานที่กรรมการได้รับมอบหมาย พร้อม JOIN (ลบ periods join)
exports.findByEvaluator = async (evaluatorId) => {
  return db(TABLE)
    .select(
      'assignments.*',
      'evaluatee.name_th as evaluatee_name'
    )
    .leftJoin('users as evaluatee', 'assignments.evaluatee_id', 'evaluatee.id')
    .where('assignments.evaluator_id', evaluatorId)
    .orderBy('assignments.created_at', 'desc');
};

// ============================================================
// ⭐⭐⭐ ฟังก์ชันใหม่ - สำหรับ evaluatee ⭐⭐⭐
// ============================================================

// ดึงงานของผู้ถูกประเมิน (evaluatee)
// ใช้สำหรับให้ evaluatee ดูว่าถูกใครประเมินบ้าง (ลบ periods join)
exports.findByEvaluatee = async (evaluateeId, isActive = null) => {
  let query = db(TABLE)
    .select(
      'assignments.*',
      'evaluator.name_th as evaluator_name'
    )
    .leftJoin('users as evaluator', 'assignments.evaluator_id', 'evaluator.id')
    .where('assignments.evaluatee_id', evaluateeId);

  if (isActive !== null) {
    query = query.andWhere('assignments.is_active', isActive ? 1 : 0);
  }

  return query.orderBy('assignments.created_at', 'desc');
};

// ============================================================
// ฟังก์ชันอื่นๆ
// ============================================================

// ดึง assignments ที่ active
exports.findActive = async () => {
  return db(TABLE)
    .select(
      'assignments.*',
      'evaluator.name_th as evaluator_name',
      'evaluatee.name_th as evaluatee_name'
    )
    .leftJoin('users as evaluator', 'assignments.evaluator_id', 'evaluator.id')
    .leftJoin('users as evaluatee', 'assignments.evaluatee_id', 'evaluatee.id')
    .where('assignments.is_active', 1)
    .orderBy('assignments.start_date', 'desc');
};

// สร้างใหม่ (เพิ่ม start_date, end_date, is_active, ลบ period_id)
exports.create = async (payload) => {
  const exists = await exports.hasPair({
    evaluator_id: payload.evaluator_id,
    evaluatee_id: payload.evaluatee_id
  });
  if (exists) throw new Error('Assignment already exists');

  const [id] = await db(TABLE).insert(payload);
  return exports.findById(id);
};

// สร้างหลายรายการ (Skip รายการที่ซ้ำ) - แก้ให้รองรับ start_date, end_date, is_active
exports.createBulk = async (items) => {
  const created = [];
  const skipped = [];

  for (const item of items) {
    // Filter out fields ที่ต้องการ
    const cleanItem = {
      evaluator_id: item.evaluator_id,
      evaluatee_id: item.evaluatee_id,
      start_date: item.start_date,
      end_date: item.end_date,
      is_active: item.is_active !== undefined ? item.is_active : 1
    };

    const exists = await exports.hasPair({
      evaluator_id: cleanItem.evaluator_id,
      evaluatee_id: cleanItem.evaluatee_id
    });

    if (exists) {
      skipped.push({
        evaluator_id: cleanItem.evaluator_id,
        evaluatee_id: cleanItem.evaluatee_id,
        reason: 'already exists'
      });
    } else {
      const [id] = await db(TABLE).insert(cleanItem);
      created.push(id);
    }
  }

  return {
    created: created.length,
    skipped: skipped.length,
    total: items.length,
    details: { created, skipped }
  };
};

// แก้ไข
exports.update = async (id, payload) => {
  // ถ้ามีการเปลี่ยน evaluator_id หรือ evaluatee_id ให้ตรวจสอบว่าไม่ซ้ำกับ assignment อื่น
  if (payload.evaluator_id !== undefined || payload.evaluatee_id !== undefined) {
    const existing = await exports.findById(id);
    if (!existing) {
      throw new Error('Assignment not found');
    }

    const newEvaluatorId = payload.evaluator_id !== undefined ? payload.evaluator_id : existing.evaluator_id;
    const newEvaluateeId = payload.evaluatee_id !== undefined ? payload.evaluatee_id : existing.evaluatee_id;

    // ตรวจสอบว่ามี assignment อื่นที่มี evaluator_id และ evaluatee_id เดียวกันหรือไม่ (ยกเว้นตัวเอง)
    const duplicate = await db(TABLE)
      .where({ evaluator_id: newEvaluatorId, evaluatee_id: newEvaluateeId })
      .where('id', '!=', id)
      .where('is_active', 1)
      .first();

    if (duplicate) {
      throw new Error('Assignment already exists');
    }
  }

  const data = {};
  if (payload.start_date !== undefined) data.start_date = payload.start_date;
  if (payload.end_date !== undefined) data.end_date = payload.end_date;
  if (payload.is_active !== undefined) data.is_active = payload.is_active;
  if (payload.evaluator_id !== undefined) data.evaluator_id = payload.evaluator_id;
  if (payload.evaluatee_id !== undefined) data.evaluatee_id = payload.evaluatee_id;

  await db(TABLE).where({ id }).update(data);
  return exports.findById(id);
};

// ลบ
exports.remove = async (id) => {
  return db(TABLE).where({ id }).del();
};