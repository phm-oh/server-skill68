// backend/repositories/topics.repository.js
// Repository สำหรับจัดการหัวข้อการประเมิน (topics)
const db = require('../db/knex');
const TABLE = 'topics';

// ดึงทั้งหมด (รองรับ filter ตาม period_id)
exports.findAll = async (periodId = null) => {
  let query = db(TABLE).select(TABLE + '.*');

  // ถ้าส่ง periodId มา ให้ JOIN กับ period_topics
  if (periodId) {
    query = query
      .join('period_topics', TABLE + '.id', 'period_topics.topic_id')
      .where('period_topics.period_id', periodId);
  }

  return query.orderBy(TABLE + '.id', 'asc');
};

// ดึงรายการเดียว
exports.findById = async (id) => {
  return db(TABLE).where({ id }).first();
};

// ดึงเฉพาะที่ active
exports.findActive = async () => {
  return db(TABLE).where({ active: 1 }).orderBy('id', 'asc');
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
  if (payload.title_th !== undefined) data.title_th = payload.title_th;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.weight !== undefined) data.weight = payload.weight;
  if (payload.active !== undefined) data.active = payload.active;

  await db(TABLE).where({ id }).update(data);
  return exports.findById(id);
};

// ลบ
exports.remove = async (id) => {
  return db(TABLE).where({ id }).del();
};

// นับจำนวน indicators ในหัวข้อ (สำหรับตรวจสอบก่อนลบ)
exports.countIndicators = async (topicId) => {
  const result = await db('indicators')
    .where({ topic_id: topicId })
    .count('* as count')
    .first();
  return result.count;
};