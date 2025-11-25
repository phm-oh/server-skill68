// backend/controllers/topics.controller.js
// Controller สำหรับจัดการหัวข้อการประเมิน
const topicsRepo = require('../repositories/topics.repository');

// GET /api/topics?period_id=1
exports.list = async (req, res, next) => {
  try {
    const periodId = req.query.period_id ? Number(req.query.period_id) : null;
    const items = await topicsRepo.findAll(periodId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/topics/active
exports.listActive = async (req, res, next) => {
  try {
    const items = await topicsRepo.findActive();
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/topics/:id
exports.get = async (req, res, next) => {
  try {
    const item = await topicsRepo.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

// POST /api/topics (admin only)
exports.create = async (req, res, next) => {
  try {
    // ตรวจสิทธิ์
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    // ตรวจ input
    const { code, title_th } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'code required' });
    }
    if (!title_th) {
      return res.status(400).json({ success: false, message: 'title_th required' });
    }

    // สร้าง
    const data = await topicsRepo.create({
      code,
      title_th,
      description: req.body.description || null,
      weight: req.body.weight !== undefined ? req.body.weight : 0,
      active: req.body.active !== undefined ? req.body.active : 1
    });

    res.status(201).json({ success: true, data });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Code already exists' });
    }
    next(e);
  }
};

// PUT /api/topics/:id (admin only)
exports.update = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const existing = await topicsRepo.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    const { code, title_th, description, weight, active } = req.body;
    const data = await topicsRepo.update(req.params.id, {
      code,
      title_th,
      description,
      weight,
      active
    });

    res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Code already exists' });
    }
    next(e);
  }
};

// DELETE /api/topics/:id (admin only)
exports.remove = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    // CASCADE enabled in schema - indicators will be deleted automatically
    const deleted = await topicsRepo.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    res.json({ success: true, message: 'Topic deleted' });
  } catch (e) {
    next(e);
  }
};