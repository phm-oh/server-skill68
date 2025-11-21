# Troubleshooting Guide - แก้ปัญหาที่พบบ่อย

## 🔴 ปัญหา 1: GitLab เปิดไม่ได้ / Login ไม่ได้

### อาการ
- เปิด http://192.168.100.101 ไม่ได้
- Login แล้วบอกว่าไม่มี user
- 502 Bad Gateway

### สาเหตุ
- GitLab ยัง boot ไม่เสร็จ (ใช้เวลา 5-10 นาที)
- Initial password ไม่ถูกสร้าง
- Container ไม่ healthy

### วิธีแก้

**1. ตรวจสอบว่า GitLab พร้อมหรือยัง:**
```bash
docker compose ps
docker compose logs -f gitlab
# รอจนเห็น "gitlab Reconfigured!"
```

**2. Reset password:**
```bash
# วิธีที่ 1: ใช้ gitlab-rake (เร็ว)
docker exec -it gitlab gitlab-rake "gitlab:password:reset[root]"
# รอ 30-60 วินาที แล้วใส่ password ใหม่: DevOps@2024!
```

**3. วิธีที่ 2: ใช้ Rails console (ถ้าวิธีแรกไม่ได้)**
```bash
docker exec -it gitlab gitlab-rails console -e production
# รอ 1-2 นาที จนได้ prompt แล้วพิมพ์:
user = User.find_by(username: 'root')
user.password = 'DevOps@2024!'
user.password_confirmation = 'DevOps@2024!'
user.save!
exit
```

**4. Restart GitLab:**
```bash
docker compose restart gitlab
```

---

## 🔴 ปัญหา 2: GitLab Runner ไม่สามารถ build image ได้

### อาการ
- Pipeline fail ที่ build stage
- Error: "Cannot connect to Docker daemon"
- Error: "unauthorized: authentication required"

### สาเหตุ
- Runner ไม่มี privileged mode
- ไม่มี access ไป Docker socket
- Registry login ไม่สำเร็จ

### วิธีแก้

**1. ตรวจสอบ Runner config:**
```bash
docker exec gitlab-runner cat /etc/gitlab-runner/config.toml
```

**ต้องมี:**
```toml
[[runners]]
  [runners.docker]
    privileged = true
    volumes = ["/var/run/docker.sock:/var/run/docker.sock"]
```

**2. แก้ไข config.toml:**
```bash
docker exec -it gitlab-runner vi /etc/gitlab-runner/config.toml
# เพิ่ม privileged = true ใน [runners.docker]
# Restart runner
docker compose restart gitlab-runner
```

**3. ตรวจสอบ Registry login ใน pipeline:**
```yaml
before_script:
  - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
```

**4. ตรวจสอบ insecure-registry:**
```bash
docker info | grep -A 5 "Insecure Registries"
# ต้องเห็น 192.168.100.101:5050
```

---

## 🔴 ปัญหา 3: Push image ไป Registry ไม่ได้

### อาการ
- Error: "unauthorized: authentication required"
- Error: "http: server gave HTTP response to HTTPS client"

### สาเหตุ
- Registry ใช้ HTTP แต่ Docker คิดว่าเป็น HTTPS
- ไม่ได้ตั้ง insecure-registry

### วิธีแก้

**1. ตั้งค่า insecure-registry ใน Docker daemon:**
```bash
sudo nano /etc/docker/daemon.json
```

**เพิ่ม:**
```json
{
  "insecure-registries": [
    "192.168.100.101:5050"
  ]
}
```

**2. Restart Docker:**
```bash
sudo systemctl restart docker
```

**3. Login ใหม่:**
```bash
docker login 192.168.100.101:5050
# Username: root
# Password: DevOps@2024!
```

**4. ใน GitLab CI/CD pipeline ต้องมี:**
```yaml
services:
  - name: docker:24-dind
    command: ["--insecure-registry=192.168.100.101:5050"]
```

---

## 🔴 ปัญหา 4: Runner ไม่เห็นใน GitLab

