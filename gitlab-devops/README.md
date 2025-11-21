# GitLab DevOps Stack - คู่มือการติดตั้งและใช้งาน

## 📋 ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VM1 (192.168.100.102)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────┐    ┌──────────────────┐                      │
│   │    GitLab CE     │    │  GitLab Runner   │                      │
│   │   Port: 80       │◄──►│   (Docker exec)  │                      │
│   │   SSH: 2222      │    └──────────────────┘                      │
│   │   Registry: 5050 │                                              │
│   └──────────────────┘                                              │
│                                                                      │
│   ┌──────────────────┐    ┌──────────────────┐                      │
│   │    Portainer     │    │   Registry UI    │                      │
│   │   Port: 9000     │    │   Port: 8080     │                      │
│   └──────────────────┘    └──────────────────┘                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 🚀 ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1: เตรียม VM

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose (ถ้ายังไม่มี)
sudo apt install docker-compose-plugin -y
```

### ขั้นตอนที่ 2: ตั้งค่า Docker Daemon (สำคัญมาก!)

```bash
# Copy daemon.json ไปยัง Docker config
sudo cp daemon.json /etc/docker/daemon.json

# แก้ไข IP ให้ตรงกับ VM จริง
sudo nano /etc/docker/daemon.json
# เปลี่ยน 192.168.100.102 เป็น IP จริงของ VM

# Restart Docker
sudo systemctl restart docker

# ตรวจสอบ
docker info | grep -A 5 "Insecure Registries"
```

### ขั้นตอนที่ 3: แก้ไข docker-compose.yml

```bash
# แก้ไข IP ทั้งหมดใน docker-compose.yml
nano docker-compose.yml

# เปลี่ยนทุกที่ที่เป็น 192.168.100.102 → IP จริงของ VM
```

### ขั้นตอนที่ 4: เริ่มระบบ

```bash
# สร้าง directory และเริ่ม services
mkdir -p ~/gitlab-devops
cd ~/gitlab-devops

# Start ทุก services
docker compose up -d

# ดู logs (GitLab ใช้เวลา 5-10 นาที)
docker compose logs -f gitlab
```

### ขั้นตอนที่ 5: รอ GitLab Boot สำเร็จ

```bash
# รอจนกว่า GitLab จะ healthy
watch docker ps

# หรือดู logs
docker logs -f gitlab 2>&1 | grep -i "ready\|error\|running"

# เมื่อเห็น "gitlab Reconfigured!" แปลว่าพร้อมแล้ว
```

---

## 🔐 Login ครั้งแรก

### GitLab Web UI

1. เปิด Browser: `http://192.168.100.102`
2. **Username:** `root`
3. **Password:** `DevOps@2024!`

> ⚠️ **หาก login ไม่ได้:** ดูหัวข้อ "แก้ปัญหา Login ไม่ได้" ด้านล่าง

### ดู Initial Password จากไฟล์

```bash
# Password จะอยู่ในไฟล์นี้ (ลบอัตโนมัติใน 24 ชม.)
docker exec gitlab cat /etc/gitlab/initial_root_password
```

### Portainer Web UI

1. เปิด Browser: `http://192.168.100.102:9000`
2. ตั้ง admin password ตอน first login

### Registry UI

1. เปิด Browser: `http://192.168.100.102:8080`
2. ดู images ที่ push ขึ้นมา

---

## 🏃 Register GitLab Runner

### หลังจาก GitLab พร้อมแล้ว

```bash
# 1. ไปที่ GitLab Web UI
#    Admin Area → CI/CD → Runners → New instance runner
#    คัดลอก registration token

# 2. Register runner ใน container
docker exec -it gitlab-runner gitlab-runner register \
  --non-interactive \
  --url "http://192.168.100.102" \
  --token "YOUR_RUNNER_TOKEN" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --docker-privileged \
  --docker-volumes "/var/run/docker.sock:/var/run/docker.sock" \
  --description "DevOps Runner"
```

### หรือ Register แบบ Interactive

```bash
docker exec -it gitlab-runner gitlab-runner register

# จะถามข้อมูลทีละขั้น:
# Enter the GitLab instance URL: http://192.168.100.102
# Enter the registration token: <token จาก GitLab>
# Enter a description: DevOps Runner
# Enter tags: docker,build,deploy
# Enter executor: docker
# Enter default Docker image: alpine:latest
```

### ตรวจสอบ Runner

