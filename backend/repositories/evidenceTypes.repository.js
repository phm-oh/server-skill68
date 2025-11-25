// backend/repositories/evidenceTypes.repository.js
// Repository สำหรับจัดการชนิดหลักฐาน (evidence_types)
const db = require('../db/knex');
const TABLE = 'evidence_types';

// ดึงทั้งหมด
exports.findAll = async () => {
  return db(TABLE).select('*').orderBy('id', 'asc');
};

// ดึงรายการเดียว
exports.findById = async (id) => {
  return db(TABLE).where({ id }).first();
};

// ดึงตาม code
exports.findByCode = async (code) => {
  return db(TABLE).where({ code }).first();
};

// สร้างใหม่
exports.create = async (payload) => {
  const [id] = await db(TABLE).insert(payload);
  return exports.findById(id);
};

// แก้ไข
exports.update = async (id, payload) => {
  const data = {};
  if (payload.code !== undefined) data.code = payload.code;
  if (payload.name_th !== undefined) data.name_th = payload.name_th;
  if (payload.description !== undefined) data.description = payload.description;

  await db(TABLE).where({ id }).update(data);
  return exports.findById(id);
};

// ลบ
exports.remove = async (id) => {
  return db(TABLE).where({ id }).del();
};

// นับจำนวน indicators ที่ใช้ evidence type นี้
exports.countIndicators = async (evidenceTypeId) => {
  const result = await db('indicator_evidence')
    .where({ evidence_type_id: evidenceTypeId })
    .count('* as count')
    .first();
  return result.count;
};