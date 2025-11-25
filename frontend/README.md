# ระบบประเมินบุคลากรออนไลน์ - Frontend

Frontend Application สำหรับระบบประเมินบุคลากรออนไลน์ พัฒนาด้วย Vue 3 + Vite + Vuetify 3

## 🚀 Technology Stack

- **Vue 3** - Progressive JavaScript Framework
- **Vite 5** - Next Generation Frontend Tooling
- **Vuetify 3** - Material Design Component Framework
- **Vue Router 4** - Official Router for Vue.js
- **Pinia** - State Management for Vue.js
- **Axios** - Promise based HTTP client
- **JWT Decode** - Decode JWT tokens

## 📁 โครงสร้างโปรเจค

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/              # รูปภาพ, ไฟล์ static
│   ├── components/
│   │   ├── base/           # Base Components (Card, Table, Dialog, Alert, etc.)
│   │   └── common/         # Common Components (EvidenceUpload, ScoreDisplay)
│   ├── views/
│   │   ├── hr/             # หน้า Admin (7 หน้า)
│   │   ├── evaluatee/      # หน้าผู้รับการประเมิน (4 หน้า)
│   │   └── committee/      # หน้ากรรมการผู้ประเมิน (4 หน้า)
│   ├── router/             # Vue Router configuration
│   ├── services/           # API Services (8 services)
│   ├── stores/             # Pinia Stores (auth, notification)
│   ├── utils/              # Helpers, Constants, Validators
│   ├── plugins/            # Vuetify plugin
│   ├── App.vue             # Root component
│   └── main.js             # Entry point
├── index.html
├── vite.config.js
└── package.json
```

## 🛠️ การติดตั้งและรัน

### Prerequisites

- Node.js >= 16
- npm >= 8
- Backend API running on `http://localhost:7000`

### ติดตั้ง Dependencies

```bash
cd frontend
npm install
```

### Configuration

ไฟล์ `.env` ได้ถูก configured ไว้แล้ว:

```env
VITE_API_URL=http://localhost:7000/api
```

หากต้องการแก้ไข URL ของ Backend API ให้แก้ที่ไฟล์ `.env`

### รัน Development Server

```bash
npm run dev
```

Application จะรันที่ `http://localhost:5173`

### Build สำหรับ Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🚀 Quick Start Guide

### 1. Start Database
```bash
# ที่ root directory
docker compose -f docker-compose_mysql.yml up -d
```

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Login
เปิด `http://localhost:5173` และ login ด้วย:

**Admin:**
- Email: `admin@ccollege.ac.th`
- Password: `password123`

**Evaluator:**
- Email: `evaluator1@ccollege.ac.th`
- Password: `password123`

**Evaluatee:**
- Email: `evaluatee1@ccollege.ac.th`
- Password: `password123`

## 👥 User Roles

ระบบมี 3 roles หลัก:

### 1. **Admin (HR)** - `/admin`
- จัดการผู้ใช้
- จัดการรอบการประเมิน
- จัดการหัวข้อและตัวชี้วัด
- มอบหมายกรรมการ
- ดูรายงานและสถิติ

### 2. **Evaluatee (ผู้รับการประเมิน)** - `/evaluatee`
- ประเมินตนเอง
- อัปโหลดหลักฐาน
- ดูรายงานผลการประเมิน

### 3. **Evaluator (กรรมการผู้ประเมิน)** - `/evaluator`
- ดูรายการที่ได้รับมอบหมาย
- ประเมินผู้รับการประเมิน
- อนุมัติการประเมิน

## 📦 Base Components

ระบบมี Base Components ที่ใช้ซ้ำได้ทั่วระบบ:

- **BaseCard** - Card wrapper พร้อม title, subtitle, icon
- **BaseTable** - Data table พร้อมการค้นหา
- **BaseDialog** - Dialog สำหรับ form/confirmation
- **BaseAlert** - Snackbar notification
- **LoadingOverlay** - Loading spinner overlay
- **StatusChip** - Chip แสดงสถานะ
- **EvidenceUpload** - Component สำหรับอัปโหลดหลักฐาน
- **ScoreDisplay** - แสดงคะแนนพร้อม progress bar

## 🔌 API Services

Services ที่เชื่อมต่อกับ Backend API:

- `authService` - Login/Logout
- `userService` - จัดการผู้ใช้
- `periodService` - จัดการรอบการประเมิน
- `topicService` - จัดการหัวข้อและตัวชี้วัด
- `evaluationService` - การประเมิน
- `assignmentService` - การมอบหมายงาน
- `uploadService` - อัปโหลดไฟล์

## 🎨 Vuetify Theme

```javascript
{
  colors: {
    primary: '#1976D2',
    secondary: '#424242',
    accent: '#82B1FF',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FFC107'
  }
}
```

## 📝 Code Style

- ใช้ **Composition API** (`<script setup>`)
- แต่ละ Component ไม่เกิน **200 บรรทัด**
- ตั้งชื่อตัวแปร/ฟังก์ชันเป็น **ภาษาอังกฤษ**
- ใช้ Vuetify Components ให้มากที่สุด
- **Error Handling** ทุกที่ด้วย try-catch
- แสดง **Loading State** ขณะรอ API

## 🌐 Browser Support

- Chrome (แนะนำ)
- Firefox
- Safari
- Edge

## 📄 License

MIT License
