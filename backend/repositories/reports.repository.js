// backend/repositories/reports.repository.js
// Repository สำหรับจัดการรายงานสรุปผลการประเมิน
const db = require('../db/knex');

// สรุปผลรายบุคคล (รายละเอียดครบ) - เปลี่ยน periodId → assignmentId
exports.getIndividualSummary = async (evaluateeId, assignmentId) => {
  // ข้อมูลพื้นฐาน
  const evaluatee = await db('users')
    .select('id', 'name_th', 'email')
    .where('users.id', evaluateeId)
    .first();

  if (!evaluatee) return null;

  // ข้อมูล assignment (แทน periods)
  const assignment = await db('assignments')
    .select('id', 'start_date', 'end_date', 'is_active', 'evaluator_id')
    .where('id', assignmentId)
    .first();

  if (!assignment) return null;

  // ผลการประเมินแต่ละตัวชี้วัด
  const results = await db('results as er')
    .select(
      'er.*',
      'i.name_th as indicator_name',
      'i.type as indicator_type',
      'i.weight as indicator_weight',
      't.title_th as topic_name',
      't.weight as topic_weight',
      'evaluator.name_th as evaluator_name'
    )
    .leftJoin('indicators as i', 'er.indicator_id', 'i.id')
    .leftJoin('topics as t', 'i.topic_id', 't.id')
    .leftJoin('users as evaluator', 'er.evaluator_id', 'evaluator.id')
    .where('er.evaluatee_id', evaluateeId)
    .where('er.assignment_id', assignmentId)
    .orderBy('t.id', 'asc')
    .orderBy('i.id', 'asc');

  // ความคิดเห็นจากกรรมการ
  const comments = await db('comments')
    .select(
      'comments.*',
      'users.name_th as evaluator_name'
    )
    .leftJoin('users', 'comments.evaluator_id', 'users.id')
    .where('comments.evaluatee_id', evaluateeId)
    .where('comments.assignment_id', assignmentId)
    .orderBy('comments.created_at', 'desc');

  // ลายเซ็นกรรมการ
  let signatures = [];
  try {
    signatures = await db('signatures')
      .select(
        'signatures.*',
        'users.name_th as evaluator_name'
      )
      .leftJoin('users', 'signatures.evaluator_id', 'users.id')
      .where('signatures.evaluatee_id', evaluateeId)
      .where('signatures.assignment_id', assignmentId)
      .orderBy('signatures.signed_at', 'desc');
  } catch (error) {
    // ถ้า column ไม่มี ให้ลอง query แบบไม่มี table prefix
    if (error.message && error.message.includes('Unknown column')) {
      signatures = await db('signatures')
        .select(
          'signatures.*',
          'users.name_th as evaluator_name'
        )
        .leftJoin('users', 'signatures.evaluator_id', 'users.id')
        .where('evaluatee_id', evaluateeId)
        .where('assignment_id', assignmentId)
        .orderBy('signed_at', 'desc');
    } else {
      console.error('[Reports] Error fetching signatures:', error);
    }
  }

  // คำนวณคะแนนรวม
  const totalSelfScore = results.reduce((sum, r) => sum + (parseFloat(r.self_score) || 0), 0);
  const totalEvaluatorScore = results.reduce((sum, r) => sum + (parseFloat(r.evaluator_score) || 0), 0);
  const totalWeight = results.reduce((sum, r) => sum + (parseFloat(r.indicator_weight) || 0), 0);

  return {
    evaluatee,
    assignment,
    results,
    comments,
    signatures,
    summary: {
      total_indicators: results.length,
      total_self_score: totalSelfScore,
      total_evaluator_score: totalEvaluatorScore,
      total_weight: totalWeight,
      avg_self_score: results.length > 0 ? (totalSelfScore / results.length).toFixed(2) : 0,
      avg_evaluator_score: results.length > 0 ? (totalEvaluatorScore / results.length).toFixed(2) : 0
    }
  };
};

// สรุปผลรวมทั้งหมดใน assignment (เปลี่ยน periodId → assignmentId)
exports.getOverallSummary = async (assignmentId) => {
  // ใช้ calculateFinal เพื่อคำนวณคะแนนรวมที่ถูกต้อง
  const allResults = await db('results as er')
    .select('er.evaluatee_id', 'u.name_th as evaluatee_name')
    .leftJoin('users as u', 'er.evaluatee_id', 'u.id')
    .where('er.assignment_id', assignmentId)
    .groupBy('er.evaluatee_id', 'u.name_th')
    .orderBy('u.name_th', 'asc');

  const resultsRepo = require('./results.repository');
  const summaries = await Promise.all(
    allResults.map(async (row) => {
      const summary = await resultsRepo.calculateFinal(row.evaluatee_id, assignmentId);
      return {
        evaluatee_id: row.evaluatee_id,
        evaluatee_name: row.evaluatee_name,
        total_score: summary.total_score || 0,
        evaluator_total: summary.evaluator_total || 0,
        self_total: summary.self_total || 0,
        status: summary.status || 'draft'
      };
    })
  );

  return summaries;
};

// สรุปตามหัวข้อการประเมิน (เปลี่ยน periodId → assignmentId)
exports.getTopicSummary = async (assignmentId) => {
  const summary = await db('results as er')
    .select(
      't.id as topic_id',
      't.title_th as topic_name',
      't.weight as topic_weight'
    )
    .count('er.id as total_results')
    .avg('er.self_score as avg_self_score')
    .avg('er.evaluator_score as avg_evaluator_score')
    .leftJoin('indicators as i', 'er.indicator_id', 'i.id')
    .leftJoin('topics as t', 'i.topic_id', 't.id')
    .where('er.assignment_id', assignmentId)
    .groupBy('t.id', 't.title_th', 't.weight')
    .orderBy('t.id', 'asc');

  return summary;
};

// ข้อมูลสำหรับ Export PDF (เปลี่ยน periodId → assignmentId)
exports.getExportData = async (evaluateeId, assignmentId) => {
  return exports.getIndividualSummary(evaluateeId, assignmentId);
};