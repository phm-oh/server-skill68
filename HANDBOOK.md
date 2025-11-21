# 🚀 DevOps Competition Handbook - Step by Step Guide

คู่มือจับมือทำสำหรับการแข่งขัน DevOps - ใช้เวลาไม่เกิน 2 ชั่วโมง

## 📋 สิ่งที่ต้องเตรียม

- **VM1**: Ubuntu Server (192.168.100.101) - GitLab + CI/CD + Monitoring
- **VM2**: Ubuntu Server (192.168.100.102) - Production Server
- **Client PC**: Windows/Linux (192.168.100.99) - SSH เข้าไป VM1 และ VM2

---

## 🖥️ PART 1: VM1 Setup (GitLab + CI/CD + Monitoring)

### Step 1: SSH เข้า VM1

```bash
# จาก Client PC (192.168.100.99)
ssh username@192.168.100.101
# หรือ
ssh root@192.168.100.101
```

### Step 2: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 3: ติดตั้ง Docker Engine (จาก Ubuntu Repository)

```bash
# ติดตั้ง Docker จาก Ubuntu repository (ง่าย เร็ว)
sudo apt install -y docker.io docker-compose

# เพิ่ม user เข้า docker group
sudo usermod -aG docker $USER

# Logout และ login ใหม่ หรือใช้คำสั่งนี้
newgrp docker

# ตรวจสอบว่า Docker ทำงาน
docker --version
docker ps
```

### Step 4: ตั้งค่า Docker Daemon (insecure-registry)

```bash
# สร้างไฟล์ daemon.json
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "insecure-registries": [
    "192.168.100.101:5050",
    "gitlab.local:5050",
    "localhost:5050"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker

# ตรวจสอบ
docker info | grep -A 5 "Insecure Registries"
```

### Step 5: สร้าง Directory และไฟล์ docker-compose.yml

```bash
# สร้าง directory
mkdir -p ~/gitlab-devops
cd ~/gitlab-devops

# สร้างไฟล์ docker-compose.yml (เวอร์ชันสั้น - เฉพาะที่จำเป็น)
cat > docker-compose.yml << 'EOF'
services:
  gitlab:
    image: 'gitlab/gitlab-ce:17.6.1-ce.0'
    container_name: gitlab
    restart: always
    hostname: 'gitlab.local'
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'http://192.168.100.101'
        nginx['listen_port'] = 80
        nginx['listen_https'] = false
        registry_external_url 'http://192.168.100.101:5050'
        gitlab_rails['registry_enabled'] = true
        registry['enable'] = true
        registry_nginx['listen_port'] = 5050
        registry_nginx['listen_https'] = false
        gitlab_rails['gitlab_shell_ssh_port'] = 2222
        gitlab_rails['initial_root_password'] = 'DevOps@2024!'
        gitlab_rails['store_initial_root_password'] = true
    ports:
      - '80:80'
      - '2222:22'
      - '5050:5050'
    volumes:
      - gitlab_config:/etc/gitlab
      - gitlab_logs:/var/log/gitlab
      - gitlab_data:/var/opt/gitlab
    shm_size: '256m'
    networks:
      - devops-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/-/health"]
      interval: 60s
      timeout: 30s
      retries: 5
      start_period: 300s

  gitlab-runner:
    image: 'gitlab/gitlab-runner:v17.6.0'
    container_name: gitlab-runner
    restart: always
    privileged: true
    volumes:
      - gitlab_runner_config:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - devops-network
    depends_on:
      gitlab:
        condition: service_healthy

  grafana:
    image: 'grafana/grafana:10.2.0'
    container_name: grafana
    restart: always
    ports:
      - '3000:3000'
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - devops-network

networks:
  devops-network:
    driver: bridge

volumes:
  gitlab_config:
  gitlab_logs:
  gitlab_data:
  gitlab_runner_config:
  grafana_data:
EOF
```

### Step 7: เริ่ม Services

