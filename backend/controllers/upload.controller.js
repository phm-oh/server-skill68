const path = require('path');
const fs = require('fs');
const attRepo = require('../repositories/attachments');
const asgRepo = require('../repositories/assignments.repository');
const mapRepo = require('../repositories/indicatorEvidence');
const db = require('../db/knex');

// ---------- helpers ----------
function safeUnlink(abs) {
  try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch {}
}
function relFromUploads(absPath) {
  // ให้ได้ path แบบ relative ต่อโฟลเดอร์ uploads และใช้ slash เดียว
  return path
    .relative(path.join(__dirname, '..', 'uploads'), absPath)
    .replace(/\\/g, '/');
}
async function isAssignmentActive(assignment_id) {
  const row = await db('assignments').where({ id: assignment_id, is_active: 1 }).first(); 
  // return row or undefined หมายความว่า assignment_id ที่ส่งมา ต้องเป็นเลข และต้องมีในตาราง assignments และ is_active=1  เพื่อให้ assignment นั้นเปิดอยู่
  return !!row;
}

// =====================================================================
// Evaluatee: CREATE (อัปโหลดหลักฐานของตัวเอง) (เปลี่ยน period_id → assignment_id)
// Body: { assignment_id, indicator_id, evidence_type_id } + file
// =====================================================================
exports.uploadEvidence = async (req, res, next) => {
  console.log('uploadEvidence body=', req.body);
  console.log('uploadEvidence file=', req.file);
  console.log('uploadEvidence user=', req.user);
  console.log('uploadEvidence user.id=', req.user?.id);
  console.log('uploadEvidence user.role=', req.user?.role);
  console.log('uploadEvidence user.email=', req.user?.email); 
  try {
    const evaluatee_id = Number(req.user?.id);// ต้องมี user.id จาก JWT เสมอ  return 401 ถ้าไม่มี   ถ้ามี return 400
        if (!evaluatee_id) return res.status(401).json({ success:false, message:'invalid user' });
    const { assignment_id, indicator_id, evidence_type_id } = req.body || {};

    if (!req.file) return res.status(400).json({ success:false, message:'ไม่ได้ส่ง file มาด้วย' });
    if (!assignment_id || !indicator_id || !evidence_type_id) {
      return res.status(400).json({ success:false, message:'missing assignment_id/indicator_id/evidence_type_id' });
    }

    // ตรวจสอบว่า assignment มีอยู่จริง และ evaluatee ถูก assign ใน assignment นั้น
    const assignment = await db('assignments').where({ id: Number(assignment_id), evaluatee_id }).first();
    if (!assignment) {
      return res.status(404).json({ success:false, message:'assignment not found or not assigned to you' });
    }

    // ตรวจสอบว่า assignment active
    if (!assignment.is_active) {
      return res.status(400).json({ success:false, message:'assignment is not active' });
    }

    // Note: Skipping indicator-evidence_type validation for competition (6-hour timeframe)
    // const okMap = await mapRepo.mapExists({
    //   indicator_id: Number(indicator_id),
    //   evidence_type_id: Number(evidence_type_id)
    // });
    // if (!okMap) return res.status(400).json({ success:false, message:'invalid indicator/evidence_type pair' });

    // บันทึกลงตาราง attachments
    // console.log('req.file.path=', req.file.path);
    const storage_path = relFromUploads(req.file.path);
    console.log('storage_path=', storage_path);
    const [id] = await db('attachments').insert({
      assignment_id: Number(assignment_id),
      evaluatee_id,
      indicator_id: Number(indicator_id),
      evidence_type_id: Number(evidence_type_id),
      file_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      storage_path
    });

    const created = await attRepo.findById(id);
    res.status(201).json({ success:true, data: { ...created, url: `/uploads/${created.storage_path}` }});
  } catch (e) { next(e); }
};

// =====================================================================
// Evaluatee: LIST ของตัวเอง (เปลี่ยน period_id → assignment_id)
// Query optional: assignment_id, indicator_id, evidence_type_id
// =====================================================================
exports.listMine = async (req, res, next) => {
  try {
    const evaluatee_id = Number(req.user?.id);
    const { assignment_id, indicator_id, evidence_type_id } = req.query || {};

    let q = db('attachments').where({ evaluatee_id }).orderBy('id', 'desc');
    if (assignment_id) q = q.andWhere({ assignment_id: Number(assignment_id) });
    if (indicator_id) q = q.andWhere({ indicator_id: Number(indicator_id) });
    if (evidence_type_id) q = q.andWhere({ evidence_type_id: Number(evidence_type_id) });

    const rows = await q;
    const data = rows.map(r => ({ ...r, url:`/uploads/${r.storage_path}` }));
    res.json({ success:true, data });
  } catch (e) { next(e); }
};

