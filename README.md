# 🎓 ระบบประเมินบุคลากรออนไลน์

ระบบประเมินบุคลากรออนไลน์ สำหรับการแข่งขันทักษะ ปวส.

## 📦 Technology Stack

### Frontend
- **Vue 3.4** - Progressive JavaScript Framework
- **Vite 5.0** - Next Generation Frontend Tooling
- **Vuetify 3.4** - Material Design Component Framework
- **Vue Router 4.2** - Official Router
- **Pinia 2.1** - State Management
- **Axios 1.6** - HTTP Client

### Backend
- **Node.js + Express** - REST API
- **MySQL 8.0** - Database
- **Knex.js** - Query Builder
- **JWT** - Authentication
- **Bcrypt** - Password Hashing

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16
- Docker & Docker Compose
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
cd skill_ch_68
```

### 2. Start Database (MySQL + phpMyAdmin)

```bash
docker compose -f docker-compose_mysql.yml up -d --build
```

**Services:**
- MySQL: `localhost:3306`
- phpMyAdmin: `http://localhost:8080`
  - Username: `root`
  - Password: `rootpassword`

Database จะถูกสร้างและ import schema.sql อัตโนมัติ

### 3. Setup & Start Backend

```bash
cd backend

# Install dependencies
npm install

# Copy .env.example to .env (already configured)
cp .env.example .env

# Start development server
npm run dev
```

Backend จะรันที่: `http://localhost:7000`

**API Documentation:** `http://localhost:7000/docs`

### 4. Setup & Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy .env.example to .env (already configured)
cp .env.example .env

# Start development server
npm run dev
```

Frontend จะรันที่: `http://localhost:5173`

## 🔐 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@email.com | 12345678 |
| Evaluator | evaluator1@email.com | 12345678 |
| Evaluatee | teacher1@email.com | 12345678 |

## 📁 Project Structure

```
skill_ch_68/
├── backend/                 # Backend API (Node.js + Express)
│   ├── controllers/        # Route controllers
│   ├── routes/             # API routes
│   ├── repositories/       # Database queries
│   ├── middlewares/        # Auth, error handling
│   ├── db/                 # Database config (Knex)
│   ├── uploads/            # Uploaded files
│   ├── .env                # Environment variables
│   └── server.js           # Entry point
│
├── frontend/               # Frontend (Vue 3 + Vuetify 3)
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   │   ├── base/      # Base components (Card, Table, Dialog, etc.)
│   │   │   └── common/    # Common components (Upload, Score, etc.)
│   │   ├── views/         # Pages
│   │   │   ├── hr/        # Admin pages (7 pages)
│   │   │   ├── evaluatee/ # Evaluatee pages (4 pages)
│   │   │   └── committee/ # Evaluator pages (4 pages)
│   │   ├── router/        # Vue Router config
│   │   ├── stores/        # Pinia stores
│   │   ├── services/      # API services
│   │   └── utils/         # Helper functions
│   └── .env               # Environment variables
│
├── docker-compose_mysql.yml # Docker Compose for MySQL + phpMyAdmin
├── schema.sql              # Database schema
└── README.md               # This file
```

## 🔧 Configuration

### Backend Configuration (backend/.env)

```env
# Server
PORT=7000
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

# Database (use localhost when DB runs in Docker with port mapping)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=skills_db

# Security
JWT_SECRET=testing123
JWT_EXPIRES=2h
```

### Frontend Configuration (frontend/.env)

```env
VITE_API_URL=http://localhost:7000/api
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user

### Users
- `GET /api/users` - List all users
- `GET /api/users/me` - Get current user
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (admin)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Periods
- `GET /api/periods` - List periods
- `GET /api/periods/active` - Get active periods
- `GET /api/periods/:id` - Get period by ID
- `POST /api/periods` - Create period
- `PUT /api/periods/:id` - Update period
- `DELETE /api/periods/:id` - Delete period

### Topics & Indicators
- `GET /api/topics` - List topics
- `GET /api/topics/:id` - Get topic by ID
- `GET /api/indicators/topic/:topicId` - Get indicators by topic
- `POST /api/topics` - Create topic
- `POST /api/indicators` - Create indicator

### Assignments
- `GET /api/assignments` - List assignments
- `GET /api/assignments/mine` - Get my assignments
- `POST /api/assignments` - Create assignment
- `POST /api/assignments/bulk` - Bulk create assignments
- `DELETE /api/assignments/:id` - Delete assignment

### Evaluation Results
- `GET /api/results/me/:periodId` - Get my results
- `POST /api/results/self` - Save self evaluation
- `POST /api/results/self/bulk` - Bulk save evaluations
- `POST /api/results/evaluate` - Evaluator scoring
- `GET /api/results/summary/:evaluateeId/:periodId` - Get summary

### File Upload
- `POST /api/upload/evidence` - Upload evidence file
- `GET /api/upload/mine` - Get my uploads
- `DELETE /api/upload/:id` - Delete upload

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev  # Start with nodemon (auto-reload)
```

