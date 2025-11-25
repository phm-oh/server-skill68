// backend/routes/attachments.js
// ⭐ แก้ไข: ลบ route /indicators ออก เพราะชนกับ indicators.routes.js

const express = require("express");
const router = express.Router();
const db = require("../db/knex");
const asgRepo = require("../repositories/assignments.repository");
const authz = require("../middlewares/auth");
const upload = require("../middlewares/upload");

// GET /api/assignments/active (เปลี่ยน periods/active → assignments/active)
router.get(
  "/assignments/active",
  authz("evaluatee", "evaluator", "admin"),
  async (req, res) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    let query = db("assignments")
      .select(
        "assignments.*",
        "evaluator.name_th as evaluator_name",
        "evaluatee.name_th as evaluatee_name"
      )
      .leftJoin("users as evaluator", "assignments.evaluator_id", "evaluator.id")
      .leftJoin("users as evaluatee", "assignments.evaluatee_id", "evaluatee.id")
      .where("assignments.is_active", 1)
      .orderBy("assignments.start_date", "desc");
    
    // ถ้าเป็น evaluatee ให้แสดงเฉพาะของตัวเอง
    if (userRole === "evaluatee") {
      query = query.where("assignments.evaluatee_id", userId);
    }
    // ถ้าเป็น evaluator ให้แสดงเฉพาะที่ตัวเองเป็นกรรมการ
    else if (userRole === "evaluator") {
      query = query.where("assignments.evaluator_id", userId);
    }
    
    const rows = await query;
    res.json(
      rows.map((r) => ({
        id: r.id,
        evaluator_id: r.evaluator_id,
        evaluator_name: r.evaluator_name,
        evaluatee_id: r.evaluatee_id,
        evaluatee_name: r.evaluatee_name,
        start_date: r.start_date,
        end_date: r.end_date,
        is_active: r.is_active,
      }))
    );
  }
);

//  ลบ route นี้ออก เพราะชนกับ /api/indicators ใน indicators.routes.js
// GET /api/indicators?period_id=..
// router.get(
//   "/indicators",
//   authz("evaluatee", "evaluator", "admin"),
//   async (req, res) => {
//     const { period_id } = req.query;
//     let q = db("indicators").where({ active: 1 });
//     res.json(await q.select("id", "code", "name_th", "type"));
//   }
// );

// GET /api/indicators/:id/evidence-types
router.get(
  "/indicators/:id/evidence-types",
  authz("evaluatee", "evaluator", "admin"),
  async (req, res) => {
    const id = req.params.id;
    const rows = await db("indicator_evidence as ie")
      .join("evidence_types as et", "et.id", "ie.evidence_type_id")
      .where("ie.indicator_id", id)
      .select("et.id", "et.name_th");
    
    const mapped = rows.map((r) => ({
      id: r.id,
      name_th: r.name_th,
      mime_list: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
      max_mb: 10,
    }));
    res.json(mapped);
  }
);

// POST /api/attachments (เปลี่ยน period_id → assignment_id)
router.post(
  "/attachments",
  authz("evaluatee", "evaluator"),
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        assignment_id,
        indicator_id,
        evidence_type_id,
        note,
        evaluatee_id: bodyEvaluatee,
      } = req.body;
      
      if (!assignment_id || !indicator_id || !evidence_type_id || !req.file) {
        return res.status(422).json({ message: "Missing required fields" });
      }

      // 1) assignment active
      const assignment = await db("assignments")
        .where({ id: assignment_id, is_active: 1 })
        .first();
      if (!assignment) return res.status(404).json({ message: "Assignment not active" });

      // 2) indicator exists
      const ind = await db("indicators")
        .where({ id: indicator_id, active: 1 })
        .first();
      if (!ind) return res.status(404).json({ message: "Indicator not found" });

      // 3) indicator ↔ evidence allowed
      const allowed = await db("indicator_evidence")
        .where({ indicator_id, evidence_type_id })
        .first();
      if (!allowed)
        return res
          .status(409)
          .json({ message: "Evidence type not allowed for this indicator" });

      // 4) resolve evaluatee + check rights
      const { id: userId, role } = req.user;
      let evaluatee_id;
      if (role === "evaluatee") {
        evaluatee_id = userId;
        // ตรวจสอบว่า evaluatee ถูก assign ใน assignment นี้
        if (assignment.evaluatee_id !== evaluatee_id) {
          return res
            .status(403)
            .json({ message: "You are not assigned to this assignment" });
        }
      } else if (role === "evaluator") {
        evaluatee_id = Number(bodyEvaluatee);
        if (!evaluatee_id)
          return res
            .status(422)
            .json({ message: "evaluatee_id required for evaluator" });
        // ตรวจสอบว่า evaluator ถูก assign ให้ประเมิน evaluatee นี้ใน assignment นี้
        if (assignment.evaluator_id !== userId || assignment.evaluatee_id !== evaluatee_id) {
          return res
            .status(403)
            .json({ message: "Not your evaluatee in this assignment" });
        }
      } else {
        return res.status(403).json({ message: "Invalid role" });
      }

      // 5) insert attachment
      const [id] = await db("attachments").insert({
        evaluatee_id,
        assignment_id,
        indicator_id,
        evidence_type_id,
        storage_path: req.file.filename,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        note: note || null,
      });

      const created = await db("attachments").where({ id }).first();
      res.status(201).json({
        success: true,
        data: { ...created, url: `/uploads/${created.storage_path}` },
      });
    } catch (e) {
      console.error("Upload error:", e);
      res.status(500).json({ message: e.message });
    }
  }
);

module.exports = router;