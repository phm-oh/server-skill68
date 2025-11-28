# Backend - IoT Room Monitoring System

Backend API สำหรับระบบ IoT Room Monitoring ใช้ Express.js + MariaDB

**หมายเหตุ:** Backend ไม่ใช้ MQTT client โดยตรง ใช้ Node-RED เป็นตัวกลาง

## Features

- Authentication (JWT)
- Room Management
- Temperature Data Collection (รับจาก Node-RED ผ่าน HTTP)
- Image Upload
- User Management (Admin)
- HTTP API Endpoint สำหรับรับข้อมูลจาก Node-RED

## Architecture

**Backend ไม่ใช้ MQTT client โดยตรง** ใช้ Node-RED เป็นตัวกลาง:

```
ESP32 → MQTT Broker → Node-RED → HTTP POST → Backend API
```

- ESP32 publish ไป MQTT topics
- Node-RED subscribe MQTT แล้วส่ง HTTP POST มาที่ `/api/mqtt/:room`
- Backend รับ HTTP POST และบันทึกลง Database

## Environment Variables

```env
PORT=3000
DB_HOST=db
DB_PORT=3306
DB_USER=devops
DB_PASSWORD=devops123
DB_NAME=devops_db
JWT_SECRET=devops-secret-key-2024
```

**หมายเหตุ:** ไม่ต้องตั้งค่า `MQTT_BROKER` เพราะ Backend ไม่ใช้ MQTT client โดยตรง

## API Endpoints

- `GET /health` - Health check
- `POST /api/login` - Login
- `GET /api/rooms` - Get rooms (authenticated)
- `GET /api/rooms/:roomId/temperatures` - Get temperatures
- `GET /api/rooms/:roomId/temperature/latest` - Get latest temperature
- `POST /api/rooms/:roomId/images` - Upload image
- `GET /api/rooms/:roomId/images` - Get images
- `POST /api/mqtt/:room` - HTTP endpoint สำหรับรับข้อมูลจาก Node-RED (Node-RED จะส่ง HTTP POST มาที่นี่)
- `GET /api/users` - Get users (admin only)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:userId` - Update user (admin only)
- `DELETE /api/users/:userId` - Delete user (admin only)

## Build & Run

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm start

# Docker build
docker build -t iot-backend .

# Docker run
docker run -p 3000:3000 iot-backend
```

