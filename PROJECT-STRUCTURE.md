# 📁 โครงสร้างโปรเจ็กต์ - IoT Room Monitoring System

## สรุปโครงสร้าง

```
server-skill68/
├── backend/                    # ✅ Backend API (Node.js + Express)
│   ├── server.js              # Main server file
│   ├── package.json           # Dependencies
│   ├── Dockerfile             # Docker build config
│   ├── .dockerignore          # Docker ignore files
│   ├── .gitignore             # Git ignore files
│   └── README.md              # Backend documentation
│
├── frontend/                   # ✅ Frontend (Vue.js 3 + Vite)
│   ├── src/
│   │   ├── main.js            # Vue app entry point
│   │   ├── App.vue            # Root component
│   │   ├── style.css          # Global styles
│   │   └── views/
│   │       ├── Login.vue      # Login page
│   │       ├── Dashboard.vue # Dashboard (room list)
│   │       ├── RoomDetail.vue # Room detail with chart
│   │       └── UserManagement.vue # User management (admin)
│   ├── index.html             # HTML template
│   ├── package.json           # Dependencies
│   ├── vite.config.js         # Vite config
│   ├── Dockerfile             # Docker build config
│   ├── nginx.conf             # Nginx config
│   ├── .dockerignore          # Docker ignore files
│   ├── .gitignore             # Git ignore files
│   └── README.md              # Frontend documentation
│
├── .gitlab-ci.yml             # ✅ GitLab CI/CD Pipeline
├── .gitignore                  # Root gitignore
│
├── gitlab-devops/             # GitLab + CI/CD setup
│   ├── docker-compose.yml     # GitLab services
│   ├── examples/              # Example code
│   └── ...
│
├── vm2-production/            # Production server setup
│   └── ...
│
└── ESP32/                      # ESP32 code
    └── esp32-room.ino
```

## ✅ สิ่งที่ทำเสร็จแล้ว

### Backend (`backend/`)
- ✅ `server.js` - Express API server สมบูรณ์
  - Authentication (JWT)
  - Room Management
  - Temperature Data Collection
  - Image Upload
  - User Management (Admin)
  - MQTT Integration
- ✅ `package.json` - Dependencies ครบถ้วน
- ✅ `Dockerfile` - Multi-stage build พร้อม security best practices
- ✅ `.dockerignore` และ `.gitignore`
- ✅ `README.md` - Documentation

### Frontend (`frontend/`)
- ✅ `src/main.js` - Vue Router setup
- ✅ `src/App.vue` - Root component with navigation
- ✅ `src/views/Login.vue` - Login page พร้อม API integration
- ✅ `src/views/Dashboard.vue` - Dashboard แสดงรายการห้อง พร้อมข้อมูลอุณหภูมิ
- ✅ `src/views/RoomDetail.vue` - Room detail page พร้อม:
  - กราฟอุณหภูมิ (simple bar chart)
  - ตารางประวัติอุณหภูมิ
  - Image gallery และ upload
- ✅ `src/views/UserManagement.vue` - User management (admin only) พร้อม:
  - Create/Edit/Delete users
  - Modal form
- ✅ `src/style.css` - Global styles
- ✅ `package.json` - Dependencies ครบถ้วน
- ✅ `vite.config.js` - Vite configuration
- ✅ `Dockerfile` - Multi-stage build with Nginx
- ✅ `nginx.conf` - Nginx configuration
- ✅ `.dockerignore` และ `.gitignore`
- ✅ `README.md` - Documentation

### CI/CD
- ✅ `.gitlab-ci.yml` - GitLab CI/CD pipeline
  - Build backend
  - Build frontend
  - Deploy to production (manual)

## 🎯 Features ที่พร้อมใช้งาน

### Backend API Endpoints
- `GET /health` - Health check
- `POST /api/login` - Login
- `GET /api/rooms` - Get rooms (authenticated)
- `GET /api/rooms/:roomId/temperatures` - Get temperatures
- `GET /api/rooms/:roomId/temperature/latest` - Get latest temperature
- `POST /api/rooms/:roomId/images` - Upload image
- `GET /api/rooms/:roomId/images` - Get images
- `POST /api/mqtt/:room` - MQTT endpoint (for Node-RED)
- `GET /api/users` - Get users (admin only)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:userId` - Update user (admin only)
- `DELETE /api/users/:userId` - Delete user (admin only)

### Frontend Pages
- `/login` - Login page
- `/dashboard` - Dashboard แสดงรายการห้อง
- `/room/:id` - Room detail พร้อมกราฟและรูปภาพ
- `/users` - User management (admin only)

## 🚀 การใช้งาน

### Development

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Production Build

**Backend:**
```bash
cd backend
docker build -t iot-backend .
```

**Frontend:**
```bash
cd frontend
docker build -t iot-frontend .
```

### GitLab CI/CD

1. Push code ไป GitLab
2. Pipeline จะ build backend และ frontend อัตโนมัติ
3. Deploy ไป production (manual trigger)

## 📝 หมายเหตุ

- Frontend ใช้ relative paths (`/api/...`) เพื่อให้ทำงานกับ reverse proxy ได้
- Backend ใช้ environment variables สำหรับ configuration
- ทั้ง backend และ frontend พร้อมสำหรับ Docker deployment
- Code ผ่านการทดสอบและพร้อมใช้งาน

