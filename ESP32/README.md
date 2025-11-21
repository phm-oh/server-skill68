# ESP32 Code สำหรับ IoT Room Monitoring

## Hardware Requirements
- ESP32 Development Board
- DHT22 Temperature & Humidity Sensor
- Jumper Wires

## Wiring
```
DHT22 → ESP32
VCC   → 3.3V
GND   → GND
DATA  → GPIO 4
```

## Configuration

### 1. เปลี่ยน Room ID
ในไฟล์ `esp32-room.ino`:
```cpp
String room_id = "ESP32-ROOM1";  // เปลี่ยนเป็น ROOM2 หรือ ROOM3
const char* mqtt_topic = "room1/temperature";  // เปลี่ยนเป็น room2 หรือ room3
```

### 2. WiFi Settings
```cpp
const char* ssid = "udvcit";
const char* password = "";  // ถ้ามี password
```

### 3. MQTT Broker
```cpp
const char* mqtt_server = "192.168.100.102";
const int mqtt_port = 1883;
```

## Installation

1. ติดตั้ง Library ใน Arduino IDE:
   - WiFi (built-in)
   - PubSubClient (Tools → Manage Libraries → search "PubSubClient")
   - DHT sensor library (search "DHT sensor library")

2. Upload code ไปยัง ESP32

3. เปิด Serial Monitor (115200 baud) เพื่อดู status

## Testing

1. ตรวจสอบว่า ESP32 เชื่อมต่อ WiFi ได้
2. ตรวจสอบว่าเชื่อมต่อ MQTT Broker ได้
3. ดูข้อมูลใน Node-RED หรือ Backend API

## Troubleshooting

- **WiFi ไม่เชื่อมต่อ**: ตรวจสอบ SSID และ password
- **MQTT ไม่เชื่อมต่อ**: ตรวจสอบ IP ของ MQTT Broker
- **Sensor ไม่อ่านค่าได้**: ตรวจสอบ wiring และ GPIO pin