### อาการ
- Register runner แล้ว แต่ไม่เห็นใน GitLab UI
- Runner status: "never contacted"

### สาเหตุ
- Network ไม่เชื่อมต่อ
- URL หรือ Token ผิด

### วิธีแก้

**1. ตรวจสอบ network:**
```bash
docker exec gitlab-runner ping gitlab
# ถ้า ping ไม่ได้ ให้ใช้ IP แทน hostname
```

**2. Register ใหม่ด้วย IP:**
```bash
docker exec -it gitlab-runner gitlab-runner register \
  --url "http://192.168.100.101" \
  --token "YOUR_TOKEN" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --docker-privileged \
  --description "DevOps Runner"
```

**3. ตรวจสอบ logs:**
```bash
docker logs gitlab-runner
```

---

## 🔴 ปัญหา 5: Docker จาก Ubuntu repository มีปัญหา

### อาการ
- Docker version เก่า
- บางคำสั่งไม่ทำงาน

### วิธีแก้

**ตรวจสอบ version:**
```bash
docker --version
# ถ้าเก่าเกินไป อาจต้องใช้ official script
```

**ถ้าจำเป็นต้องใช้ official script:**
```bash
curl -fsSL https://get.docker.com | sudo sh
# แต่จะใช้เวลานานกว่า
```

**สำหรับแข่ง: Docker จาก Ubuntu ควรพอใช้**

---

## 🔴 ปัญหา 6: MQTT ไม่รับข้อมูลจาก ESP32

### อาการ
- ESP32 ส่งข้อมูลแล้ว แต่ Backend ไม่ได้รับ
- Node-RED ไม่เห็น message

### วิธีแก้

**1. ตรวจสอบ MQTT Broker:**
```bash
docker compose logs mqtt
```

**2. ทดสอบ subscribe:**
```bash
docker exec -it mqtt mosquitto_sub -t "room1/temperature" -v
```

**3. ตรวจสอบ ESP32:**
- WiFi เชื่อมต่อแล้วหรือยัง
- MQTT Broker IP ถูกต้องหรือไม่
- Topic ถูกต้องหรือไม่

**4. ตรวจสอบ Node-RED:**
- เปิด http://192.168.100.102:1880
- ตรวจสอบ flow ว่า subscribe topic ถูกต้องหรือไม่

---

## 🔴 ปัญหา 7: Database connection error

### อาการ
- Backend ไม่สามารถเชื่อมต่อ database ได้
- Error: "Access denied for user"

### วิธีแก้

**1. ตรวจสอบ database พร้อมหรือยัง:**
```bash
docker compose ps db
# ต้องเป็น healthy
```

**2. ตรวจสอบ credentials:**
```bash
# ใน docker-compose.yml
DB_USER=devops
DB_PASSWORD=devops123
DB_NAME=devops_db
```

**3. ทดสอบ connection:**
```bash
docker exec -it db mysql -u devops -pdevops123 devops_db
```

**4. ตรวจสอบ init.sql:**
```bash
docker exec -it db cat /docker-entrypoint-initdb.d/init.sql
```

---

## ✅ Checklist แก้ปัญหา

- [ ] GitLab healthy แล้ว (รอ 5-10 นาที)
- [ ] Password reset แล้ว
- [ ] Runner register แล้ว
- [ ] Runner config มี privileged = true
- [ ] insecure-registry ตั้งค่าแล้ว
- [ ] Docker restart แล้ว
- [ ] Registry login สำเร็จ
- [ ] Database healthy
- [ ] MQTT Broker running
- [ ] ESP32 เชื่อมต่อ WiFi และ MQTT แล้ว

---

## 📞 Quick Commands

```bash
# ดู status ทั้งหมด
docker compose ps

# ดู logs
docker compose logs -f [service-name]

# Restart service
docker compose restart [service-name]

# เข้า shell ใน container
docker exec -it [container-name] sh

# ตรวจสอบ network
docker network ls
docker network inspect [network-name]
```


