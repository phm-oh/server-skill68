// backend/controllers/assignments.controller.js
// Controller สำหรับจัดการ assignments (การมอบหมายงานประเมิน)

const repo = require('../repositories/assignments.repository');

// GET /api/assignments
exports.list = async (req, res, next) => {
  try {
    const items = await repo.findAll();
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/assignments/:id
exports.get = async (req, res, next) => {
  try {
    const item = await repo.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

// ============================================================
// ✨ ส่วนเพิ่มเติม: GET /api/assignments/mine
// รองรับทั้ง evaluator และ evaluatee (ลบ period_id filter)
// ============================================================
exports.getMine = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const isActive = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : null;

    let items = [];

    // ถ้าเป็น evaluator ให้ดึงงานที่ได้รับมอบหมายให้ประเมิน
    if (userRole === 'evaluator' || userRole === 'admin') {
      items = await repo.findByEvaluator(userId);
      if (isActive !== null) {
        items = items.filter(item => item.is_active === (isActive ? 1 : 0));
      }
    }
    // ถ้าเป็น evaluatee ให้ดึงงานที่ตัวเองถูกประเมิน
    else if (userRole === 'evaluatee') {
      items = await repo.findByEvaluatee(userId, isActive);
    }

    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// POST /api/assignments (เพิ่ม start_date, end_date, is_active, ลบ period_id)
exports.create = async (req, res, next) => {
  try {
    const { evaluator_id, evaluatee_id, start_date, end_date, is_active } = req.body;
    
    if (!evaluator_id) return res.status(400).json({ success: false, message: 'evaluator_id required' });
    if (!evaluatee_id) return res.status(400).json({ success: false, message: 'evaluatee_id required' });
    if (!start_date) return res.status(400).json({ success: false, message: 'start_date required' });
    if (!end_date) return res.status(400).json({ success: false, message: 'end_date required' });
    
    if (evaluator_id === evaluatee_id) {
      return res.status(400).json({ success: false, message: 'Cannot assign to self' });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ success: false, message: 'start_date must be before end_date' });
    }

    const created = await repo.create({ 
      evaluator_id, 
      evaluatee_id, 
      start_date,
      end_date,
      is_active: is_active !== undefined ? is_active : 1
    });
    
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    if (e.message.includes('exists')) {
      return res.status(409).json({ success: false, message: e.message });
    }
    next(e);
  }
};

// POST /api/assignments/bulk
exports.createBulk = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }

    const result = await repo.createBulk(items);

    // ถ้ามีการสร้างสำเร็จอย่างน้อย 1 รายการ ให้ถือว่าสำเร็จ
    if (result.created > 0) {
      res.status(201).json({
        success: true,
        data: result,
        message: `Created ${result.created} assignments${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}`
      });
    } else {
      // ถ้าทุกรายการซ้ำหมด
      res.status(200).json({
        success: true,
        data: result,
        message: 'All assignments already exist'
      });
    }
  } catch (e) {
    next(e);
  }
};

// PUT /api/assignments/:id (เพิ่ม update)
exports.update = async (req, res, next) => {
  try {
    const { evaluator_id, evaluatee_id, start_date, end_date, is_active } = req.body;
    
    const existing = await repo.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ success: false, message: 'start_date must be before end_date' });
    }

    const updated = await repo.update(req.params.id, {
      evaluator_id,
      evaluatee_id,
      start_date,
      end_date,
      is_active
    });
    
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

// DELETE /api/assignments/:id
exports.remove = async (req, res, next) => {
  try {
    const deleted = await repo.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    next(e);
  }
};