// backend/controllers/comments.controller.js
// Controller สำหรับจัดการความคิดเห็นกรรมการ
const commentsRepo = require('../repositories/comments.repository');

// GET /api/comments
exports.list = async (req, res, next) => {
  try {
    const items = await commentsRepo.findAll();
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/comments/:id
exports.get = async (req, res, next) => {
  try {
    const item = await commentsRepo.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

// GET /api/comments/evaluatee/:evaluateeId/assignment/:assignmentId (เปลี่ยน period → assignment)
exports.getByEvaluateeAndAssignment = async (req, res, next) => {
  try {
    const { evaluateeId, assignmentId } = req.params;
    const items = await commentsRepo.findByEvaluateeAndAssignment(evaluateeId, assignmentId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/comments/evaluator/:evaluatorId
exports.getByEvaluator = async (req, res, next) => {
  try {
    const items = await commentsRepo.findByEvaluator(req.params.evaluatorId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/comments/assignment/:assignmentId (เปลี่ยน period → assignment)
exports.getByAssignment = async (req, res, next) => {
  try {
    const items = await commentsRepo.findByAssignment(req.params.assignmentId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// POST /api/comments (เปลี่ยน period_id → assignment_id)
exports.create = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { assignment_id, evaluatee_id, comment_text, comment_type } = req.body;

    // ตรวจ input
    if (!assignment_id) {
      return res.status(400).json({ success: false, message: 'assignment_id required' });
    }
    if (!evaluatee_id) {
      return res.status(400).json({ success: false, message: 'evaluatee_id required' });
    }
    if (!comment_text) {
      return res.status(400).json({ success: false, message: 'comment_text required' });
    }

    // ตรวจสิทธิ์: ต้องเป็น evaluator หรือ admin
    if (req.user.role !== 'evaluator' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only evaluator or admin can comment' });
    }

    // สร้าง
    const data = await commentsRepo.create({
      assignment_id,
      evaluatee_id,
      evaluator_id: userId,
      comment_text,
      comment_type: comment_type || 'general'
    });

    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// PUT /api/comments/:id
exports.update = async (req, res, next) => {
  try {
    // ตรวจสิทธิ์: เฉพาะ admin หรือเจ้าของคอมเมนต์
    const comment = await commentsRepo.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (req.user.role !== 'admin' && req.user.id !== comment.evaluator_id) {
      return res.status(403).json({ success: false, message: 'Cannot update other evaluator comment' });
    }

    const { comment_text, comment_type } = req.body;
    const data = await commentsRepo.update(req.params.id, {
      comment_text,
      comment_type
    });

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// DELETE /api/comments/:id
exports.remove = async (req, res, next) => {
  try {
    // ตรวจสิทธิ์: เฉพาะ admin หรือเจ้าของคอมเมนต์
    const comment = await commentsRepo.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (req.user.role !== 'admin' && req.user.id !== comment.evaluator_id) {
      return res.status(403).json({ success: false, message: 'Cannot delete other evaluator comment' });
    }

    const deleted = await commentsRepo.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (e) {
    next(e);
  }
};