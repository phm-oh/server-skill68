// backend/controllers/indicators.controller.js
// Controller สำหรับจัดการตัวชี้วัด (indicators)

const indicatorsRepo = require('../repositories/indicators.repository');

// GET /api/indicators
exports.list = async (req, res, next) => {
  try {
    const items = await indicatorsRepo.findAll();
    console.log('📋 Indicators fetched:', items.length, 'items');
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    console.error('❌ Error in indicators.list:', e);
    next(e);
  }
};

// GET /api/indicators/:id
exports.get = async (req, res, next) => {
  try {
    const item = await indicatorsRepo.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
};

// GET /api/indicators/topic/:topicId
exports.getByTopic = async (req, res, next) => {
  try {
    const items = await indicatorsRepo.findByTopic(req.params.topicId);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// GET /api/indicators/type/:type
exports.getByType = async (req, res, next) => {
  try {
    const items = await indicatorsRepo.findByType(req.params.type);
    res.json({ success: true, items, total: items.length });
  } catch (e) {
    next(e);
  }
};

// POST /api/indicators
// ⭐ ส่วนเพิ่มเติม: รองรับ active field
exports.create = async (req, res, next) => {
  try {
    const { topic_id, code, name_th, type, weight, active } = req.body;
    
    if (!topic_id) return res.status(400).json({ success: false, message: 'topic_id required' });
    if (!name_th) return res.status(400).json({ success: false, message: 'name_th required' });
    if (!code) return res.status(400).json({ success: false, message: 'code required' });

    const created = await indicatorsRepo.create({
      topic_id,
      code,
      name_th,
      type: type || 'score_1_4',
      weight: weight !== undefined ? weight : 1,
      active: active !== undefined ? active : 1
    });
    
    console.log('✅ Indicator created:', created);
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
};

// PUT /api/indicators/:id
// ⭐ ส่วนเพิ่มเติม: log การ update
exports.update = async (req, res, next) => {
  try {
    const updated = await indicatorsRepo.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    console.log('✅ Indicator updated:', updated);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

// DELETE /api/indicators/:id
exports.remove = async (req, res, next) => {
  try {
    const deleted = await indicatorsRepo.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    next(e);
  }
};