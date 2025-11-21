# ⚡ Quick Start Guide - สำหรับวันแข่ง

คู่มือสั้นๆ สำหรับวันแข่ง - ใช้เวลาไม่เกิน 2 ชั่วโมง

## 🎯 กลยุทธ์การแข่ง

1. **ไม่ใช้ script files** - ใช้คำสั่ง `cat > file << 'EOF'` แทน
2. **Copy-paste จาก HANDBOOK.md** - มีคำสั่งครบทุกอย่าง
3. **SSH เท่านั้น** - ไม่ต้องใช้ WinSCP/FileZilla
4. **จำคำสั่งสำคัญ** - Docker, docker compose, git

## 📋 Checklist วันแข่ง

### VM1 (192.168.100.101) - GitLab + CI/CD
- [ ] SSH เข้า VM1
- [ ] ติดตั้ง Docker: `sudo apt install -y docker.io docker-compose`
- [ ] ตั้งค่า daemon.json (insecure-registry)
- [ ] สร้าง docker-compose.yml (copy จาก HANDBOOK.md)
- [ ] `docker compose up -d`
- [ ] รอ GitLab boot (5-10 นาที)
- [ ] Login GitLab: http://192.168.100.101 (root/DevOps@2024!)
- [ ] Register Runner
- [ ] ทดสอบ Registry login

### VM2 (192.168.100.102) - Production
- [ ] SSH เข้า VM2
- [ ] ติดตั้ง Docker
- [ ] ตั้งค่า daemon.json
- [ ] Login Registry
- [ ] สร้าง docker-compose.yml (copy จาก HANDBOOK.md)
- [ ] สร้าง init.sql, Caddyfile, mosquitto.conf
- [ ] `docker compose pull && docker compose up -d`

### Code
- [ ] สร้าง GitLab project
- [ ] Push Backend code
- [ ] Push Frontend code
- [ ] สร้าง .gitlab-ci.yml
- [ ] รัน Pipeline
- [ ] Deploy

## 🔑 คำสั่งที่ต้องจำ

```bash
# Docker
docker ps
docker compose up -d
docker compose logs -f
docker compose restart [service]

# GitLab
docker exec -it gitlab gitlab-rake "gitlab:password:reset[root]"
docker exec -it gitlab-runner gitlab-runner register

# Registry
docker login 192.168.100.101:5050

# Git
git add .
git commit -m "message"
git push
```

## ⚠️ ปัญหาที่พบบ่อย

1. **GitLab login ไม่ได้** → Reset password
2. **Runner ไม่ build** → ตรวจสอบ privileged = true
3. **Pull image ไม่ได้** → ตรวจสอบ insecure-registry
4. **Database error** → ตรวจสอบ health check

**ดูวิธีแก้ใน HANDBOOK.md หรือ TROUBLESHOOTING.md**

## 📚 ไฟล์สำคัญ

- **HANDBOOK.md** - คู่มือ step-by-step ครบทุกอย่าง
- **TROUBLESHOOTING.md** - แก้ปัญหาทั้งหมด
- **README.md** - ภาพรวมระบบ

## ⏱️ Timeline

- **0-30 นาที**: VM1 Setup (Docker, GitLab)
- **30-60 นาที**: รอ GitLab boot + VM2 Setup
- **60-90 นาที**: Register Runner + สร้าง Code
- **90-120 นาที**: CI/CD Pipeline + Deploy + ทดสอบ

---

**💡 Tip:** เปิด HANDBOOK.md ไว้ใน browser แล้ว copy-paste คำสั่งไปทีละส่วน

