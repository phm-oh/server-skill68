# 📘 คู่มือการตั้งค่า Node-RED Flows

## 🎯 วัตถุประสงค์

Node-RED ทำหน้าที่รับข้อมูลจาก ESP32 ผ่าน MQTT และส่งต่อไปยัง Backend API

**Flow:** ESP32 → MQTT → Node-RED → Backend API → Database

---

## ✅ วิธีที่ 1: ใช้ flows.json (อัตโนมัติ - แนะนำ)

### Step 1: ตรวจสอบ flows.json

```bash
# ตรวจสอบว่าไฟล์มีอยู่:
cat nodered/flows.json

# ควรเห็น flows สำหรับ room1, room2, room3
```

### Step 2: ตรวจสอบว่า Node-RED import flows.json หรือไม่

```bash
# ตรวจสอบใน container:
docker exec nodered cat /data/flows.json

# ถ้าไม่มี ให้ copy:
docker cp nodered/flows.json nodered:/data/flows.json

# Restart Node-RED:
docker compose restart nodered
```

### Step 3: ตรวจสอบใน Web UI

1. เปิด http://192.168.100.102:1880
2. ควรเห็น flow "ESP32 MQTT to Backend"
3. ตรวจสอบว่า nodes เป็นสีเขียว (connected)
4. ถ้าเป็นสีแดง → ดู Troubleshooting ด้านล่าง

---

## 🔧 วิธีที่ 2: Config ผ่าน Web UI (ถ้าวิธีที่ 1 ไม่ได้)

### Step 1: เปิด Node-RED Web UI

- URL: http://192.168.100.102:1880
- Login: admin / admin123 (ถ้าตั้งไว้)

### Step 2: สร้าง MQTT Broker Config

1. ลาก "mqtt in" node จาก palette มาวาง
2. Double-click ที่ node
3. Click "Edit" ข้างๆ mqtt-broker
4. ตั้งค่า:
   - **Name:** Mosquitto
   - **Server:** `mqtt`
   - **Port:** `1883`
5. Click "Add" แล้ว "Update"

### Step 3: สร้าง Flow สำหรับ Room 1

1. **MQTT In Node:**
   - ลาก "mqtt in" node มาวาง
   - Double-click → ตั้งชื่อ "Room 1 Temperature"
   - Topic: `room1/temperature`
   - Broker: เลือก "Mosquitto"
   - Click "Done"

2. **HTTP Request Node:**
   - ลาก "http request" node มาวาง
   - Double-click → ตั้งชื่อ "Send to Backend"
   - Method: `POST`
   - URL: `http://backend:3000/api/mqtt/room1`
   - Click "Done"

3. **เชื่อมต่อ Nodes:**
   - ลากเส้นจาก "mqtt in" → "http request"

### Step 4: Copy Flow สำหรับ Room 2 และ Room 3

1. **Copy Flow Room 1:**
   - Select nodes ทั้งหมด (Ctrl+A หรือลากครอบ)
   - Copy (Ctrl+C)

2. **Paste และแก้ไข Room 2:**
   - Paste (Ctrl+V)
   - Double-click "mqtt in" → แก้ Topic เป็น `room2/temperature`
   - Double-click "http request" → แก้ URL เป็น `http://backend:3000/api/mqtt/room2`

3. **Paste และแก้ไข Room 3:**
   - Paste อีกครั้ง
   - Double-click "mqtt in" → แก้ Topic เป็น `room3/temperature`
   - Double-click "http request" → แก้ URL เป็น `http://backend:3000/api/mqtt/room3`

### Step 5: Deploy Flow

1. Click "Deploy" ที่มุมขวาบน
2. ตรวจสอบว่า nodes เป็นสีเขียว (connected)
3. ถ้าเป็นสีแดง → ดู Troubleshooting

---

## 🧪 ทดสอบ Node-RED

### Test 1: ทดสอบ MQTT Connection

```bash
# Publish message (จำลอง ESP32):
docker exec -it mqtt mosquitto_pub -h localhost -t "room1/temperature" -m '{"temp":25.5,"humidity":60}'
```

**ตรวจสอบ:**
- ใน Node-RED Web UI → Debug panel (ด้านขวา) → ควรเห็น message
- Backend logs → ควรเห็น "Saved temp: Room 1 = 25.5°C"

### Test 2: ตรวจสอบ Database

