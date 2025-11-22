# 🚀 DevOps Competition Handbook - The Master Guide

**"คัมภีร์สูตรสำเร็จ DevOps - ทดสอบจริงจากสนามแข่ง ผ่าน 100%"**

คู่มือฉบับนี้ได้รับการตรวจสอบ ปรับปรุง และทดสอบซ้ำหลายครั้งโดยครูผู้สอนและทีมงาน เพื่อให้มั่นใจว่าเป็นขั้นตอนที่ถูกต้อง แม่นยำ และใช้งานได้จริงในสนามแข่งขัน 

---

## 📋 สิ่งที่ต้องเตรียม (Infrastructure)

- **VM1 (GitLab Server):** IP `192.168.100.130` (RAM 4GB+, CPU 2 Core)
- **VM2 (Production Server):** IP `192.168.100.131` (RAM 2GB+)
- **Client PC:** Windows/Linux ที่มี Git Bash และ VS Code (IP `192.168.100.99`)

---

## 🖥️ PART 1: VM1 Setup (GitLab + CI/CD + Monitoring)

**เป้าหมาย:** ติดตั้ง GitLab, Runner และระบบ Monitoring (Grafana)

### Step 1: ติดตั้ง Docker & GitLab
(ใช้ไฟล์ `docker-compose.yml` มาตรฐานของ GitLab)
*สำคัญ:* ตรวจสอบ `external_url` ใน Config ต้องเป็น `http://192.168.100.130`

### Step 2: Register Runner (จุดที่ต้องแม่น)
1. เข้าไปที่ container:
```bash
docker exec -it gitlab-runner gitlab-runner register
```
2. **URL:** `http://192.168.100.130`
3. **Token:** (Copy จาก GitLab > Settings > CI/CD > Runners)
4. **Name:** `docker-runner`
5. **Executor:** `docker` (**ต้องพิมพ์ docker เท่านั้น**)
6. **Image:** `docker:24`

### Step 3: ปลดล็อค Runner (Privileged Mode)
*ถ้าไม่ทำขั้นตอนนี้ จะ Build Docker Image ไม่ผ่าน (Error: docker command not found / connection refused)*

1. แก้ไขไฟล์ Config:
```bash
   docker exec -it gitlab-runner vi /etc/gitlab-runner/config.toml
   ```
2. ค้นหา `[runners.docker]` แล้วแก้ 2 บรรทัดนี้:
```toml
   privileged = true                            # เปลี่ยน false เป็น true
   volumes = ["/var/run/docker.sock:/var/run/docker.sock", "/cache"] # เพิ่ม docker.sock
   ```
3. Restart Runner:
```bash
docker restart gitlab-runner
```

### Step 4: Setup Grafana (Monitoring) - ถ้ามีในโจทย์
ถ้าต้องใช้ Grafana ให้รัน Container เพิ่มใน VM1:
```bash
docker run -d --name=grafana -p 3000:3000 grafana/grafana
```
*URL:* `http://192.168.100.130:3000` (User: admin / Pass: admin)

---

## 🖥️ PART 2: VM2 Setup (Production + IoT)

**เป้าหมาย:** เตรียมเครื่องปลายทางให้พร้อมรับการ Deploy และรันระบบ IoT (MQTT, Node-RED)

### Step 1: ติดตั้ง Docker & Registry Config
เพื่อให้ VM2 ดึง Image จาก VM1 (Insecure Registry) ได้

1. สร้าง/แก้ไข `/etc/docker/daemon.json`:
```bash
   sudo tee /etc/docker/daemon.json <<EOF
   {
     "insecure-registries": ["192.168.100.130:5050"]
   }
   EOF
   ```
2. Restart Docker:
   ```bash
sudo systemctl restart docker
```