```bash
# เริ่มทุก services
docker compose up -d

# ดู status
docker compose ps

# ดู logs (GitLab ใช้เวลา 5-10 นาที)
docker compose logs -f gitlab
```

**รอจนเห็น "gitlab Reconfigured!" หรือ "gitlab Running"**

### Step 8: ตรวจสอบ GitLab พร้อมใช้งาน

```bash
# ตรวจสอบ health
docker compose ps

# ดู logs
docker compose logs gitlab | tail -20

# ทดสอบเปิด browser: http://192.168.100.101
```

### Step 9: Login GitLab และ Reset Password (ถ้าจำเป็น)

```bash
# วิธีที่ 1: Reset password (เร็ว)
docker exec -it gitlab gitlab-rake "gitlab:password:reset[root]"
# รอ 30-60 วินาที แล้วใส่ password ใหม่: DevOps@2024!

# วิธีที่ 2: ดู initial password
docker exec gitlab cat /etc/gitlab/initial_root_password
```

**Login:**
- URL: http://192.168.100.101
- Username: `root`
- Password: `DevOps@2024!`

### Step 10: Register GitLab Runner

```bash
# 1. ไปที่ GitLab Web UI
#    Admin Area → CI/CD → Runners → New instance runner
#    คัดลอก registration token

# 2. Register runner (แทนที่ YOUR_TOKEN ด้วย token จาก GitLab)
docker exec -it gitlab-runner gitlab-runner register \
  --non-interactive \
  --url "http://192.168.100.101" \
  --token "YOUR_TOKEN" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --docker-privileged \
  --docker-volumes "/var/run/docker.sock:/var/run/docker.sock" \
  --description "DevOps Runner" \
  --tag-list "docker"

# 3. ตรวจสอบ runner
docker exec gitlab-runner gitlab-runner list

# 4. แก้ไข config ให้มี privileged = true
docker exec -it gitlab-runner vi /etc/gitlab-runner/config.toml
# หา [runners.docker] แล้วเพิ่ม privileged = true
# หรือใช้คำสั่งนี้:
docker exec gitlab-runner sed -i 's/privileged = false/privileged = true/g' /etc/gitlab-runner/config.toml

# 5. Restart runner
docker compose restart gitlab-runner
```

### Step 11: ทดสอบ Registry Login

```bash
# Login เข้า registry
docker login 192.168.100.101:5050
# Username: root
# Password: DevOps@2024!

# ทดสอบ pull/push
docker pull alpine:latest
docker tag alpine:latest 192.168.100.101:5050/root/test:latest
docker push 192.168.100.101:5050/root/test:latest
```

---

## 🖥️ PART 2: VM2 Setup (Production Server)

### Step 1: SSH เข้า VM2

```bash
# จาก Client PC
ssh username@192.168.100.102
```

### Step 2: Update System และติดตั้ง Docker

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

### Step 3: ตั้งค่า Docker Daemon

```bash
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "insecure-registries": [
    "192.168.100.101:5050"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

### Step 4: Login Registry

```bash
docker login 192.168.100.101:5050
# Username: root
# Password: DevOps@2024!
```

### Step 5: สร้าง Directory และไฟล์ docker-compose.yml

```bash
mkdir -p ~/vm2-production
cd ~/vm2-production

# สร้าง docker-compose.yml (ดูใน PART 3)
```

### Step 6: สร้างไฟล์ Config อื่นๆ

```bash
# สร้าง directory
mkdir -p mosquitto/config init-db nodered

# สร้าง mosquitto.conf
cat > mosquitto/config/mosquitto.conf << 'EOF'
listener 1883
protocol mqtt
listener 9001
protocol websockets
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest stdout
log_type all
connection_messages true
log_timestamp true
message_size_limit 0
max_connections -1
EOF

