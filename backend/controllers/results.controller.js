// controllers/results.controller.js
const repo = require('../repositories/results.repository');
const db = require('../db/knex');

// GET /api/results
exports.list = async (req, res, next) => {
  try {
    const items = await repo.findAll();
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/results/:id
exports.get = async (req, res, next) => {
  try {
    const item = await repo.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

// GET /api/results/me/:assignmentId (เปลี่ยน periodId → assignmentId)
exports.getMyResults = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const items = await repo.findByEvaluateeAssignment(userId, req.params.assignmentId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/results/evaluatee/:evaluateeId/:assignmentId (เปลี่ยน periodId → assignmentId)
exports.getByEvaluatee = async (req, res, next) => {
  try {
    const { evaluateeId, assignmentId } = req.params;
    const items = await repo.findByEvaluateeAssignment(evaluateeId, assignmentId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// POST /api/results/self (เปลี่ยน period_id → assignment_id)
exports.saveSelf = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { indicator_id, assignment_id, score } = req.body;
    if (!indicator_id) return res.status(400).json({ success: false, message: 'indicator_id required' });
    if (!assignment_id) return res.status(400).json({ success: false, message: 'assignment_id required' });
    if (score === undefined) return res.status(400).json({ success: false, message: 'score required' });

    const result = await repo.saveSelf(userId, indicator_id, assignment_id, score);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

// POST /api/results/self/bulk (เปลี่ยน period_id → assignment_id)
exports.saveSelfBulk = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { assignment_id, items, is_submitted } = req.body;
    if (!assignment_id) return res.status(400).json({ success: false, message: 'assignment_id required' });
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: 'items array required' });

    const result = await repo.saveBulk(userId, assignment_id, items, 'self_score', is_submitted);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

// POST /api/results/evaluate (เปลี่ยน period_id → assignment_id)
exports.evaluate = async (req, res, next) => {
  try {
    const { evaluatee_id, indicator_id, assignment_id, score } = req.body;
    if (!evaluatee_id) return res.status(400).json({ success: false, message: 'evaluatee_id required' });
    if (!indicator_id) return res.status(400).json({ success: false, message: 'indicator_id required' });
    if (!assignment_id) return res.status(400).json({ success: false, message: 'assignment_id required' });
    if (score === undefined) return res.status(400).json({ success: false, message: 'score required' });

    const result = await repo.saveEvaluator(evaluatee_id, indicator_id, assignment_id, score);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

// POST /api/results/evaluate/bulk (เปลี่ยน period_id → assignment_id)
exports.evaluateBulk = async (req, res, next) => {
  try {
    const { evaluatee_id, assignment_id, items } = req.body;
    if (!evaluatee_id) return res.status(400).json({ success: false, message: 'evaluatee_id required' });
    if (!assignment_id) return res.status(400).json({ success: false, message: 'assignment_id required' });
    if (!Array.isArray(items)) return res.status(400).json({ success: false, message: 'items array required' });

    const result = await repo.saveBulk(evaluatee_id, assignment_id, items, 'evaluator_score');
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

// GET /api/results/summary/:evaluateeId/:assignmentId (เปลี่ยน periodId → assignmentId)
exports.getSummary = async (req, res, next) => {
  try {
    const { evaluateeId, assignmentId } = req.params;
    const summary = await repo.calculateFinal(evaluateeId, assignmentId);
    res.json({ success: true, data: summary });
  } catch (e) {
    next(e);
  }
};

// DELETE /api/results/:id
exports.remove = async (req, res, next) => {
  try {
    const deleted = await repo.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    next(e);
  }
};


// POST /api/results/self - ประเมินตนเอง (เปลี่ยน period_id → assignment_id)
exports.submitSelf = async (req, res, next) => {
  try {
    const evaluateeId = req.user.id; // จาก JWT
    const { assignment_id, indicator_id, self_score, self_note } = req.body;
    
    // Validation
    if (!assignment_id || !indicator_id || self_score === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'assignment_id, indicator_id, self_score required' 
      });
    }
    
    // Check if exists
    const existing = await db('results')
      .where({ assignment_id, evaluatee_id: evaluateeId, indicator_id })
      .first();
    
    if (existing) {
      // Update
      await db('results')
        .where({ id: existing.id })
        .update({
          self_score,
          self_note: self_note || null,
          self_submitted_at: db.fn.now(),
          status: 'submitted'
        });
    } else {
      // Insert
      await db('results').insert({
        assignment_id,
        evaluatee_id: evaluateeId,
        indicator_id,
        self_score,
        self_note: self_note || null,
        self_submitted_at: db.fn.now(),
        status: 'submitted'
      });
    }
    
    const result = await db('results')
      .where({ assignment_id, evaluatee_id: evaluateeId, indicator_id })
      .first();
    
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

// POST /api/results/evaluate - กรรมการให้คะแนน (เปลี่ยน period_id → assignment_id)
exports.submitEvaluate = async (req, res, next) => {
  try {
    const evaluatorId = req.user.id;
    const { result_id, evaluator_score, evaluator_note } = req.body;
    
    if (!result_id || evaluator_score === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'result_id, evaluator_score required' 
      });
    }
    
    // Check authorization (ต้องเป็นกรรมการที่ได้รับมอบหมาย)
    const result = await db('results').where({ id: result_id }).first();
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    
    const assignment = await db('assignments')
      .where({
        id: result.assignment_id,
        evaluatee_id: result.evaluatee_id,
        evaluator_id: evaluatorId
      })
      .first();
    
    if (!assignment) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to evaluate this person' 
      });
    }
    
    // Update
    await db('results')
      .where({ id: result_id })
      .update({
        evaluator_id: evaluatorId,
        evaluator_score,
        evaluator_note: evaluator_note || null,
        evaluated_at: db.fn.now(),
        status: 'evaluated'
      });
    
    const updated = await db('results').where({ id: result_id }).first();
    
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

// GET /api/results/my-progress - ดูความคืบหน้าตัวเอง (เปลี่ยน period_id → assignment_id)
exports.getMyProgress = async (req, res, next) => {
  try {
    const evaluateeId = req.user.id;
    const { assignment_id } = req.query;
    
    if (!assignment_id) {
      return res.status(400).json({ success: false, message: 'assignment_id required' });
    }
    
    const results = await db('results as er')
      .select(
        'er.*',
        'i.name_th as indicator_name',
        'i.type as indicator_type',
        't.title_th as topic_name'
      )
      .leftJoin('indicators as i', 'er.indicator_id', 'i.id')
      .leftJoin('topics as t', 'i.topic_id', 't.id')
      .where('er.evaluatee_id', evaluateeId)
      .where('er.assignment_id', assignment_id)
      .orderBy('t.id', 'asc')
      .orderBy('i.id', 'asc');
    
    res.json({ success: true, items: results, total: results.length });
  } catch (e) {
    next(e);
  }
};

// backend/controllers/results.controller.js
// ============= ⚠️ ส่วนเพิ่มเติม: Auto-Create Results (ใช้ Repository) =============



// POST /api/results/init-for-assignment
// สร้าง evaluation_results ให้ evaluatee ใน assignment ที่กำหนด (เปลี่ยน period_id → assignment_id)
exports.initResultsForAssignment = async (req, res, next) => {
  try {
    const { assignment_id, evaluatee_id } = req.body;
    
    if (!assignment_id) {
      return res.status(400).json({ success: false, message: 'assignment_id required' });
    }
    
    if (!evaluatee_id) {
      return res.status(400).json({ success: false, message: 'evaluatee_id required' });
    }

    const result = await repo.initResultsForAssignment(assignment_id, evaluatee_id);

    res.json({ 
      success: true, 
      message: `Created ${result.created} evaluation records`,
      data: result
    });
  } catch (e) {
    next(e);
  }
};
