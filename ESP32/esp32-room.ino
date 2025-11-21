/*
 * ESP32 Room Temperature Monitor
 * ส่งข้อมูลอุณหภูมิไปยัง MQTT Broker
 * สำหรับการแข่งขัน DevOps
 * 
 * Hardware:
 * - ESP32
 * - DHT22 Temperature Sensor (GPIO 4)
 * 
 * WiFi: udvcit
 * MQTT Broker: 192.168.100.102:1883
 * Topic: room1/temperature (เปลี่ยนตามห้อง)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// WiFi Credentials
const char* ssid = "udvcit";
const char* password = "";  // ถ้ามี password

// MQTT Settings
const char* mqtt_server = "192.168.100.102";
const int mqtt_port = 1883;
const char* mqtt_topic = "room1/temperature";  // เปลี่ยนเป็น room2 หรือ room3

// DHT Sensor
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Room ID (เปลี่ยนตาม ESP32)
String room_id = "ESP32-ROOM1";  // เปลี่ยนเป็น ROOM2 หรือ ROOM3

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32-" + room_id;
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // อ่านค่าจาก DHT22
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temp) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    delay(2000);
    return;
  }

  // สร้าง JSON message
  String payload = "{";
  payload += "\"temp\":" + String(temp) + ",";
  payload += "\"temperature\":" + String(temp) + ",";
  payload += "\"humidity\":" + String(humidity) + ",";
  payload += "\"room\":\"" + room_id + "\"";
  payload += "}";

  // Publish ไปยัง MQTT
  if (client.publish(mqtt_topic, payload.c_str())) {
    Serial.print("Published: ");
    Serial.println(payload);
  } else {
    Serial.println("Publish failed");
  }

  // ส่งทุก 10 วินาที
  delay(10000);
}