### Step 2: สร้าง SSH Key (สำหรับ Auto Deploy)
1. **บน VM2** สร้าง Key:
```bash
   ssh-keygen -t rsa -b 4096 -C "gitlab-ci" -f ~/.ssh/id_rsa -N ""
```
2. อนุญาตให้ตัวเองเข้าได้ (Authorize Public Key):
```bash
   cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
3. **Copy Private Key** เก็บไว้:
   ```bash
   cat ~/.ssh/id_rsa
   # ก๊อปปี้ตั้งแต่ -----BEGIN... ถึง ...END-----
   ```

### Step 3: เตรียม Config สำหรับ IoT Services
สร้างโฟลเดอร์และไฟล์ Config บน VM2 เพื่อให้ MQTT และ Node-RED ทำงานได้

1. **สร้างโฟลเดอร์:**
```bash
   mkdir -p ~/vm2-production/mosquitto/config
   mkdir -p ~/vm2-production/nodered
   ```

2. **สร้างไฟล์ `mosquitto/config/mosquitto.conf`:**
   ```bash
   cat > ~/vm2-production/mosquitto/config/mosquitto.conf <<EOF
   persistence true
   persistence_location /mosquitto/data/
   log_dest file /mosquitto/log/mosquitto.log
listener 1883
   allow_anonymous true
listener 9001
protocol websockets
EOF
```

3. **สร้างไฟล์ `nodered/flows.json` (Logic เชื่อม MQTT -> Backend):**
   *(ป้องกัน Error: mount directory to file)*
```bash
   # สร้างไฟล์ flows.json พร้อมกำหนดสิทธิ์ให้ user 1000 (Node-RED)
   echo "[]" | sudo tee ~/vm2-production/nodered/flows.json
   sudo chown 1000:1000 ~/vm2-production/nodered/flows.json
   sudo chmod 664 ~/vm2-production/nodered/flows.json
   ```

4. **แก้ Permission โฟลเดอร์ Project (สำคัญสำหรับ Auto Deploy via SCP):**
   เพื่อให้ GitLab (user: dev) สามารถส่งไฟล์ docker-compose.yml มาวางได้
   ```bash
   # เปลี่ยนเจ้าของโฟลเดอร์เป็น user ที่เราใช้ login (เช่น dev)
   sudo chown -R $USER:$USER ~/vm2-production
```

---

## 📦 PART 3: The Code (Source Code ที่ผ่านการทดสอบแล้ว)

โครงสร้างไฟล์ใน Project (`devops-project`):

### 1. Backend
**Folder:** `backend/`
*(ใช้ package.json และ server.js ตามตัวอย่าง)*

**`backend/Dockerfile`** (Fixed Permissions):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .

FROM node:18-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app .
ENV NODE_ENV=production PORT=3000
# สร้าง uploads folder และแก้ owner ให้เขียนได้
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
```

### 2. Frontend
**Folder:** `frontend/`

**`frontend/Dockerfile`** (Fixed Nginx):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
# ต้อง Copy Config ไปทับ Default
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**`frontend/nginx.conf`** (Correct Structure):
```nginx
events { worker_connections 1024; }
http {
    include mime.types;
    default_type application/octet-stream;
    server {
        listen 80;
        server_name localhost;
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 3. Pipeline Config
**File:** `.gitlab-ci.yml` (Auto Deploy via SSH & SCP)

```yaml
variables:
  DOCKER_DRIVER: overlay2
  REGISTRY_URL: "192.168.100.130:5050"
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
      command: ["--insecure-registry=192.168.100.130:5050"]
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - cd backend
    - docker build -t $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker tag $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA $BACKEND_IMAGE:latest
    - docker push $BACKEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $BACKEND_IMAGE:latest
  only:
    refs:
      - main
    changes:
      - backend/**/*

build-frontend:
  stage: build
  image: docker:24
  services:
    - name: docker:24-dind
      command: ["--insecure-registry=192.168.100.130:5050"]
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - cd frontend
    - docker build -t $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker tag $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA $FRONTEND_IMAGE:latest
    - docker push $FRONTEND_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker push $FRONTEND_IMAGE:latest
  only:
    refs:
      - main
    changes:
      - frontend/**/*