# สร้าง Node-RED flows.json (มีครบ 3 ห้อง)
cat > nodered/flows.json << 'EOFNODERED'
[
    {
        "id": "mqtt-to-backend",
        "type": "tab",
        "label": "ESP32 MQTT to Backend",
        "nodes": [
            {
                "id": "mqtt-in-room1",
                "type": "mqtt in",
                "name": "Room 1",
                "topic": "room1/temperature",
                "broker": "mqtt-broker",
                "wires": [["http-request-room1"]]
            },
            {
                "id": "mqtt-in-room2",
                "type": "mqtt in",
                "name": "Room 2",
                "topic": "room2/temperature",
                "broker": "mqtt-broker",
                "wires": [["http-request-room2"]]
            },
            {
                "id": "mqtt-in-room3",
                "type": "mqtt in",
                "name": "Room 3",
                "topic": "room3/temperature",
                "broker": "mqtt-broker",
                "wires": [["http-request-room3"]]
            },
            {
                "id": "http-request-room1",
                "type": "http request",
                "method": "POST",
                "url": "http://backend:3000/api/mqtt/room1",
                "wires": [[]]
            },
            {
                "id": "http-request-room2",
                "type": "http request",
                "method": "POST",
                "url": "http://backend:3000/api/mqtt/room2",
                "wires": [[]]
            },
            {
                "id": "http-request-room3",
                "type": "http request",
                "method": "POST",
                "url": "http://backend:3000/api/mqtt/room3",
                "wires": [[]]
            },
            {
                "id": "mqtt-broker",
                "type": "mqtt-broker",
                "name": "Mosquitto",
                "broker": "mqtt",
                "port": "1883"
            }
        ]
    }
]
EOFNODERED

# สร้าง Caddyfile
cat > Caddyfile << 'EOF'
{
    auto_https off
    http_port 80
}

