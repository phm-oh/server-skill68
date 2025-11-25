# Backend Handbook: Comprehensive Guide (45 Files)

คู่มือการสร้างโปรเจ็ค Backend Node.js แบบละเอียดทุกขั้นตอน เรียงลำดับตาม Dependency เพื่อให้ทำตามแล้วไม่เกิด Error

---

## Phase 1: Project Initialization & Configuration
**เป้าหมาย:** เตรียมโครงสร้างโปรเจ็คและเชื่อมต่อฐานข้อมูล

### 1.1 Init Project
สร้างโฟลเดอร์และไฟล์ `package.json`
```bash
mkdir backend
cd backend
npm init -y
```

### 1.2 Install Dependencies
```bash
npm install express mysql2 knex dotenv cors bcrypt jsonwebtoken multer morgan swagger-jsdoc swagger-ui-express
npm install -D nodemon
```

### 1.3 Create `.env`
ไฟล์เก็บค่า Config (ห้ามลืมเปลี่ยน DB_PASS ให้ตรงกับเครื่องตัวเอง)
```env
PORT=7000
DB_HOST=localhost
DB_USER=root
DB_PASS=rootpassword
DB_NAME=skills_db
JWT_SECRET=secretkey
UPLOAD_MAX_MB=10
```

### 1.4 Create `db/knex.js`
ไฟล์เชื่อมต่อ Database (ต้องมีก่อน Controller/Repo ทุกตัว)
```javascript
// db/knex.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'skills_db',
    port: Number(process.env.DB_PORT) || 3306,
  },
  pool: { min: 0, max: 10 }
});

module.exports = db;
```

### 1.5 Create `utils/authz.js`
Helper สำหรับเช็ค Role
```javascript
// utils/authz.js
exports.isAdmin = (u) => u?.role === 'admin';
exports.isEvaluator = (u) => u?.role === 'evaluator';
exports.isEvaluatee = (u) => u?.role === 'evaluatee';
```

---

## Phase 2: Middlewares & Core App Structure
**เป้าหมาย:** เตรียม Server ให้พร้อมรับ Request

### 2.1 Create `middlewares/error.js`
ตัวจัดการ Error กลาง
```javascript
// middlewares/error.js
module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message });
};
```

### 2.2 Create `middlewares/auth.js`
ตัวตรวจสอบ JWT Token (สำคัญมาก ต้องมีก่อน Route ที่ต้องการ protect)
```javascript
// middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = (...roles) => {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return res.status(401).json({ success: false, message: 'Missing token' });

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      req.user = payload;
      next();
    } catch (e) {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  };
};
```

### 2.3 Create `middlewares/upload.js`
ตัวจัดการ Upload ไฟล์
```javascript
// middlewares/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

module.exports = multer({ storage });
```

### 2.4 Create `app.js` (Initial)
โครงสร้างหลักของ App (ยังไม่มี Route)
```javascript
// app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads"));

// Placeholder for Routes (จะมาเติมทีหลัง)

app.use(require("./middlewares/error"));
module.exports = app;
```

