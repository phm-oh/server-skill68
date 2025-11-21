# VM2 Production Server - คู่มือการใช้งาน

## 📋 ภาพรวม Services

| Service | Port | Description |
|---------|------|-------------|
| Caddy | 80 | Reverse Proxy (แทน Nginx) |
| Backend | 3000 (internal) | Node.js/Express API |
| Frontend | 80 (via Caddy) | Vue.js/Nuxt Application |
| MariaDB | 3306 | Database |
| phpMyAdmin | 8081 | Database Management |
| MQTT | 1883, 9001 | IoT Message Broker |
| Node-RED | 1880 | IoT Dashboard & Flow |

## 🔄 CI/CD Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ Developer                                                           │
│    │                                                                │
│    │ git push                                                       │
│    ▼                                                                │
│ ┌─────────────────┐                                                 │
│ │     GitLab      │ (VM1)                                          │
│ │   192.168.100.102                                                │
│ └────────┬────────┘                                                 │
│          │                                                          │
│          ▼                                                          │
│ ┌─────────────────┐                                                 │
│ │  GitLab Runner  │ รัน .gitlab-ci.yml                             │
│ └────────┬────────┘                                                 │
│          │                                                          │
│          ▼                                                          │
│ ┌─────────────────┐                                                 │
│ │ Build & Push    │ docker build → push to Registry                │
│ │ to Registry     │                                                 │
│ └────────┬────────┘                                                 │
│          │                                                          │
│          ▼                                                          │
│ ┌─────────────────┐                                                 │
│ │  Deploy to VM2  │ SSH หรือ docker compose pull                   │
│ │ 192.168.100.103 │                                                │
│ └─────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## 🚀 การติดตั้ง

### 1. รัน Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

### 2. Start Services (ทดสอบก่อน - ไม่รวม app)

```bash
# Start เฉพาะ infrastructure ก่อน
docker compose up -d db phpmyadmin mqtt nodered caddy
```

### 3. ตรวจสอบ Services

```bash
docker compose ps
docker compose logs -f
```

### 4. หลังจาก Push Images จาก GitLab CI/CD

```bash
# Pull และ Start ทุก services
docker compose pull
docker compose up -d
```

## 🌐 URLs

- **Main App:** http://192.168.100.103
- **API:** http://192.168.100.103/api
- **phpMyAdmin:** http://192.168.100.103:8081
- **Node-RED:** http://192.168.100.103:1880
- **MQTT Broker:** 192.168.100.103:1883

## 📁 โครงสร้างไฟล์

```
vm2-production/
├── docker-compose.yml      # Stack หลัก
├── Caddyfile               # Reverse Proxy config
├── setup.sh                # Script ติดตั้ง
├── mosquitto/
│   └── config/
│       └── mosquitto.conf  # MQTT config
└── init-db/
    └── init.sql            # Database schema
```

## ⚡ ทำไมเลือก Caddy แทน Nginx?

### Nginx Config (ยาว)
```nginx
server {
    listen 80;
    server_name _;
    
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Caddy Config (สั้นมาก)
```
:80 {
    handle /api/* {
        reverse_proxy backend:3000
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

**ข้อดี Caddy:**
- Config สั้น อ่านง่าย
- ไม่ต้องเขียน header settings เยอะ
- HTTP ทำงานได้เลยไม่ต้อง config เพิ่ม
- Reload config อัตโนมัติ

## 🔧 Troubleshooting

### Pull image ไม่ได้

```bash
# ตรวจสอบ insecure-registry
docker info | grep -A 5 "Insecure"

# Login ใหม่
docker login 192.168.100.102:5050
```

### Database connection error

```bash
# ตรวจสอบ db พร้อมหรือยัง
docker compose logs db

# รอให้ healthy ก่อน
docker compose ps
```

### MQTT ไม่ทำงาน

```bash
# ดู logs
docker compose logs mqtt

# ทดสอบ subscribe
docker exec -it mqtt mosquitto_sub -t "test/#" -v
```

## 🛠️ Commands ที่ใช้บ่อย

```bash
# ดู status
docker compose ps

# ดู logs ทั้งหมด
docker compose logs -f

# ดู logs เฉพาะ service
docker compose logs -f backend

# Restart service
docker compose restart backend

# Pull image ใหม่และ restart
docker compose pull && docker compose up -d

# เข้า shell ใน container
docker exec -it backend sh

# ดู resource usage
docker stats
```

## 📊 Database Credentials

| Field | Value |
|-------|-------|
| Host | db (internal) / 192.168.100.103 (external) |
| Port | 3306 |
| Database | devops_db |
| Root Password | root123 |
| User | devops |
| Password | devops123 |