```bash
# ดู runner ที่ register แล้ว
docker exec gitlab-runner gitlab-runner list

# ดู config
docker exec gitlab-runner cat /etc/gitlab-runner/config.toml
```

---

## 🐳 ใช้งาน Container Registry

### Login จาก VM หรือเครื่อง Dev

```bash
# Login (ใช้ GitLab username/password)
docker login 192.168.100.102:5050

# Username: root
# Password: DevOps@2024!
```

### Push Image

```bash
# Tag image
docker tag my-app:latest 192.168.100.102:5050/root/my-project/my-app:latest

# Push
docker push 192.168.100.102:5050/root/my-project/my-app:latest
```

### Pull Image

```bash
docker pull 192.168.100.102:5050/root/my-project/my-app:latest
```

---

## 🔧 แก้ปัญหาที่พบบ่อย

### ปัญหา 1: Login ไม่ได้ (Invalid credentials)

```bash
# วิธีที่ 1: Reset password ด้วย gitlab-rake
docker exec -it gitlab gitlab-rake "gitlab:password:reset[root]"
# รอ 30-60 วินาที แล้วใส่ password ใหม่

# วิธีที่ 2: Reset ผ่าน Rails console
docker exec -it gitlab gitlab-rails console -e production
# รอ 1-2 นาที จนได้ prompt แล้วพิมพ์:
user = User.find_by(username: 'root')
user.password = 'NewPassword123!'
user.password_confirmation = 'NewPassword123!'
user.save!
exit
```

### ปัญหา 2: เปิดหน้าเว็บไม่ได้ / 502 Bad Gateway

```bash
# ตรวจสอบ status
docker exec gitlab gitlab-ctl status

# Restart services
docker exec gitlab gitlab-ctl restart

# หรือ restart container
docker compose restart gitlab
```

### ปัญหา 3: Registry push/pull ไม่ได้ (HTTPS error)

```bash
# ตรวจสอบว่าตั้ง insecure-registry แล้ว
docker info | grep -A 5 "Insecure"

# ถ้าไม่เห็น IP ของ registry ให้:
sudo nano /etc/docker/daemon.json
# เพิ่ม IP:5050 ใน insecure-registries

sudo systemctl restart docker
```

### ปัญหา 4: GitLab ใช้ RAM เยอะ

```bash
# ดู memory usage
docker stats gitlab

# ถ้า RAM ไม่พอ ลดค่าใน GITLAB_OMNIBUS_CONFIG:
# puma['worker_processes'] = 1  # ลดจาก 2
# sidekiq['concurrency'] = 5    # ลดจาก 10
```

### ปัญหา 5: Runner ไม่เห็นใน GitLab

```bash
# ตรวจสอบ network
docker exec gitlab-runner ping gitlab

# ถ้า ping ไม่ได้ ให้ใช้ IP แทน hostname
docker exec gitlab-runner gitlab-runner register \
  --url "http://192.168.100.102" \
  ...
```

### ปัญหา 6: ต้องการ Fresh Start

```bash
# ลบทุกอย่างและเริ่มใหม่
docker compose down -v
docker volume rm gitlab_config gitlab_data gitlab_logs
docker compose up -d
```

---

## 📝 ตัวอย่าง .gitlab-ci.yml

### Pipeline พื้นฐาน

```yaml
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""  # Disable TLS for HTTP registry

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  tags:
    - docker

test:
  stage: test
  image: node:18-alpine
  script:
    - npm install
    - npm test
  tags:
    - docker

deploy:
  stage: deploy
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
  tags:
    - docker
```

---

## 🌐 URLs Summary

| Service | URL | Credentials |
|---------|-----|-------------|
| GitLab Web | http://192.168.100.102 | root / DevOps@2024! |
| GitLab SSH | ssh://git@192.168.100.102:2222 | SSH Key |
| Container Registry | 192.168.100.102:5050 | GitLab credentials |
| Portainer | http://192.168.100.102:9000 | Set on first login |
| Registry UI | http://192.168.100.102:8080 | - |

---

## ✅ Checklist ก่อนใช้งาน

- [ ] แก้ไข IP ใน docker-compose.yml
- [ ] แก้ไข IP ใน daemon.json
- [ ] Restart Docker daemon
- [ ] docker compose up -d
- [ ] รอ GitLab healthy (5-10 นาที)
- [ ] Login GitLab ได้
- [ ] Register Runner สำเร็จ
- [ ] docker login registry สำเร็จ
- [ ] Setup Portainer