### 2.5 Create `server.js`
จุดเริ่มต้น Server
```javascript
// server.js
const app = require('./app');
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## Phase 3: Auth Module (ระบบยืนยันตัวตน)
**ไฟล์:** `controllers/auth.controller.js`, `routes/auth.routes.js`

1.  **Controller (`controllers/auth.controller.js`)**: เขียนฟังก์ชัน `login`, `register`
2.  **Route (`routes/auth.routes.js`)**: กำหนด path `/login`, `/register`
3.  **Update `app.js`**:
    ```javascript
    app.use("/api/auth", require("./routes/auth.routes"));
    ```

---

## Phase 4: Users Module (จัดการผู้ใช้)
**ไฟล์:** `controllers/users.controller.js`, `routes/users.routes.js`
*(Note: โมดูลนี้ต่อ DB โดยตรง ไม่ผ่าน Repository)*

1.  **Controller (`controllers/users.controller.js`)**: เขียนฟังก์ชัน CRUD users
2.  **Route (`routes/users.routes.js`)**: กำหนด path `/`, `/me`, `/:id`
3.  **Update `app.js`**:
    ```javascript
    app.use("/api/users", require("./routes/users.routes"));
    ```

---

## Phase 5: Topics Module (หัวข้อการประเมิน)
**ไฟล์:** `repositories/topics.repository.js`, `controllers/topics.controller.js`, `routes/topics.routes.js`

1.  **Repository (`repositories/topics.repository.js`)**: เขียน Query จัดการตาราง `topics`
2.  **Controller (`controllers/topics.controller.js`)**: เรียกใช้ Repository
3.  **Route (`routes/topics.routes.js`)**: กำหนด path CRUD
4.  **Update `app.js`**:
    ```javascript
    app.use("/api/topics", require("./routes/topics.routes"));
    ```

---

## Phase 6: Evidence Types Module (ประเภทหลักฐาน)
**ไฟล์:** `repositories/evidenceTypes.repository.js`, `controllers/evidenceTypes.controller.js`, `routes/evidenceTypes.routes.js`

1.  **Repository**: จัดการตาราง `evidence_types`
2.  **Controller**: เรียกใช้ Repo
3.  **Route**: CRUD
4.  **Update `app.js`**:
    ```javascript
    app.use("/api/evidence-types", require("./routes/evidenceTypes.routes"));
    ```

---

## Phase 7: Indicators Module (ตัวชี้วัด)
**ไฟล์:** `repositories/indicators.repository.js`, `repositories/indicatorEvidence.js`, `controllers/indicators.controller.js`, `routes/indicators.routes.js`

1.  **Repo (`indicators.repository.js`)**: จัดการตาราง `indicators`
2.  **Repo (`indicatorEvidence.js`)**: จัดการตาราง `indicator_evidence` (Mapping)
3.  **Controller**: รวม Logic
4.  **Route**: CRUD
5.  **Update `app.js`**:
    ```javascript
    app.use("/api/indicators", require("./routes/indicators.routes"));
    ```

---

## Phase 8: Assignments Module (การมอบหมายงาน)
**ไฟล์:** `repositories/assignments.repository.js`, `controllers/assignments.controller.js`, `routes/assignments.routes.js`

1.  **Repo**: จัดการตาราง `assignments` (สำคัญ: ฟังก์ชัน `create`, `createBulk`, `getMine`)
2.  **Controller**: Logic ตรวจสอบวันที่, ตรวจสอบการซ้ำ
3.  **Route**: `/`, `/mine`, `/bulk`
4.  **Update `app.js`**:
    ```javascript
    app.use("/api/assignments", require("./routes/assignments.routes"));
    ```

---

## Phase 9: Results & Attachments (การประเมินและแนบไฟล์)
**ไฟล์:** `repositories/results.repository.js`, `repositories/attachments.js`, `controllers/results.controller.js`, `controllers/upload.controller.js`, `routes/results.routes.js`, `routes/upload.routes.js`, `routes/attachments.js`

1.  **Repo (`results.repository.js`)**: จัดการตาราง `results` (saveSelf, saveEvaluator)
2.  **Repo (`attachments.js`)**: จัดการตาราง `attachments`
3.  **Controller (`results.controller.js`)**: Logic การให้คะแนน
4.  **Controller (`upload.controller.js`)**: Logic การอัปโหลด (ถ้าแยก) หรือใช้ `routes/attachments.js`
5.  **Route (`routes/results.routes.js`)**: `/self`, `/evaluate`
6.  **Route (`routes/attachments.js`)**: `/attachments` (Upload file)
7.  **Update `app.js`**:
    ```javascript
    app.use("/api/results", require("./routes/results.routes"));
    app.use("/api", require("./routes/attachments")); // Note: path อาจเป็น /api เฉยๆ ตาม code เดิม
    // หรือ app.use("/api/upload", require("./routes/upload.routes"));
    ```

---

## Phase 10: Comments & Signatures (ความคิดเห็นและลายเซ็น)
**ไฟล์:** `repositories/comments.repository.js`, `controllers/comments.controller.js`, `routes/comments.routes.js`, `repositories/signatures.repository.js`, `controllers/signatures.controller.js`, `routes/signatures.routes.js`

1.  **Comments**: สร้าง Repo -> Controller -> Route -> App.use
2.  **Signatures**: สร้าง Repo -> Controller -> Route -> App.use

---

## Phase 11: Reports (รายงาน)
**ไฟล์:** `repositories/reports.repository.js`, `controllers/reports.controller.js`, `routes/reports.routes.js`

1.  **Repo**: Query ข้อมูลสรุป (Complex SQL/Knex)
2.  **Controller**: จัดรูปแบบข้อมูลส่งออก
3.  **Route**: `/summary`, `/export`
4.  **Update `app.js`**:
    ```javascript
    app.use("/api/reports", require("./routes/reports.routes"));
    ```

---

## Phase 12: Finalization
**ไฟล์:** `openapi.json`, `Dockerfile`

1.  **Swagger**: สร้าง `openapi.json` เพื่อทำ Document
2.  **Docker**: สร้าง `Dockerfile` สำหรับ Deploy

---

## Checklist การตรวจสอบ (Testing)
หลังจากทำครบทุก Phase ให้ทดสอบตามลำดับ:
1.  **Login**: ได้ Token
2.  **Get Me**: ได้ข้อมูลตัวเอง
3.  **Create Topic/Indicator**: สร้างได้
4.  **Assign**: มอบหมายงานได้
5.  **Get My Assignment**: เห็นงานตัวเอง
6.  **Submit Result**: บันทึกคะแนนได้
7.  **Upload**: อัปโหลดไฟล์ได้
8.  **Report**: ดูรายงานได้

ถ้าทำตามลำดับนี้ รับรองว่า **"ไม่มี Error Module Not Found"** แน่นอนครับ!
