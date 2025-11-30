# 🧪 fortest-ci-cd - Minimal Version สำหรับทดสอบ CI/CD

โฟลเดอร์นี้เป็น **minimal version** สำหรับทดสอบ CI/CD pipeline เท่านั้น

## 📁 โครงสร้าง

```
fortest-ci-cd/
├── backend/              # Backend API (สมบูรณ์ - ต้องทำงานจริง)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
│
├── frontend/             # Frontend (Minimal - placeholder components)
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── style.css
│   │   └── views/
│   │       ├── Login.vue      # Dummy login (ไม่เรียก API)
│   │       ├── Dashboard.vue  # Placeholder
│   │       ├── RoomDetail.vue # Placeholder
│   │       └── UserManagement.vue # Placeholder
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.js
│
├── .gitlab-ci.yml        # CI/CD Pipeline config
├── docker-compose.prod.yml  # Production docker-compose
└── README.md
```

## 🎯 วัตถุประสงค์

- **ทดสอบ CI/CD Pipeline** - ตรวจสอบว่า build และ push images ทำงานได้
- **ทดสอบ Docker Build** - ตรวจสอบว่า Dockerfile ทำงานถูกต้อง
- **ทดสอบ Registry** - ตรวจสอบว่า push/pull images จาก GitLab Registry ทำงานได้

## ⚠️ หมายเหตุ

### Frontend (Minimal Version)
- `Login.vue` - ใช้ dummy login (ไม่เรียก API จริง)
- `Dashboard.vue` - แสดง placeholder เท่านั้น
- `RoomDetail.vue` - แสดง placeholder เท่านั้น
- `UserManagement.vue` - แสดง placeholder เท่านั้น

**เหตุผล:** เพื่อให้ build ผ่านได้เร็ว ไม่ต้องรอ API หรือ database

### Backend (Full Version)
- ใช้ `server.js` แบบเต็ม เพราะต้องทำงานจริง
- มี API endpoints ครบถ้วน

## 🚀 การใช้งาน

1. **Push code ไป GitLab:**
   ```bash
   cd fortest-ci-cd
   git init
   git add .
   git commit -m "Initial commit - CI/CD test"
   git remote add origin http://192.168.100.130/root/devops-project.git
   git push -u origin main
   ```

2. **ตรวจสอบ Pipeline:**
   - ไปที่ GitLab → CI/CD → Pipelines
   - ดูว่า build-backend และ build-frontend ผ่านหรือไม่

3. **ทดสอบ Deploy (ถ้าต้องการ):**
   - ตั้งค่า SSH_PRIVATE_KEY ใน GitLab Variables
   - Trigger deploy-production job

## 📝 สิ่งที่ต้องแก้ไขก่อนใช้งานจริง

1. **IP Addresses:**
   - `.gitlab-ci.yml` - เปลี่ยน `192.168.100.130` และ `192.168.100.131` ให้ตรงกับ IP จริง
   - `docker-compose.prod.yml` - เปลี่ยน `192.168.100.130:5050` ให้ตรงกับ Registry IP

2. **GitLab Variables:**
   - ตั้งค่า `SSH_PRIVATE_KEY` ใน GitLab → Settings → CI/CD → Variables

3. **Frontend (ถ้าต้องการใช้งานจริง):**
   - แก้ไข `Login.vue` ให้เรียก API จริง
   - แก้ไข `Dashboard.vue`, `RoomDetail.vue`, `UserManagement.vue` ให้ทำงานจริง

## ✅ Checklist สำหรับทดสอบ CI/CD

- [ ] Push code ไป GitLab
- [ ] Pipeline build-backend ผ่าน
- [ ] Pipeline build-frontend ผ่าน
- [ ] Images push ไป Registry สำเร็จ
- [ ] Pull images จาก Registry ได้
- [ ] Deploy ไป VM2 สำเร็จ (ถ้าต้องการ)

---

**หมายเหตุ:** โฟลเดอร์นี้ใช้สำหรับทดสอบ CI/CD เท่านั้น สำหรับ production ให้ใช้โค้ดจาก `backend/` และ `frontend/` ที่ root level

