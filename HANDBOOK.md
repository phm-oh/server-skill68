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

### Step 1: SSH เข้า VM1 และเตรียมระบบ

1. **SSH เข้า VM1:**
   ```bash
   ssh user@192.168.100.130
   # หรือ
   ssh dev@192.168.100.130
   ```

2. **อัพเดทระบบ:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git nano wget
   ```

### Step 2: ติดตั้ง Docker Engine (จาก Ubuntu Repository - ไม่ใช้ HTTPS)

**วิธีนี้เร็วกว่าและง่ายกว่า** ไม่ต้องใช้ HTTPS certificate

1. **ติดตั้ง Docker จาก Ubuntu repository:**
   ```bash
   sudo apt install -y docker.io docker-compose
   ```

2. **เพิ่ม user เข้า docker group (เพื่อไม่ต้องใช้ sudo):**
   ```bash
   sudo usermod -aG docker $USER
   ```

3. **ตรวจสอบการติดตั้ง:**
   ```bash
   docker --version
   docker compose version
   ```

4. **⚠️ สำคัญ:** ต้อง **logout แล้ว login ใหม่** เพื่อให้ group ใหม่มีผล:
   ```bash
   exit
   # แล้ว SSH เข้ามาใหม่
   ssh user@192.168.100.130
   ```

5. **ทดสอบ Docker (ไม่ต้องใช้ sudo):**
   ```bash
   docker ps
   # ควรเห็นรายการ containers (ถ้ามี) หรือ list ว่างๆ
   ```

### Step 3: ตั้งค่า Docker Daemon (Insecure Registry)

เพื่อให้ Docker สามารถ pull/push images จาก GitLab Registry (HTTP) ได้

1. **สร้าง/แก้ไข `/etc/docker/daemon.json`:**
   ```bash
   sudo mkdir -p /etc/docker
   sudo tee /etc/docker/daemon.json > /dev/null <<EOF
   {
     "insecure-registries": [
       "192.168.100.130:5050",
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
   ```

2. **Restart Docker service:**
   ```bash
   sudo systemctl restart docker
   ```

3. **ตรวจสอบว่า config ถูกต้อง:**
   ```bash
   docker info | grep -A 5 "Insecure Registries"
   # ควรเห็น 192.168.100.130:5050
   ```

### Step 4: สร้าง Docker Network และ Volumes

1. **สร้าง network:**
   ```bash
   docker network create app_net 2>/dev/null || true
   ```

2. **สร้าง volumes สำหรับ GitLab:**
   ```bash
   for vol in gitlab_config gitlab_logs gitlab_data gitlab_runner_config registry_data portainer_data; do
     docker volume create $vol 2>/dev/null || true
   done
   ```

### Step 5: สร้าง docker-compose.yml สำหรับ GitLab

1. **สร้างโฟลเดอร์สำหรับ config:**
   ```bash
   mkdir -p ~/gitlab-devops
   cd ~/gitlab-devops
   ```

2. **สร้างไฟล์ `docker-compose.yml`** (ดูตัวอย่างใน `gitlab-devops/docker-compose.yml`)
   *สำคัญ:* ตรวจสอบ `external_url` ใน Config ต้องเป็น `http://192.168.100.130`

3. **เริ่ม GitLab:**
   ```bash
   docker compose up -d
   ```

4. **รอ GitLab boot (5-10 นาที):**
   ```bash
   docker compose logs -f gitlab
   # กด Ctrl+C เมื่อเห็น "gitlab Reconfigured!" หรือ "gitlab configured successfully"
   ```

5. **ดู GitLab root password:**
   ```bash
   docker exec -it gitlab grep 'Password:' /etc/gitlab/initial_root_password
   # หรือ
   docker exec -it gitlab cat /etc/gitlab/initial_root_password
   ```

### Step 6: Register Runner (จุดที่ต้องแม่น)

**⚠️ ต้องรอ GitLab พร้อมก่อน (5-10 นาที)**

1. **เข้า GitLab Web UI:**
   - เปิด browser: `http://192.168.100.130`
   - Login: `root` / password ที่ได้จาก Step 5

2. **หา Runner Token:**
   - ไปที่ **Admin Area** (ไอคอน 🔧 มุมบนขวา)
   - เลือก **CI/CD** → **Runners**
   - คลิก **New instance runner**
   - Copy **Token** (รูปแบบ: `glrt-xxxxxxxxxxxxxxxxxxxx`)
   - **⚠️ เก็บ Token นี้ไว้ ต้องใช้ตอน register**

3. **Register Runner (บน VM1):**
   ```bash
   docker exec -it gitlab-runner gitlab-runner register
   ```

4. **กรอกข้อมูลตามลำดับ:**
   - **GitLab instance URL:** `http://192.168.100.130` (Enter)
   - **Registration token:** วาง token ที่ copy มา (Enter)
   - **Description:** `docker-runner` (Enter)
   - **Tags:** (Enter - ข้าม)
   - **Executor:** `docker` (**⚠️ ต้องพิมพ์ docker เท่านั้น ไม่ใช่ docker+machine หรือ shell**)
   - **Default Docker image:** `docker:24` (Enter)

5. **ตรวจสอบว่า register สำเร็จ:**
   ```bash
   docker exec gitlab-runner gitlab-runner list
   # ควรเห็น runner ที่เพิ่ง register
   ```

6. **ตรวจสอบใน GitLab UI:**
   - กลับไปที่ GitLab → Admin → CI/CD → Runners
   - ควรเห็น runner ปรากฏ (อาจเป็นสีเหลือง "never contacted" ก่อน)

### Step 7: ปลดล็อค Runner (Privileged Mode)

**⚠️ ถ้าไม่ทำขั้นตอนนี้ จะ Build Docker Image ไม่ผ่าน!**
**Error ที่จะเจอ:** `docker command not found` หรือ `connection refused`

1. **แก้ไขไฟล์ Config:**
   ```bash
   docker exec -it gitlab-runner vi /etc/gitlab-runner/config.toml
   # หรือใช้ nano (ง่ายกว่า)
   docker exec -it gitlab-runner nano /etc/gitlab-runner/config.toml
   ```

2. **ค้นหา `[runners.docker]` แล้วแก้ 2 บรรทัดนี้:**
   ```toml
   [runners.docker]
     privileged = true                            # เปลี่ยน false เป็น true
     volumes = ["/var/run/docker.sock:/var/run/docker.sock", "/cache"] # เพิ่ม docker.sock
   ```

3. **บันทึกและออก:**
   - ถ้าใช้ `vi`: กด `Esc` แล้วพิมพ์ `:wq` แล้ว Enter
   - ถ้าใช้ `nano`: กด `Ctrl+X` แล้ว `Y` แล้ว Enter

4. **Restart Runner:**
   ```bash
   docker restart gitlab-runner
   ```

5. **ตรวจสอบ config:**
   ```bash
   docker exec gitlab-runner cat /etc/gitlab-runner/config.toml | grep -A 5 "\[runners.docker\]"
   # ต้องเห็น privileged = true
   # ต้องเห็น volumes = ["/var/run/docker.sock:/var/run/docker.sock", "/cache"]
   ```

6. **ตรวจสอบใน GitLab UI:**
   - ไปที่ GitLab → Admin → CI/CD → Runners
   - Runner ควรเป็นสีเขียว "online" หรือ "active"

### Step 8: Setup Grafana (Monitoring) - ถ้ามีในโจทย์

ถ้าต้องใช้ Grafana ให้รัน Container เพิ่มใน VM1:

```bash
docker run -d \
  --name=grafana \
  --network=app_net \
  -p 3000:3000 \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin123" \
  grafana/grafana:latest
```

**URL:** `http://192.168.100.130:3000`  
**Username:** `admin`  
**Password:** `admin123` (หรือ password ที่ตั้งไว้)

---

## 🖥️ PART 2: VM2 Setup (Production + IoT)

**เป้าหมาย:** เตรียมเครื่องปลายทางให้พร้อมรับการ Deploy และรันระบบ IoT (MQTT, Node-RED)

### Step 1: SSH เข้า VM2 และเตรียมระบบ

1. **SSH เข้า VM2:**
   ```bash
   ssh user@192.168.100.131
   # หรือ
   ssh dev@192.168.100.131
   ```

2. **อัพเดทระบบ:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git nano wget
   ```

### Step 2: ติดตั้ง Docker Engine (จาก Ubuntu Repository)

**ใช้วิธีเดียวกับ VM1 - ติดตั้งจาก Ubuntu repository (ไม่ใช้ HTTPS)**

1. **ติดตั้ง Docker:**
   ```bash
   sudo apt install -y docker.io docker-compose
   ```

2. **เพิ่ม user เข้า docker group:**
   ```bash
   sudo usermod -aG docker $USER
   ```

3. **⚠️ สำคัญ:** Logout แล้ว login ใหม่:
   ```bash
   exit
   # แล้ว SSH เข้ามาใหม่
   ssh user@192.168.100.131
   ```

4. **ทดสอบ Docker:**
   ```bash
   docker ps
   ```

### Step 3: ตั้งค่า Docker Daemon (Insecure Registry)

**เพื่อให้ VM2 ดึง Image จาก VM1 (GitLab Registry) ได้**

1. **สร้าง/แก้ไข `/etc/docker/daemon.json`:**
   ```bash
   sudo mkdir -p /etc/docker
   sudo tee /etc/docker/daemon.json > /dev/null <<EOF
   {
     "insecure-registries": [
       "192.168.100.130:5050",
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
   ```

2. **Restart Docker:**
   ```bash
   sudo systemctl restart docker
   ```

3. **ตรวจสอบ config:**
   ```bash
   docker info | grep -A 5 "Insecure Registries"
   # ต้องเห็น 192.168.100.130:5050
   ```

4. **ทดสอบ login ไป Registry:**
   ```bash
   docker login 192.168.100.130:5050
   # Username: root
   # Password: DevOps@2024! (หรือ password ที่ตั้งไว้ใน GitLab)
   ```

### Step 4: สร้าง SSH Key (สำหรับ Auto Deploy)

**สำหรับให้ GitLab Runner สามารถ SSH เข้า VM2 เพื่อ deploy ได้**

1. **บน VM2 สร้าง SSH Key:**
   ```bash
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   ssh-keygen -t rsa -b 4096 -C "gitlab-ci" -f ~/.ssh/id_rsa -N ""
   # -N "" = ไม่ต้องใส่ passphrase (เพื่อให้ auto deploy ทำงานได้)
   ```

2. **อนุญาตให้ตัวเองเข้าได้ (Authorize Public Key):**
   ```bash
   cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```

3. **Copy Private Key เก็บไว้ (ต้องใช้ใน GitLab Variables):**
   ```bash
   cat ~/.ssh/id_rsa
   ```
   
   **⚠️ สำคัญ:** ก๊อปปี้ output ทั้งหมดตั้งแต่ `-----BEGIN RSA PRIVATE KEY-----` ถึง `-----END RSA PRIVATE KEY-----` เก็บไว้
   
   **💡 Tip:** ใช้ `cat ~/.ssh/id_rsa | xclip -selection clipboard` (Linux) หรือ copy จาก terminal

4. **ทดสอบ SSH เข้าตัวเอง:**
   ```bash
   ssh localhost
   # ควรเข้าได้โดยไม่ต้องใส่ password
   # ออกด้วย: exit
   ```

### Step 5: เตรียม Config สำหรับ IoT Services
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

## 💻 PART 3: Client Setup (เครื่องนักเรียน/Developer)

**เป้าหมาย:** เตรียมเครื่อง Client ให้พร้อม push/pull code ไป GitLab

### Step 1: ติดตั้ง Git (ถ้ายังไม่มี)

**สำหรับ Windows:**
- ดาวน์โหลด Git for Windows: https://git-scm.com/download/win
- ติดตั้งและเลือก "Git Bash Here" ใน context menu

**สำหรับ Linux/Ubuntu:**
```bash
sudo apt update
sudo apt install -y git
```

**สำหรับ macOS:**
```bash
# Git มักติดตั้งมาพร้อม Xcode Command Line Tools
git --version
# ถ้ายังไม่มี: xcode-select --install
```

### Step 2: ตั้งค่า Git (ข้าม HTTPS Verification)

**⚠️ สำคัญ:** เพราะ GitLab ใช้ HTTP (ไม่ใช่ HTTPS) ต้องตั้งค่า Git ให้ไม่ตรวจสอบ SSL

1. **ตั้งค่า Git ให้ข้าม SSL verification:**
   ```bash
   git config --global http.sslVerify false
   ```

2. **ตั้งค่า Git user (แก้ไขตามชื่อจริง):**
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

3. **ตรวจสอบ config:**
   ```bash
   git config --global --list
   # ต้องเห็น http.sslVerify = false
   ```

### Step 3: เพิ่ม Hosts Entry (Optional แต่แนะนำ)

**เพื่อให้ใช้ domain name แทน IP address**

**สำหรับ Linux/macOS:**
```bash
sudo nano /etc/hosts
# หรือ
sudo vi /etc/hosts
```

**เพิ่มบรรทัดนี้:**
```
192.168.100.130 gitlab.local registry.local
192.168.100.131 prod.local
```

**สำหรับ Windows:**
1. เปิด Notepad **เป็น Administrator**
2. เปิดไฟล์: `C:\Windows\System32\drivers\etc\hosts`
3. เพิ่มบรรทัดเดียวกัน

### Step 4: Clone Project จาก GitLab

1. **เข้า GitLab Web UI:**
   - เปิด browser: `http://192.168.100.130`
   - Login ด้วย account ที่สร้างไว้

2. **สร้าง Project ใหม่ (ถ้ายังไม่มี):**
   - คลิก **New project** หรือ **Create project**
   - เลือก **Create blank project**
   - ตั้งชื่อ: `devops-project` (หรือชื่ออื่น)
   - เลือก **Visibility: Private** (หรือ Public)
   - คลิก **Create project**

3. **Clone project มาเครื่อง:**
   ```bash
   # ใช้ HTTP URL (ไม่ใช่ HTTPS)
   git clone http://192.168.100.130/root/devops-project.git
   # หรือถ้าใช้ domain name
   git clone http://gitlab.local/root/devops-project.git
   ```

4. **เข้าไปในโฟลเดอร์:**
   ```bash
   cd devops-project
   ```

### Step 5: Push Code ไป GitLab

1. **เพิ่มไฟล์ code:**
   ```bash
   # Copy code เข้ามาในโฟลเดอร์
   # เช่น copy backend/ และ frontend/ เข้ามา
   
   # ตรวจสอบไฟล์ที่มี:
   ls -la
   ```

2. **Add และ Commit:**
   ```bash
   git add .
   git commit -m "Initial commit - Backend and Frontend"
   ```

3. **Push ไป GitLab:**
   ```bash
   git push -u origin main
   # หรือถ้าใช้ branch master
   git push -u origin master
   ```

4. **⚠️ ถ้าเจอ error "fatal: could not read Username":**
   ```bash
   # ต้องใส่ username และ password
   # Username: root (หรือ username ที่ใช้ login)
   # Password: DevOps@2024! (หรือ password ที่ตั้งไว้)
   
   # หรือตั้งค่า credential helper:
   git config --global credential.helper store
   # แล้ว push อีกครั้ง (จะถาม username/password ครั้งเดียว)
   ```

5. **ตรวจสอบใน GitLab:**
   - กลับไปที่ GitLab Web UI
   - ควรเห็นไฟล์ที่ push ไปแล้ว

### Step 6: Pull Code จาก GitLab

**เมื่อมีคนอื่น push code หรือแก้ไขใน GitLab:**

```bash
# Pull code ล่าสุด
git pull origin main

# หรือถ้าต้องการดูว่ามีอะไรเปลี่ยนแปลงก่อน
git fetch origin
git log HEAD..origin/main
# แล้วค่อย pull
git pull origin main
```

---

## 🚀 PART 4: การ Deploy และใช้งานจริง

### Step 1: ตั้งค่า GitLab Variable (SSH Private Key)

1. **เข้า GitLab Web UI:**
   - ไปที่ Project → **Settings** → **CI/CD** → **Variables**
   - หรือ Admin Area → **Settings** → **CI/CD** → **Variables** (สำหรับ instance-level)

2. **เพิ่ม Variable:**
   - คลิก **Add variable**
   - **Key:** `SSH_PRIVATE_KEY`
   - **Value:** วาง Private Key ที่ copy จาก VM2 (Step 4 ใน PART 2)
   - **Type:** Variable
   - **Environment scope:** All environments
   - **Flags:** ✅ Protect variable (ถ้าต้องการ)
   - **Flags:** ✅ Mask variable (แนะนำ - จะไม่แสดงใน logs)
   - คลิก **Add variable**

3. **ตรวจสอบ:**
   - ควรเห็น `SSH_PRIVATE_KEY` ในรายการ variables

### Step 2: เตรียม VM2 ครั้งแรก

1. **SSH เข้า VM2:**
   ```bash
   ssh user@192.168.100.131
   ```

2. **Login Registry:**
   ```bash
   docker login 192.168.100.130:5050
   # Username: root
   # Password: DevOps@2024!
   ```

3. **สร้างโฟลเดอร์ `~/vm2-production`:**
   ```bash
   mkdir -p ~/vm2-production
   cd ~/vm2-production
   ```

4. **⚠️ สำคัญ:** ตรวจสอบว่าโฟลเดอร์มี owner เป็น user ปัจจุบัน:
   ```bash
   ls -la ~/vm2-production
   # ต้องเห็น owner เป็น user ปัจจุบัน (เช่น dev)
   
   # ถ้าไม่ใช่ ให้แก้:
   sudo chown -R $USER:$USER ~/vm2-production
   ```

5. **ไม่ต้องสร้างไฟล์ docker-compose.yml เอง!** 
   - Pipeline จะส่งไฟล์ `docker-compose.prod.yml` มาทับ `docker-compose.yml` ให้อัตโนมัติ

### Step 3: Push Code & Trigger Pipeline

1. **บน Client machine:**
   ```bash
   cd devops-project
   
   # แก้ไข code (ถ้าต้องการ)
   # ...
   
   # Commit และ Push
   git add .
   git commit -m "Update code"
   git push origin main
   ```

2. **ตรวจสอบ Pipeline:**
   - ไปที่ GitLab → **CI/CD** → **Pipelines**
   - ควรเห็น pipeline ใหม่เริ่มทำงาน
   - รอให้ build-backend และ build-frontend ผ่าน (สีเขียว)

3. **Deploy (ถ้า pipeline มี deploy job):**
   - Pipeline จะ deploy อัตโนมัติ หรือ
   - คลิก **Play** button ที่ deploy job (ถ้าเป็น manual)

4. **ตรวจสอบผลลัพธ์:**
   - เข้าเว็บ: `http://192.168.100.131`
   - ควรเห็น Frontend ทำงาน

### Step 4: ตรวจสอบ IoT Integration (MQTT & Node-RED)

1. **เข้า Node-RED:**
   - เปิด browser: `http://192.168.100.131:1880`
   - Login: `admin` / `admin123`

2. **ตรวจสอบ MQTT Node:**
   - ดูว่า MQTT Node เชื่อมต่อได้ (สีเขียว "Connected")
   - ถ้ายังไม่เชื่อมต่อ ให้ config MQTT broker: `mqtt:1883`

3. **ทดสอบยิงข้อมูลเข้า MQTT (บน VM2):**
   ```bash
   # SSH เข้า VM2
   ssh user@192.168.100.131
   
   # Publish ข้อมูลทดสอบ
   docker exec -it mqtt mosquitto_pub -h localhost -t "room1/temperature" -m '{"temp": 25.5, "humidity": 60}'
   ```

4. **ตรวจสอบผลลัพธ์:**
   - ดูใน Node-RED ว่ามี message เข้ามาหรือไม่
   - ตรวจสอบ Database (ผ่าน phpMyAdmin: `http://192.168.100.131:8081`)
   - ตรวจสอบ Frontend (`http://192.168.100.131`) ว่าค่าอุณหภูมิอัพเดทหรือไม่

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