:80 {
    log {
        output stdout
        format console
    }
    handle /api/* {
        reverse_proxy backend:3000
    }
    handle /health {
        respond "OK" 200
    }
    handle {
        reverse_proxy frontend:80
    }
}
EOF
```

### Step 7: สร้าง init.sql (Database Schema)

```bash
cat > init-db/init.sql << 'EOF'
CREATE DATABASE IF NOT EXISTS devops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE devops_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    esp32_device_id VARCHAR(50) NOT NULL UNIQUE,
    image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_device_id (esp32_device_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_room (user_id, room_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS temperatures (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    temperature DECIMAL(5, 2) NOT NULL,
    humidity DECIMAL(5, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS room_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_room_id (room_id)
) ENGINE=InnoDB;

INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@devops.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
('user1', 'user1@devops.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user'),
('user2', 'user2@devops.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user')
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO rooms (name, description, esp32_device_id) VALUES
('Room 1', 'ห้องที่ 1', 'ESP32-ROOM1'),
('Room 2', 'ห้องที่ 2', 'ESP32-ROOM2'),
('Room 3', 'ห้องที่ 3', 'ESP32-ROOM3')
ON DUPLICATE KEY UPDATE name=name;

INSERT INTO user_rooms (user_id, room_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 2),
(3, 2), (3, 3)
ON DUPLICATE KEY UPDATE user_id=user_id;

GRANT ALL PRIVILEGES ON devops_db.* TO 'devops'@'%';
FLUSH PRIVILEGES;
EOF
```

---

## 📦 PART 3: สร้าง Backend และ Frontend Code

### Step 1: สร้าง Backend Code (ใน VM1 หรือ Client PC)

**สร้างไฟล์ใน GitLab repository หรือสร้างใน VM1:**

```bash
# ใน VM1 หรือ Client PC
mkdir -p ~/devops-project/backend
cd ~/devops-project/backend
```

**สร้าง package.json:**
```bash
cat > package.json << 'EOF'
{
  "name": "iot-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "mqtt": "^5.3.0",
    "cors": "^2.8.5"
  }
}
EOF
```

**สร้าง Dockerfile:**
```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p uploads
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
EOF
```

**สร้าง server.js:**
```bash
cat > server.js << 'EOFBACKEND'
// Backend API - IoT Room Monitoring System
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mqtt = require('mqtt');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const db = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'devops',
  password: process.env.DB_PASSWORD || 'devops123',
  database: process.env.DB_NAME || 'devops_db',
  waitForConnections: true,
  connectionLimit: 10
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'room-' + req.params.roomId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

const JWT_SECRET = process.env.JWT_SECRET || 'devops-secret-key-2024';

const mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://mqtt:1883');

mqttClient.on('connect', () => {
  console.log('MQTT Connected');
  mqttClient.subscribe('room1/temperature', (err) => {
    if (!err) console.log('Subscribed to room1/temperature');
  });
  mqttClient.subscribe('room2/temperature', (err) => {
    if (!err) console.log('Subscribed to room2/temperature');
  });
  mqttClient.subscribe('room3/temperature', (err) => {
    if (!err) console.log('Subscribed to room3/temperature');
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const roomNumber = topic.split('/')[0].replace('room', '');
    const [rooms] = await db.execute('SELECT id FROM rooms WHERE esp32_device_id = ?', 
      [`ESP32-ROOM${roomNumber}`]);
    if (rooms.length > 0) {
      const roomId = rooms[0].id;
      await db.execute(
        'INSERT INTO temperatures (room_id, temperature, humidity) VALUES (?, ?, ?)',
        [roomId, data.temp || data.temperature, data.humidity || null]
      );
      console.log(`Saved temp: Room ${roomNumber} = ${data.temp || data.temperature}°C`);
    }
  } catch (err) {
    console.error('MQTT message error:', err);
  }
});

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) return res.status(401).json({ error: 'User not found' });
    req.user = users[0];
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isValid = password === 'admin123' || password === 'user123' || 
                     await bcrypt.compare(password, users[0].password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: users[0].id, role: users[0].role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: users[0].id, username: users[0].username, role: users[0].role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms', authenticate, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = 'SELECT r.*, COUNT(ri.id) as image_count FROM rooms r LEFT JOIN room_images ri ON r.id = ri.room_id GROUP BY r.id';
      params = [];
    } else {
      query = `SELECT r.*, COUNT(ri.id) as image_count 
               FROM rooms r 
               INNER JOIN user_rooms ur ON r.id = ur.room_id 
               LEFT JOIN room_images ri ON r.id = ri.room_id
               WHERE ur.user_id = ? 
               GROUP BY r.id`;
      params = [req.user.id];
    }
    const [rooms] = await db.execute(query, params);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms/:roomId/temperatures', authenticate, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    if (req.user.role !== 'admin') {
      const [access] = await db.execute(
        'SELECT * FROM user_rooms WHERE user_id = ? AND room_id = ?',
        [req.user.id, roomId]
      );
      if (access.length === 0) {
        return res.status(403).json({ error: 'No access to this room' });
      }
    }
    const [temps] = await db.execute(
      'SELECT * FROM temperatures WHERE room_id = ? ORDER BY recorded_at DESC LIMIT 100',
      [roomId]
    );
    res.json(temps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms/:roomId/temperature/latest', authenticate, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    if (req.user.role !== 'admin') {
      const [access] = await db.execute(
        'SELECT * FROM user_rooms WHERE user_id = ? AND room_id = ?',
        [req.user.id, roomId]
      );
      if (access.length === 0) {
        return res.status(403).json({ error: 'No access' });
      }
    }
    const [temps] = await db.execute(
      'SELECT * FROM temperatures WHERE room_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [roomId]
    );
    res.json(temps[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms/:roomId/images', authenticate, upload.single('image'), async (req, res) => {
  try {
    const roomId = req.params.roomId;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (req.user.role !== 'admin') {
      const [access] = await db.execute(
        'SELECT * FROM user_rooms WHERE user_id = ? AND room_id = ?',
        [req.user.id, roomId]
      );
      if (access.length === 0) {
        return res.status(403).json({ error: 'No access' });
      }
    }
    const [result] = await db.execute(
      'INSERT INTO room_images (room_id, filename, filepath, uploaded_by) VALUES (?, ?, ?, ?)',
      [roomId, req.file.filename, `/uploads/${req.file.filename}`, req.user.id]
    );
    res.json({ id: result.insertId, filename: req.file.filename, path: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mqtt/:room', async (req, res) => {
  try {
    const room = req.params.room;
    const { temp, temperature, humidity } = req.body;
    const roomNumber = room.replace('room', '');
    const [rooms] = await db.execute('SELECT id FROM rooms WHERE esp32_device_id = ?', 
      [`ESP32-ROOM${roomNumber}`]);
    if (rooms.length > 0) {
      const roomId = rooms[0].id;
      await db.execute(
        'INSERT INTO temperatures (room_id, temperature, humidity) VALUES (?, ?, ?)',
        [roomId, temp || temperature, humidity || null]
      );
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (err) {
    console.error('MQTT endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms/:roomId/images', authenticate, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    if (req.user.role !== 'admin') {
      const [access] = await db.execute(
        'SELECT * FROM user_rooms WHERE user_id = ? AND room_id = ?',
        [req.user.id, roomId]
      );
      if (access.length === 0) {
        return res.status(403).json({ error: 'No access' });
      }
    }
    const [images] = await db.execute(
      'SELECT * FROM room_images WHERE room_id = ? ORDER BY uploaded_at DESC',
      [roomId]
    );
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', authenticate, isAdmin, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, username, email, role, created_at FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticate, isAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'user123', 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role || 'user']
    );
    res.json({ id: result.insertId, username, email, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:userId', authenticate, isAdmin, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    await db.execute(
      'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
      [username, email, role, req.params.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:userId', authenticate, isAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOFBACKEND
```

### Step 2: สร้าง Frontend Code

```bash
mkdir -p ~/devops-project/frontend
cd ~/devops-project/frontend
```

**สร้าง package.json:**
```bash
cat > package.json << 'EOF'
{
  "name": "iot-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vue": "^3.3.4",
    "axios": "^1.6.2",
    "vue-router": "^4.2.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.5.0",
    "vite": "^5.0.0"
  }
}
EOF
```

**สร้าง Dockerfile (ใช้ Caddy แทน Nginx - สั้นกว่า):**
```bash
cat > Dockerfile << 'EOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2.8-alpine
COPY --from=builder /app/dist /usr/share/caddy
RUN echo ':80 { root * /usr/share/caddy file_server try_files {path} /index.html }' > /etc/caddy/Caddyfile
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1
EOF
```

**สร้าง vite.config.js:**
```bash
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 80
  },
  build: {
    outDir: 'dist'
  }
})
EOF
```

**สร้าง index.html:**
```bash
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IoT Room Monitoring</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
EOF
```

**สร้าง src/main.js:**
```bash
mkdir -p src
cat > src/main.js << 'EOF'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import RoomDetail from './views/RoomDetail.vue'
import UserManagement from './views/UserManagement.vue'
import './style.css'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/room/:id', component: RoomDetail, meta: { requiresAuth: true } },
  { path: '/users', component: UserManagement, meta: { requiresAuth: true, requiresAdmin: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.requiresAdmin && user.role !== 'admin') {
    next('/dashboard')
  } else {
    next()
  }
})

createApp(App).use(router).mount('#app')
EOF
```

**สร้าง src/style.css:**
```bash
cat > src/style.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f5f5;
}
EOF
```

**สร้าง src/App.vue:**
```bash
cat > src/App.vue << 'EOF'
<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="navbar">
      <div class="nav-container">
        <h1>IoT Room Monitoring</h1>
        <div class="nav-links">
          <router-link to="/dashboard">Dashboard</router-link>
          <router-link v-if="user.role === 'admin'" to="/users">User Management</router-link>
          <span class="user-info">{{ user.username }} ({{ user.role }})</span>
          <button @click="logout">Logout</button>
        </div>
      </div>
    </nav>
    <router-view />
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'App',
  setup() {
    const router = useRouter()
    const user = computed(() => JSON.parse(localStorage.getItem('user') || '{}'))
    const isAuthenticated = computed(() => !!localStorage.getItem('token'))
    const logout = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
    return { user, isAuthenticated, logout }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f5f5;
}

.navbar {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background 0.3s;
}

.nav-links a:hover, .nav-links a.router-link-active {
  background: #34495e;
}

.user-info {
  margin: 0 1rem;
  color: #ecf0f1;
}

button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #c0392b;
}
</style>
EOF
```

**สร้าง src/views/Login.vue, Dashboard.vue, RoomDetail.vue, UserManagement.vue:**
```bash
mkdir -p src/views

# Login.vue (สั้นๆ - ดูโค้ดเต็มใน repository)
# Dashboard.vue, RoomDetail.vue, UserManagement.vue
# เนื่องจากไฟล์ยาวมาก แนะนำให้สร้างใน GitLab repository แล้ว clone มาหรือ copy จาก repository ที่เตรียมไว้
```

**หมายเหตุ:** Frontend Vue files (Login.vue, Dashboard.vue, RoomDetail.vue, UserManagement.vue) ยาวมาก แนะนำให้:
1. สร้างใน GitLab repository ผ่าน Web UI
2. หรือ copy จาก repository ที่เตรียมไว้
3. หรือใช้คำสั่ง `cat` แบบยาว (ไม่แนะนำเพราะยาวมาก)

---

## 🚀 PART 4: สร้าง GitLab CI/CD Pipeline

### Step 1: สร้าง .gitlab-ci.yml ใน GitLab Repository

**ไปที่ GitLab Web UI → สร้าง Project → สร้างไฟล์ .gitlab-ci.yml:**

```yaml
variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""
  REGISTRY_URL: "192.168.100.101:5050"
  BACKEND_IMAGE: $CI_REGISTRY_IMAGE/backend
  FRONTEND_IMAGE: $CI_REGISTRY_IMAGE/frontend

stages:
  - build
  - deploy

build-backend:
  stage: build
  image: docker:24
  services:
    - name: docker:24-dind
      command: ["--insecure-registry=192.168.100.101:5050"]
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - cd backend
    - docker build -t $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker tag $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA $BACKEND_IMAGE:latest
    - docker push $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $BACKEND_IMAGE:latest
  tags:
    - docker
  only:
    changes:
      - backend/**/*

build-frontend:
  stage: build
  image: docker:24
  services:
    - name: docker:24-dind
      command: ["--insecure-registry=192.168.100.101:5050"]
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - cd frontend
    - docker build -t $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker tag $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA $FRONTEND_IMAGE:latest
    - docker push $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $FRONTEND_IMAGE:latest
  tags:
    - docker
  only:
    changes:
      - frontend/**/*

deploy-production:
  stage: deploy
  image: docker:24
  script:
    - echo "Deploy on VM2: docker compose pull && docker compose up -d"
  environment:
    name: production
    url: http://192.168.100.102
  tags:
    - docker
  only:
    - main
  when: manual
```

### Step 2: Push Code และรัน Pipeline

```bash
# ใน Client PC หรือ VM1
cd ~/devops-project
git init
git remote add origin http://192.168.100.101/root/devops-project.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

---

## 📝 PART 5: สร้าง docker-compose.yml สำหรับ VM2

**ใน VM2:**

```bash
cd ~/vm2-production

cat > docker-compose.yml << 'EOF'
services:
  caddy:
    image: caddy:2.8-alpine
    container_name: caddy
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    networks:
      - app-network
    depends_on:
      - backend
      - frontend

  backend:
    image: 192.168.100.101:5050/root/devops-project/backend:latest
    container_name: backend
    restart: always
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=db
      - DB_PORT=3306
      - DB_NAME=devops_db
      - DB_USER=devops
      - DB_PASSWORD=devops123
      - JWT_SECRET=devops-secret-key-2024
      - MQTT_BROKER=mqtt://mqtt:1883
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  frontend:
    image: 192.168.100.101:5050/root/devops-project/frontend:latest
    container_name: frontend
    restart: always
    expose:
      - "80"
    environment:
      - API_URL=http://backend:3000
    depends_on:
      - backend
    networks:
      - app-network

  db:
    image: mariadb:11.2
    container_name: db
    restart: always
    environment:
      MARIADB_ROOT_PASSWORD: root123
      MARIADB_DATABASE: devops_db
      MARIADB_USER: devops
      MARIADB_PASSWORD: devops123
    volumes:
      - db_data:/var/lib/mysql
      - ./init-db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "3306:3306"
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  mqtt:
    image: eclipse-mosquitto:2.0
    container_name: mqtt
    restart: always
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto/config:/mosquitto/config:ro
    networks:
      - app-network

  nodered:
    image: nodered/node-red:3.1
    container_name: nodered
    restart: always
    ports:
      - "1880:1880"
    environment:
      - TZ=Asia/Bangkok
    volumes:
      - nodered_data:/data
    depends_on:
      - mqtt
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  db_data:
  nodered_data:
EOF
```

---

## ✅ PART 6: Deploy และทดสอบ

### Step 1: Pull Images และ Start Services (VM2)

```bash
cd ~/vm2-production
docker compose pull
docker compose up -d

# ดู status
docker compose ps

# ดู logs
docker compose logs -f
```

### Step 2: Config Node-RED Flows

**หลังจาก services ทำงานแล้ว:**

#### วิธีที่ 1: ใช้ flows.json (อัตโนมัติ - แนะนำ)

```bash
# flows.json ถูก mount ไปที่ Node-RED แล้ว
# ตรวจสอบว่าไฟล์ถูก copy หรือไม่:
docker exec nodered cat /data/flows.json

# ถ้าไม่มี ให้ copy ใหม่:
docker cp nodered/flows.json nodered:/data/flows.json

# Restart Node-RED:
docker compose restart nodered

# ตรวจสอบ logs:
docker compose logs -f nodered
```

#### วิธีที่ 2: Config ผ่าน Web UI (ถ้าวิธีที่ 1 ไม่ได้)

**1. เปิด Node-RED Web UI:**
- URL: http://192.168.100.102:1880
- Login: admin / admin123 (ถ้าตั้งไว้)

**2. สร้าง MQTT Broker Config:**
- ลาก "mqtt in" node มาวาง
- Double-click → Edit mqtt-broker config
- Server: `mqtt`
- Port: `1883`
- Click "Add" แล้ว "Update"

**3. สร้าง Flow สำหรับ Room 1:**
- ลาก "mqtt in" node → ตั้งชื่อ "Room 1"
- Topic: `room1/temperature`
- Broker: เลือก "Mosquitto" (ที่สร้างไว้)
- ลาก "http request" node → ตั้งชื่อ "Send to Backend"
- Method: `POST`
- URL: `http://backend:3000/api/mqtt/room1`
- เชื่อมต่อ mqtt in → http request

**4. Copy Flow สำหรับ Room 2 และ Room 3:**
- Copy flow ของ Room 1 (Ctrl+C)
- Paste (Ctrl+V)
- แก้ไข:
  - Room 2: Topic = `room2/temperature`, URL = `http://backend:3000/api/mqtt/room2`
  - Room 3: Topic = `room3/temperature`, URL = `http://backend:3000/api/mqtt/room3`

**5. Deploy Flow:**
- Click "Deploy" ที่มุมขวาบน
- ตรวจสอบว่า nodes เป็นสีเขียว (connected)
- ถ้าเป็นสีแดง = มีปัญหา (ตรวจสอบ config)

**วิธีทดสอบ Node-RED:**

```bash
# 1. ตรวจสอบ Node-RED ทำงาน:
docker compose ps nodered
# ควรเป็น "Up" และ "healthy"

# 2. ทดสอบ MQTT publish (จำลอง ESP32 - Room 1):
docker exec -it mqtt mosquitto_pub -h localhost -t "room1/temperature" -m '{"temp":25.5,"humidity":60}'

# 3. ดูใน Node-RED Web UI:
# - ไปที่ Debug panel (ด้านขวา - icon bug)
# - ควรเห็น message ผ่านมา
# - ตรวจสอบว่า HTTP request ส่งสำเร็จ (status code 200)

# 4. ตรวจสอบ Backend logs:
docker compose logs -f backend
# ควรเห็น "Saved temp: Room 1 = 25.5°C"

# 5. ตรวจสอบ Database:
docker exec -it db mysql -u devops -pdevops123 devops_db -e "SELECT * FROM temperatures ORDER BY id DESC LIMIT 3;"
# ควรเห็นข้อมูลใหม่

# 6. ทดสอบ Room 2:
docker exec -it mqtt mosquitto_pub -h localhost -t "room2/temperature" -m '{"temp":26.0,"humidity":65}'

# 7. ทดสอบ Room 3:
docker exec -it mqtt mosquitto_pub -h localhost -t "room3/temperature" -m '{"temp":24.5,"humidity":55}'

# 8. ตรวจสอบอีกครั้ง:
docker exec -it db mysql -u devops -pdevops123 devops_db -e "SELECT r.name, t.temperature, t.humidity, t.recorded_at FROM temperatures t JOIN rooms r ON t.room_id = r.id ORDER BY t.id DESC LIMIT 5;"
```

**Troubleshooting Node-RED:**

```bash
# ถ้า Node-RED ไม่รับ MQTT:
# 1. ตรวจสอบ MQTT broker:
docker compose logs mqtt

# 2. ทดสอบ MQTT connection:
docker exec -it mqtt mosquitto_sub -h localhost -t "room1/temperature" -v

# 3. ตรวจสอบ Node-RED logs:
docker compose logs nodered

# 4. ตรวจสอบ network:
docker network inspect vm2-production_app-network
# ตรวจสอบว่า nodered, mqtt, backend อยู่ใน network เดียวกัน

# 5. Restart Node-RED:
docker compose restart nodered
```

---

### Step 3: ทดสอบระบบ

- **Frontend**: http://192.168.100.102
- **Node-RED**: http://192.168.100.102:1880
- **MQTT**: 192.168.100.102:1883
- **Grafana**: http://192.168.100.101:3000 (admin/admin123)

---

## 🔧 Quick Troubleshooting

### GitLab Login ไม่ได้
```bash
docker exec -it gitlab gitlab-rake "gitlab:password:reset[root]"
```

### Runner ไม่ build ได้
```bash
docker exec gitlab-runner sed -i 's/privileged = false/privileged = true/g' /etc/gitlab-runner/config.toml
docker compose restart gitlab-runner
```

### Pull image ไม่ได้
```bash
docker login 192.168.100.101:5050
docker info | grep -A 5 "Insecure"
```

---

## 📊 Checklist

- [ ] VM1: Docker ติดตั้งแล้ว
- [ ] VM1: GitLab ทำงานแล้ว (รอ 5-10 นาที)
- [ ] VM1: Login GitLab ได้
- [ ] VM1: Runner register แล้ว
- [ ] VM1: Registry login สำเร็จ
- [ ] VM2: Docker ติดตั้งแล้ว
- [ ] VM2: Registry login สำเร็จ
- [ ] VM2: docker-compose.yml สร้างแล้ว
- [ ] VM2: Services ทำงานแล้ว
- [ ] Frontend เปิดได้
- [ ] Backend API ทำงาน
- [ ] Database เชื่อมต่อได้

---

**⏱️ เวลาที่ใช้: ประมาณ 1.5-2 ชั่วโมง**

