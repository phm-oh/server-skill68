#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ==========================================
// CONFIGURATION (แก้ตรงนี้)
// ==========================================
const char* SSID = "YOUR_WIFI_NAME";       // ชื่อ WiFi
const char* PASSWORD = "YOUR_WIFI_PASS";   // รหัส WiFi

const char* MQTT_SERVER = "192.168.1.100"; // IP ของเครื่อง Server (ที่รัน Docker)
const int MQTT_PORT = 1883;

const char* ROOM_NAME = "Server Room A";   // ชื่อห้อง (ต้องตรงกับใน Web Admin เป๊ะๆ)
const char* MQTT_TOPIC = "sensor/Server Room A/data"; // Topic: sensor/ชื่อห้อง/data

#define DHTPIN 4        // ขา GPIO ที่ต่อ Sensor (เช่น D4)
#define DHTTYPE DHT22   // รุ่น Sensor (DHT11 หรือ DHT22)
// ==========================================

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

long lastMsg = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  setup_wifi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(SSID);

  WiFi.begin(SSID, PASSWORD);

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
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
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

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Send data every 5 seconds
  long now = millis();
  if (now - lastMsg > 5000) {
    lastMsg = now;
    
    // Read Sensor
    float h = dht.readHumidity();
    float t = dht.readTemperature();

    // Check if any reads failed and exit early (to try again).
    if (isnan(h) || isnan(t)) {
      Serial.println("Failed to read from DHT sensor!");
      // Mock Data if sensor fails (Optional - for testing)
      // t = 25.0 + random(0, 5);
      // h = 60.0 + random(0, 10);
      return;
    }

    // Create JSON Payload manually
    String payload = "{\"temp\":";
    payload += String(t);
    payload += ",\"humid\":";
    payload += String(h);
    payload += "}";

    Serial.print("Publish message: ");
    Serial.println(payload);
    
    // Publish to MQTT
    client.publish(MQTT_TOPIC, payload.c_str());
  }
}

