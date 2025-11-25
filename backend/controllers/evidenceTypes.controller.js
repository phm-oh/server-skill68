// backend/controllers/evidenceTypes.controller.js
// Controller สำหรับจัดการชนิดหลักฐาน
const evidenceTypesRepo = require('../repositories/evidenceTypes.repository');

// GET /api/evidence-types
exports.list = async (req, res, next) => {
  try {
    const items = await evidenceTypesRepo.findAll();
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/evidence-types/:id
exports.get = async (req, res, next) => {
  try {
    const item = await evidenceTypesRepo.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Evidence type not found' });
    }
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

// POST /api/evidence-types (admin only)
exports.create = async (req, res, next) => {
  try {
    // ตรวจสิทธิ์
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    // ตรวจ input
    const { code, name_th } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'code required' });
    }
    if (!name_th) {
      return res.status(400).json({ success: false, message: 'name_th required' });
    }

    // สร้าง
    const data = await evidenceTypesRepo.create({
      code,
      name_th,
      description: req.body.description || null
    });

    res.status(201).json({ success: true, data });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Code already exists' });
    }
    next(e);
  }
};

// PUT /api/evidence-types/:id (admin only)
exports.update = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const existing = await evidenceTypesRepo.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Evidence type not found' });
    }

    const { code, name_th, description } = req.body;
    const data = await evidenceTypesRepo.update(req.params.id, {
      code,
      name_th,
      description
    });

    res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Code already exists' });
    }
    next(e);
  }
};

// DELETE /api/evidence-types/:id (admin only)
exports.remove = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    // ตรวจว่ามี indicators ใช้งานอยู่หรือไม่
    const count = await evidenceTypesRepo.countIndicators(req.params.id);
    if (count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete evidence type with ${count} indicators. Remove mapping first.` 
      });
    }

    const deleted = await evidenceTypesRepo.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Evidence type not found' });
    }

    res.json({ success: true, message: 'Evidence type deleted' });
  } catch (e) {
    next(e);
  }
};