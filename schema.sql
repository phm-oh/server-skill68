-- ============================================================================
-- CLEAN SCHEMA - ระบบประเมินบุคลากร (Essential Tables Only)
-- Created: 2025-11-20
-- Updated: 2025-01-XX - ลบ periods, ย้ายช่วงวันที่ไปที่ assignments
-- Purpose: เอาเฉพาะตารางที่ใช้งานจริงเท่านั้น
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE DATABASE IF NOT EXISTS skills_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE skills_db;

-- ============================================================================
-- DROP TABLES (ตารางที่ใช้จริงเท่านั้น)
-- ============================================================================

DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS indicator_evidence;
DROP TABLE IF EXISTS evidence_types;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS indicators;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- 1. ตาราง users
-- ============================================================================

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name_th VARCHAR(255) NOT NULL,
  role ENUM('admin','evaluator','evaluatee') NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 2. ตาราง topics (ลบ periods แล้ว)
-- ============================================================================

CREATE TABLE topics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  title_th VARCHAR(255) NOT NULL,
  description TEXT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 3. ตาราง indicators (ลบ period_topics แล้ว)
-- ============================================================================

CREATE TABLE indicators (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('score_1_4','yes_no','file_url') NOT NULL DEFAULT 'score_1_4',
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  min_score TINYINT NOT NULL DEFAULT 1,
  max_score TINYINT NOT NULL DEFAULT 4,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_ind_topic (topic_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. ตาราง evidence_types
-- ============================================================================

CREATE TABLE evidence_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 5. ตาราง indicator_evidence
-- ============================================================================

CREATE TABLE indicator_evidence (
  indicator_id BIGINT UNSIGNED NOT NULL,
  evidence_type_id INT NOT NULL,
  PRIMARY KEY (indicator_id, evidence_type_id),
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 6. ตาราง assignments (ย้ายช่วงวันที่และสถานะเปิด/ปิดมาไว้ที่นี่)
-- ============================================================================

CREATE TABLE assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  evaluator_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_assign_evaluator (evaluator_id, is_active),
  KEY idx_assign_evaluatee (evaluatee_id, is_active),
  KEY idx_assign_dates (start_date, end_date),
  UNIQUE KEY uk_assign (evaluator_id, evaluatee_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 7. ตาราง results (เปลี่ยน period_id → assignment_id)
-- ============================================================================

CREATE TABLE results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  indicator_id BIGINT UNSIGNED NOT NULL,

  -- คะแนนประเมินตนเอง
  self_score DECIMAL(5,2) NULL,
  self_note TEXT NULL,
  self_submitted_at TIMESTAMP NULL,

  -- คะแนนจากกรรมการ
  evaluator_score DECIMAL(5,2) NULL,
  evaluator_id BIGINT UNSIGNED NULL,
  evaluator_note TEXT NULL,
  evaluated_at TIMESTAMP NULL,

  -- สถานะ
  status ENUM('draft','submitted','evaluated','approved') NOT NULL DEFAULT 'draft',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_results_assignment (assignment_id, evaluatee_id),
  KEY idx_results_indicator (indicator_id),
  KEY idx_results_status (status),
  UNIQUE KEY uk_results (assignment_id, evaluatee_id, indicator_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 8. ตาราง attachments (เปลี่ยน period_id → assignment_id)
-- ============================================================================

CREATE TABLE attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  indicator_id BIGINT UNSIGNED NOT NULL,
  evidence_type_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_attach_assignment (assignment_id, evaluatee_id),
  KEY idx_attach_indicator (indicator_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 9. ตาราง signatures (เปลี่ยน period_id → assignment_id)
-- ============================================================================

CREATE TABLE signatures (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  evaluator_id BIGINT UNSIGNED NOT NULL,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_sig_assignment (assignment_id, evaluatee_id),
  UNIQUE KEY uk_sig (assignment_id, evaluatee_id, evaluator_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 10. ตาราง comments (เปลี่ยน period_id → assignment_id)
-- ============================================================================

CREATE TABLE comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT UNSIGNED NOT NULL,
  evaluatee_id BIGINT UNSIGNED NOT NULL,
  evaluator_id BIGINT UNSIGNED NOT NULL,
  comment_text TEXT NOT NULL,
  comment_type ENUM('general','strength','improvement') NOT NULL DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evaluatee_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_comment_assignment (assignment_id, evaluatee_id),
  KEY idx_comment_evaluator (evaluator_id, assignment_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Users (password: 12345678)
INSERT INTO users (email, password_hash, name_th, role, status) VALUES
('admin@email.com', '$2b$10$4fHfDDhk3e05PFx57MPVLOfwELB9KXnpwm7/CBhN5NtkIKb9N8loq', 'Admin', 'admin', 'active'),
('evaluator1@email.com', '$2b$10$4fHfDDhk3e05PFx57MPVLOfwELB9KXnpwm7/CBhN5NtkIKb9N8loq', 'Evaluator 1', 'evaluator', 'active'),
('teacher1@email.com', '$2b$10$4fHfDDhk3e05PFx57MPVLOfwELB9KXnpwm7/CBhN5NtkIKb9N8loq', 'Teacher 1', 'evaluatee', 'active');

-- Topics (ลบ periods และ period_topics แล้ว)
INSERT INTO topics (code, title_th, description, weight, active) VALUES
('T01','ด้านการจัดการเรียนการสอน','ประเมินการจัดการเรียนการสอนและพัฒนาหลักสูตร',50.00,1),
('T02','ด้านการพัฒนาตนเอง','ประเมินการพัฒนาตนเองและเพิ่มพูนความรู้',50.00,1);

-- Indicators
INSERT INTO indicators (topic_id, code, name_th, description, type, weight, min_score, max_score, active) VALUES
(1,'IND-T01-01','จัดทำแผนการสอนครบถ้วน','มีแผนการสอนที่สมบูรณ์ ครอบคลุมเนื้อหาตามหลักสูตร','score_1_4',5.00,1,4,1),
(1,'IND-T01-02','ใช้สื่อการสอนที่หลากหลาย','มีการใช้สื่อการสอนที่เหมาะสมและทันสมัย','score_1_4',5.00,1,4,1),
(2,'IND-T02-01','อบรมพัฒนาตนเอง','เข้าร่วมอบรมพัฒนาตนเองไม่น้อยกว่า 20 ชั่วโมง/ปี','score_1_4',5.00,1,4,1),
(2,'IND-T02-02','ศึกษาต่อระดับสูงขึ้น','มีการศึกษาต่อหรือพัฒนาวุฒิการศึกษา','yes_no',5.00,0,1,1);

-- Evidence Types
INSERT INTO evidence_types (code, name_th, description) VALUES
('EV01','แผนการสอน','ไฟล์เอกสารแผนการสอน (PDF)'),
('EV02','ภาพถ่ายกิจกรรม','ภาพถ่ายการจัดกิจกรรม (JPG/PNG)'),
('EV03','เอกสารรับรอง','เอกสารรับรองจากหน่วยงาน (PDF)'),
('EV04','ใบประกาศนียบัตร','ใบประกาศนียบัตรการอบรม (PDF)'),
('EV05','URL/Link','ลิงก์เว็บไซต์หรือเอกสารออนไลน์');

-- Indicator-Evidence Mapping
INSERT INTO indicator_evidence (indicator_id, evidence_type_id) VALUES
(1,1), (2,2), (2,5), (3,4), (4,3);

-- Assignments (เพิ่ม start_date, end_date, is_active, ลบ period_id)
INSERT INTO assignments (evaluator_id, evaluatee_id, start_date, end_date, is_active) VALUES
(2, 3, '2025-01-01', '2025-06-30', 1);

-- ============================================================================
-- สรุปโครงสร้าง (10 ตาราง) - ลบ periods และ period_topics แล้ว
-- ============================================================================
-- 1. users - ผู้ใช้งาน
-- 2. topics - หัวข้อการประเมิน
-- 3. indicators - ตัวชี้วัด
-- 4. evidence_types - ประเภทหลักฐาน
-- 5. indicator_evidence - เชื่อม indicator-evidence
-- 6. assignments - มอบหมายงาน (มี start_date, end_date, is_active)
-- 7. results - ผลการประเมิน (ใช้ assignment_id แทน period_id)
-- 8. attachments - ไฟล์แนบ (ใช้ assignment_id แทน period_id)
-- 9. signatures - ลายเซ็น (ใช้ assignment_id แทน period_id)
-- 10. comments - ความคิดเห็นกรรมการ (ใช้ assignment_id แทน period_id)
-- ============================================================================

SELECT 'Clean schema created successfully!' AS status;