// =====================================================================
// Evaluatee: DELETE ของตัวเอง (ลบได้เฉพาะช่วงที่ period ยังเปิด)
// =====================================================================
exports.deleteMine = async (req, res, next) => {
  try {
    const evaluatee_id = Number(req.user?.id);
    const id = Number(req.params.id);
    const row = await attRepo.findById(id);

    if (!row || row.evaluatee_id !== evaluatee_id) {
      return res.status(404).json({ success:false, message:'not found' });
    }
    // ไม่ต้องเช็ค is_active เพราะถ้าถูก assign แล้วควรให้ลบได้

    const abs = path.join(__dirname, '..', 'uploads', row.storage_path);
    await db('attachments').where({ id }).del();
    safeUnlink(abs);

    res.json({ success:true, message:'deleted' });
  } catch (e) { next(e); }
};

// =====================================================================
// Evaluatee: UPDATE FILE ของตัวเอง  (ของเดิมของคุณ)
// =====================================================================
exports.updateFileMine = async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    if (!req.file) return res.status(400).json({ success:false, message:'no file' });

    const row = await attRepo.findById(id);
    if (!row || row.evaluatee_id !== userId) return res.status(404).json({ success:false, message:'not found' });

    // ไม่ต้องเช็ค is_active เพราะถ้าถูก assign แล้วควรให้แก้ไขได้

    const oldAbs = path.join(__dirname, '..', 'uploads', row.storage_path);
    const newRel = relFromUploads(req.file.path);

    await db('attachments').where({ id }).update({
      file_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      storage_path: newRel
    });

    safeUnlink(oldAbs);
    const updated = await attRepo.findById(id);
    res.json({ success:true, data: { ...updated, url: `/uploads/${updated.storage_path}` }});
  } catch (e) { next(e); }
};

// =====================================================================
// Evaluatee: UPDATE META ของตัวเอง (ของเดิมของคุณ)
// =====================================================================
exports.updateMetaMine = async (req, res, next) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);
    const { indicator_id, evidence_type_id } = req.body || {};

    const row = await attRepo.findById(id);
    if (!row || row.evaluatee_id !== userId) return res.status(404).json({ success:false, message:'not found' });

    // ไม่ต้องเช็ค is_active เพราะถ้าถูก assign แล้วควรให้แก้ไขได้

    const newIndicator = indicator_id ? Number(indicator_id) : row.indicator_id;
    const newEvType   = evidence_type_id ? Number(evidence_type_id) : row.evidence_type_id;

    // Note: Skipping indicator-evidence_type validation for competition (6-hour timeframe)
    // const okMap = await mapRepo.mapExists({ indicator_id: newIndicator, evidence_type_id: newEvType });
    // if (!okMap) return res.status(400).json({ success:false, message:'invalid indicator/evidence_type pair' });

    await db('attachments').where({ id }).update({
      indicator_id: newIndicator,
      evidence_type_id: newEvType
    });

    const updated = await attRepo.findById(id);
    res.json({ success:true, data: { ...updated, url: `/uploads/${updated.storage_path}` }});
  } catch (e) { next(e); }
};

// =====================================================================
// Evaluator: LIST หลักฐานของ evaluatee ที่ดูแล (เปลี่ยน period_id → assignment_id)
// Query optional: assignment_id
// =====================================================================
exports.listForEvaluator = async (req, res, next) => {
  try {
    const evaluateeId = Number(req.params.evaluateeId);
    const { assignment_id } = req.query || {};

    let q = db('attachments').where({ evaluatee_id: evaluateeId }).orderBy('id', 'desc');
    if (assignment_id) q = q.andWhere({ assignment_id: Number(assignment_id) });

    // (ถ้าต้องการตรวจสิทธิ์ evaluator ↔ evaluatee เพิ่ม เติมที่นี่)
    const rows = await q;
    const data = rows.map(r => ({ ...r, url:`/uploads/${r.storage_path}` }));
    res.json({ success:true, data });
  } catch (e) { next(e); }
};
