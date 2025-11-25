// repositories/results.repository.js
const db = require('../db/knex');
const TABLE = 'results';

// ดึงทั้งหมด
exports.findAll = async () => {
  return db(TABLE).select('*').orderBy('created_at', 'desc');
};

// ดึงรายการเดียว
exports.findById = async (id) => {
  return db(TABLE).where({ id }).first();
};

// ดึงผลของบุคคลใน assignment พร้อม JOIN ข้อมูลที่เกี่ยวข้อง (เปลี่ยน period_id → assignment_id)
exports.findByEvaluateeAssignment = async (evaluateeId, assignmentId) => {
  return db(TABLE)
    .select(
      'results.*',
      'indicators.id as indicator_id',
      'indicators.name_th as indicator_name',
      'indicators.type as indicator_type',
      'indicators.weight as indicator_weight',
      'topics.id as topic_id',
      'topics.title_th as topic_title',
      'topics.weight as topic_weight',
      'users.id as evaluatee_id',
      'users.name_th as evaluatee_name',
      'assignments.id as assignment_id',
      'assignments.start_date',
      'assignments.end_date',
      'assignments.is_active'
    )
    .leftJoin('indicators', 'results.indicator_id', 'indicators.id')
    .leftJoin('topics', 'indicators.topic_id', 'topics.id')
    .leftJoin('users', 'results.evaluatee_id', 'users.id')
    .leftJoin('assignments', 'results.assignment_id', 'assignments.id')
    .where({ 'results.evaluatee_id': evaluateeId, 'results.assignment_id': assignmentId })
    .orderBy('topics.id', 'asc')
    .orderBy('indicators.id', 'asc');
};

// ตรวจสอบว่ามีแล้วหรือไม่ (เปลี่ยน period_id → assignment_id)
exports.exists = async (evaluateeId, indicatorId, assignmentId) => {
  const row = await db(TABLE)
    .where({ evaluatee_id: evaluateeId, indicator_id: indicatorId, assignment_id: assignmentId })
    .first();
  return !!row;
};

// สร้างใหม่ (เปลี่ยน period_id → assignment_id)
exports.create = async (payload) => {
  const exists = await exports.exists(
    payload.evaluatee_id,
    payload.indicator_id,
    payload.assignment_id
  );
  if (exists) throw new Error('Result already exists');

  const [id] = await db(TABLE).insert(payload);
  return exports.findById(id);
};

// แก้ไข
exports.update = async (id, payload) => {
  const data = {};
  if (payload.self_score !== undefined) data.self_score = payload.self_score;
  if (payload.evaluator_score !== undefined) data.evaluator_score = payload.evaluator_score;
  if (payload.final_score !== undefined) data.final_score = payload.final_score;

  await db(TABLE).where({ id }).update(data);
  return exports.findById(id);
};

// บันทึกคะแนนตนเอง (เปลี่ยน period_id → assignment_id)
exports.saveSelf = async (evaluateeId, indicatorId, assignmentId, score) => {
  const exists = await exports.exists(evaluateeId, indicatorId, assignmentId);
  
  if (exists) {
    // อัปเดต
    await db(TABLE)
      .where({ evaluatee_id: evaluateeId, indicator_id: indicatorId, assignment_id: assignmentId })
      .update({ self_score: score });
  } else {
    // สร้างใหม่
    await db(TABLE).insert({
      evaluatee_id: evaluateeId,
      indicator_id: indicatorId,
      assignment_id: assignmentId,
      self_score: score
    });
  }

  return db(TABLE)
    .where({ evaluatee_id: evaluateeId, indicator_id: indicatorId, assignment_id: assignmentId })
    .first();
};

// บันทึกคะแนนจากกรรมการ (เปลี่ยน period_id → assignment_id)
exports.saveEvaluator = async (evaluateeId, indicatorId, assignmentId, score) => {
  const exists = await exports.exists(evaluateeId, indicatorId, assignmentId);
  
  if (exists) {
    await db(TABLE)
      .where({ evaluatee_id: evaluateeId, indicator_id: indicatorId, assignment_id: assignmentId })
      .update({ evaluator_score: score });
  } else {
    await db(TABLE).insert({
      evaluatee_id: evaluateeId,
      indicator_id: indicatorId,
      assignment_id: assignmentId,
      evaluator_score: score
    });
  }

  return db(TABLE)
    .where({ evaluatee_id: evaluateeId, indicator_id: indicatorId, assignment_id: assignmentId })
    .first();
};