### Frontend Development

```bash
cd frontend
npm run dev  # Start Vite dev server (HMR enabled)
```

### Database Management

**Access phpMyAdmin:**
```
http://localhost:8080
Username: root
Password: rootpassword
```

**Stop Database:**
```bash
docker compose -f docker-compose_mysql.yml down
```

**Restart Database (with data preserved):**
```bash
docker compose -f docker-compose_mysql.yml restart
```

**Reset Database (delete all data):**
```bash
docker compose -f docker-compose_mysql.yml down -v
docker compose -f docker-compose_mysql.yml up -d --build
```

## 🏗️ Build for Production

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm run preview  # Preview production build
```

## 🐛 Troubleshooting

### Backend ไม่สามารถเชื่อมต่อ Database

**Error:** `getaddrinfo ENOTFOUND db`

**Solution:**
1. ตรวจสอบว่า Docker MySQL container รันอยู่:
   ```bash
   docker ps
   ```
2. ตรวจสอบ `backend/.env` ว่าเป็น `DB_HOST=localhost` (ไม่ใช่ `db`)
3. Restart Backend server

### Frontend ไม่สามารถเชื่อมต่อ Backend

**Error:** `Network Error` หรือ `CORS Error`

**Solution:**
1. ตรวจสอบ Backend รันที่ `http://localhost:7000`
2. ตรวจสอบ `frontend/.env` ว่าเป็น `VITE_API_URL=http://localhost:7000/api`
3. ตรวจสอบ `backend/.env` ว่า CORS_ORIGIN มี `http://localhost:5173`
4. Restart Backend

### Database Connection Refused

**Error:** `ECONNREFUSED`

**Solution:**
```bash
# Check if MySQL container is running
docker ps | grep mysql

# If not running, start it
docker compose -f docker-compose_mysql.yml up -d

# Check logs
docker compose -f docker-compose_mysql.yml logs -f db
```

### Port Already in Use

**Error:** `EADDRINUSE` (Port 7000, 5173, or 3306 already in use)

**Solution:**
```bash
# Find process using the port
lsof -i :7000   # Backend
lsof -i :5173   # Frontend
lsof -i :3306   # MySQL

# Kill the process
kill -9 <PID>
```

## 📝 Features

### 👤 Roles

1. **Admin (HR)**
   - จัดการผู้ใช้
   - จัดการรอบการประเมิน
   - จัดการหัวข้อและตัวชี้วัด
   - มอบหมายกรรมการ
   - ดูรายงานและสถิติ

2. **Evaluatee (ผู้รับการประเมิน)**
   - ประเมินตนเอง
   - อัปโหลดหลักฐาน
   - ดูรายงานผลการประเมิน

3. **Evaluator (กรรมการผู้ประเมิน)**
   - ดูรายการที่ได้รับมอบหมาย
   - ประเมินผู้รับการประเมิน
   - อนุมัติการประเมิน

### ✨ Key Features

- ✅ Authentication & Authorization (JWT)
- ✅ Role-based Access Control
- ✅ Multi-step Evaluation Process
- ✅ File Upload & Management
- ✅ Real-time Score Calculation
- ✅ Report Generation
- ✅ Responsive Design
- ✅ Form Validation
- ✅ Error Handling
- ✅ Loading States

## 📄 License

This project is for educational purposes (Skills Competition).

## 👥 Contributors

- Developer: Claude (Anthropic)
- Project Owner: skill_ch_68

---

**Last Updated:** 2025-01-XX