deploy-production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - ssh-keyscan 192.168.100.131 >> ~/.ssh/known_hosts
    - chmod 644 ~/.ssh/known_hosts
  script:
    - echo "Deploying to Production..."
    # ส่งไฟล์ docker-compose.prod.yml ไปทับ docker-compose.yml ที่ VM2
    - scp -o StrictHostKeyChecking=no docker-compose.prod.yml dev@192.168.100.131:~/vm2-production/docker-compose.yml
    # สั่ง Deploy
    - ssh -o StrictHostKeyChecking=no dev@192.168.100.131 "cd ~/vm2-production && docker-compose pull && docker-compose down && docker-compose up -d"
  only:
    - main
```

---

## 🚀 PART 4: การ Deploy และใช้งานจริง

### Step 1: ตั้งค่า GitLab Variable
1. ไปที่ GitLab > Settings > CI/CD > Variables
2. เพิ่ม `SSH_PRIVATE_KEY` (Value: Private Key จาก VM2)

### Step 2: เตรียม VM2 ครั้งแรก
1. SSH เข้า VM2
2. Login Registry: `docker login 192.168.100.130:5050`
3. สร้างโฟลเดอร์ `~/vm2-production`
4. **ไม่ต้องสร้างไฟล์ docker-compose.yml เอง!** (Pipeline จะส่งมาให้)
   *แต่ต้องมั่นใจว่าโฟลเดอร์ `~/vm2-production` มี owner เป็น user ปัจจุบัน*

### Step 3: Push Code & Enjoy
1. Push code ขึ้น GitLab: `git push origin main`
2. รอ Pipeline เขียวครบทุกขั้นตอน
3. เข้าเว็บ: `http://192.168.100.131`

### Step 4: ตรวจสอบ IoT Integration (MQTT & Node-RED)
1. เข้า Node-RED: `http://192.168.100.131:1880`
2. ตรวจสอบว่า MQTT Node เชื่อมต่อได้ (สีเขียว Connected)
3. ทดสอบยิงข้อมูลเข้า MQTT (บน VM2):
```bash
   docker exec -it mqtt mosquitto_pub -t "room1/temperature" -m '{"temp": 25.5}'
   ```
4. ดูผลใน Database หรือ Frontend ว่าค่าเปลี่ยนไหม

---

## 🔧 ปัญหาที่พบบ่อย (Troubleshooting Checklist)

| อาการ | สาเหตุ | วิธีแก้ไข |
|-------|--------|-----------|
| **GitLab Runner Job Failed** | ไม่ได้เปิด Privileged | แก้ `config.toml` set `privileged = true` |
| **Deploy: `scp permission denied`** | VM2 permission ไม่ถูก | `sudo chown -R $USER:$USER ~/vm2-production` |
| **Deploy: `docker compose` not found** | VM2 ใช้ Docker เก่า | แก้ script เป็น `docker-compose` (มีขีด) |
| **Backend Crash Loop** | DB Connection ผิด | เช็ค `DB_NAME` ให้ตรงกัน (`devops_db`), ลบ volume เก่าทิ้ง (`down -v`) |
| **Node-RED Error Mount** | ไม่ได้สร้างไฟล์ `flows.json` | สร้างไฟล์เปล่าบน VM2 ก่อน (`echo "[]" > ...`) |
| **Node-RED Permission** | เขียนไฟล์ไม่ได้ | `chown 1000:1000 flows.json` |

---
*คู่มือนี้จัดทำขึ้นเพื่อให้นักเรียนใช้เป็นต้นแบบในการฝึกซ้อมและแข่งขัน โดยรวบรวมวิธีการที่ทดสอบแล้วว่าใช้งานได้จริง 100%*
