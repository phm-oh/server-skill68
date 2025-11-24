# Backend - IoT Room Monitoring System

Backend API สำหรับระบบ IoT Room Monitoring ใช้ Express.js + MariaDB + MQTT

## Features

- Authentication (JWT)
- Room Management
- Temperature Data Collection
- Image Upload
- User Management (Admin)
- MQTT Integration

## Environment Variables

```env
PORT=3000
DB_HOST=db
DB_PORT=3306
DB_USER=devops
DB_PASSWORD=devops123
DB_NAME=devops_db
MQTT_BROKER=mqtt://mqtt:1883
JWT_SECRET=devops-secret-key-2024
```

## API Endpoints

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