```bash
# ตรวจสอบข้อมูลใน database:
docker exec -it db mysql -u devops -pdevops123 devops_db -e "SELECT r.name, t.temperature, t.humidity, t.recorded_at FROM temperatures t JOIN rooms r ON t.room_id = r.id ORDER BY t.id DESC LIMIT 5;"
```

### Test 3: ทดสอบทั้ง 3 ห้อง

```bash
# Room 1:
docker exec -it mqtt mosquitto_pub -h localhost -t "room1/temperature" -m '{"temp":25.5,"humidity":60}'

# Room 2:
docker exec -it mqtt mosquitto_pub -h localhost -t "room2/temperature" -m '{"temp":26.0,"humidity":65}'

# Room 3:
docker exec -it mqtt mosquitto_pub -h localhost -t "room3/temperature" -m '{"temp":24.5,"humidity":55}'
```

---

## 🔍 Troubleshooting

### ปัญหา 1: Node-RED ไม่รับ MQTT

**ตรวจสอบ:**
```bash
# 1. ตรวจสอบ MQTT broker:
docker compose logs mqtt

# 2. ทดสอบ MQTT connection:
docker exec -it mqtt mosquitto_sub -h localhost -t "room1/temperature" -v

# 3. ตรวจสอบ network:
docker network inspect vm2-production_app-network
# ตรวจสอบว่า nodered, mqtt, backend อยู่ใน network เดียวกัน
```

**แก้ไข:**
- ตรวจสอบว่า MQTT broker config ใน Node-RED ใช้ `mqtt` (hostname) ไม่ใช่ IP
- ตรวจสอบว่า MQTT broker ทำงานอยู่: `docker compose ps mqtt`

### ปัญหา 2: HTTP Request ไม่ส่งไป Backend

**ตรวจสอบ:**
```bash
# 1. ตรวจสอบ Backend ทำงาน:
docker compose ps backend

# 2. ตรวจสอบ Backend logs:
docker compose logs backend

# 3. ทดสอบ Backend API:
docker exec -it backend wget -qO- http://localhost:3000/health
```

**แก้ไข:**
- ตรวจสอบว่า URL ใน HTTP request ใช้ `http://backend:3000` (hostname) ไม่ใช่ IP
- ตรวจสอบว่า Backend ทำงานอยู่

### ปัญหา 3: Nodes เป็นสีแดง

**ตรวจสอบ:**
```bash
# ดู Node-RED logs:
docker compose logs nodered
```

**แก้ไข:**
- ตรวจสอบ config ของแต่ละ node
- ตรวจสอบว่า broker/service ทำงานอยู่
- Restart Node-RED: `docker compose restart nodered`

### ปัญหา 4: flows.json ไม่ถูก import

**แก้ไข:**
```bash
# 1. Copy flows.json ใหม่:
docker cp nodered/flows.json nodered:/data/flows.json

# 2. Restart Node-RED:
docker compose restart nodered

# 3. ตรวจสอบ:
docker exec nodered cat /data/flows.json
```

---

## 📊 Flow Diagram

```
ESP32-ROOM1 → MQTT (room1/temperature) → Node-RED → HTTP POST → Backend API → Database
ESP32-ROOM2 → MQTT (room2/temperature) → Node-RED → HTTP POST → Backend API → Database
ESP32-ROOM3 → MQTT (room3/temperature) → Node-RED → HTTP POST → Backend API → Database
```

---

## ✅ Checklist

- [ ] Node-RED เปิดได้ (http://192.168.100.102:1880)
- [ ] MQTT Broker config ถูกต้อง (mqtt:1883)
- [ ] มี flows สำหรับ room1, room2, room3
- [ ] HTTP Request URLs ถูกต้อง (http://backend:3000/api/mqtt/roomX)
- [ ] Deploy flow สำเร็จ (nodes เป็นสีเขียว)
- [ ] ทดสอบ MQTT publish ได้
- [ ] ข้อมูลบันทึกลง Database ได้

---

## 💡 Tips

1. **ใช้ flows.json** - เร็วกว่า config ผ่าน Web UI
2. **ตรวจสอบ logs** - ถ้ามีปัญหาให้ดู logs ก่อน
3. **ทดสอบทีละขั้น** - ทดสอบ MQTT → Node-RED → Backend → Database
4. **ใช้ Debug node** - เพิ่ม debug node เพื่อดู message flow