// บันทึกหลายรายการ (เปลี่ยน period_id → assignment_id)
exports.saveBulk = async (evaluateeId, assignmentId, items, scoreType, isSubmitted = false) => {
  for (const item of items) {
    const exists = await exports.exists(evaluateeId, item.indicator_id, assignmentId);

    let updateData = {};
    let insertData = {
      evaluatee_id: evaluateeId,
      indicator_id: item.indicator_id,
      assignment_id: assignmentId
    };

    // Handle different score types with their associated fields
    if (scoreType === 'self_score') {
      updateData = {
        self_score: item.self_score,
        self_note: item.self_comment || null
      };
      insertData = {
        ...insertData,
        self_score: item.self_score,
        self_note: item.self_comment || null
      };

      // Update status and timestamp if submitted
      if (isSubmitted) {
        updateData.status = 'submitted';
        updateData.self_submitted_at = db.fn.now();
        insertData.status = 'submitted';
        insertData.self_submitted_at = db.fn.now();
      }
    } else if (scoreType === 'evaluator_score') {
      updateData = {
        evaluator_score: item.evaluator_score,
        evaluator_note: item.evaluator_note || null,
        evaluated_at: db.fn.now(),
        status: 'approved'
      };
      insertData = {
        ...insertData,
        evaluator_score: item.evaluator_score,
        evaluator_note: item.evaluator_note || null,
        evaluated_at: db.fn.now(),
        status: 'approved'
      };
    }

    if (exists) {
      await db(TABLE)
        .where({ evaluatee_id: evaluateeId, indicator_id: item.indicator_id, assignment_id: assignmentId })
        .update(updateData);
    } else {
      await db(TABLE).insert(insertData);
    }
  }
  return { saved: items.length };
};

// คำนวณคะแนนรวม (เปลี่ยน period_id → assignment_id)
exports.calculateFinal = async (evaluateeId, assignmentId) => {
  const results = await db(TABLE)
    .select(
      'results.*',
      'indicators.weight',
      'indicators.type',
      'users.name_th as evaluatee_name'
    )
    .leftJoin('indicators', 'results.indicator_id', 'indicators.id')
    .leftJoin('users', 'results.evaluatee_id', 'users.id')
    .where({ 'results.evaluatee_id': evaluateeId, 'results.assignment_id': assignmentId });

  let totalScore = 0;
  let selfTotal = 0;
  let evaluatorTotal = 0;
  let evaluateeName = '-';
  let status = 'draft';

  let totalWeight = 0;
  
  for (const r of results) {
    // Scores are already calculated as (selectedValue / maxValue) * weight
    // So we just need to sum them up
    const selfScore = parseFloat(r.self_score) || 0;
    const evaluatorScore = parseFloat(r.evaluator_score) || 0;
    const indicatorWeight = parseFloat(r.weight) || 0;

    selfTotal += selfScore;
    evaluatorTotal += evaluatorScore;
    totalWeight += indicatorWeight;

    // Use evaluator score if available, otherwise self score
    totalScore += evaluatorScore > 0 ? evaluatorScore : selfScore;

    // Get evaluatee name from first result
    if (!evaluateeName || evaluateeName === '-') {
      evaluateeName = r.evaluatee_name || '-';
    }

    // Determine overall status (highest status wins)
    if (r.status === 'approved') status = 'approved';
    else if (r.status === 'evaluated' && status !== 'approved') status = 'evaluated';
    else if (r.status === 'submitted' && status === 'draft') status = 'submitted';
  }

  // Normalize score to 100 if totalWeight > 0
  // คะแนนเต็ม = totalWeight, แต่ระบบแสดงเป็น 100
  const normalizeScore = (score) => {
    if (totalWeight > 0) {
      return (score / totalWeight) * 100;
    }
    return score;
  };

  return {
    evaluatee_id: evaluateeId,
    evaluatee_name: evaluateeName,
    assignment_id: assignmentId,
    total_score: normalizeScore(totalScore),
    final_score: normalizeScore(totalScore),
    self_total: normalizeScore(selfTotal),
    evaluator_total: normalizeScore(evaluatorTotal),
    total_weight: totalWeight,
    status: status
  };
};

// ลบ
exports.remove = async (id) => {
  return db(TABLE).where({ id }).del();
};

// backend/repositories/results.repository.js


// สร้าง evaluation_results ให้ evaluatee ใน assignment ที่กำหนด (เปลี่ยน period_id → assignment_id)
exports.initResultsForAssignment = async (assignmentId, evaluateeId) => {
  // ดึง indicators ที่ active ทั้งหมด
  const indicators = await db('indicators')
    .select('id')
    .where('active', 1);

  if (indicators.length === 0) {
    return { created: 0, total_indicators: 0 };
  }

  let createdCount = 0;

  for (const indicator of indicators) {
    // เช็คว่ามีอยู่แล้วหรือไม่
    const existing = await db(TABLE)
      .where({
        assignment_id: assignmentId,
        evaluatee_id: evaluateeId,
        indicator_id: indicator.id
      })
      .first();

    if (!existing) {
      await db(TABLE).insert({
        assignment_id: assignmentId,
        evaluatee_id: evaluateeId,
        indicator_id: indicator.id,
        self_score: null,
        self_note: null,
        evaluator_score: null,
        evaluator_id: null,
        evaluator_note: null,
        status: 'draft'
      });
      createdCount++;
    }
  }

  return {
    created: createdCount,
    total_indicators: indicators.length
  };
};

// (ลบ initResultsForEvaluatee แล้ว - ใช้ initResultsForAssignment แทน)