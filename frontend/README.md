# Frontend - IoT Room Monitoring System

Frontend สำหรับระบบ IoT Room Monitoring ใช้ Vue.js 3 + Vite

## Features

- Login/Authentication
- Dashboard แสดงรายการห้อง
- Room Detail พร้อมกราฟอุณหภูมิ
- Image Upload
- User Management (Admin only)

## Tech Stack

- Vue.js 3
- Vue Router 4
- Axios
- Vite

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Build & Run with Docker

```bash
# Docker build
docker build -t iot-frontend .

# Docker run
docker run -p 80:80 iot-frontend
```

## API Integration

Frontend ใช้ relative paths (`/api/...`) เพื่อให้ทำงานกับ reverse proxy (Caddy/Nginx) ได้

## Environment

Frontend จะทำงานผ่าน reverse proxy ที่:
- `/` → Frontend (Vue.js)
- `/api/*` → Backend API
- `/uploads/*` → Uploaded images

