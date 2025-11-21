#!/bin/bash
###############################################################################
# VM2 Production Server - Setup Script (ใช้ Docker จาก Ubuntu)
# สำหรับการแข่งขัน DevOps - เรียบง่าย รวดเร็ว
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VM2 Production Server Setup          ${NC}"
echo -e "${BLUE}========================================${NC}"

VM2_IP="192.168.100.102"
VM1_IP="192.168.100.101"

echo -e "${GREEN}VM2 IP: $VM2_IP${NC}"
echo -e "${GREEN}VM1 (Registry): $VM1_IP:5050${NC}"

# ติดตั้ง Docker จาก Ubuntu repository
if ! command -v docker &> /dev/null; then
    echo -e "\n${YELLOW}กำลังติดตั้ง Docker จาก Ubuntu repository...${NC}"
    sudo apt update
    sudo apt install -y docker.io docker-compose
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ ติดตั้ง Docker สำเร็จ${NC}"
    echo -e "${YELLOW}⚠️  ต้อง logout/login ใหม่เพื่อใช้ docker โดยไม่ต้อง sudo${NC}"
else
    echo -e "${GREEN}✓ Docker ติดตั้งแล้ว${NC}"
fi

# ตั้งค่า insecure registry
echo -e "\n${YELLOW}ตั้งค่า Docker Daemon...${NC}"
sudo tee /etc/docker/daemon.json > /dev/null << EOF
{
  "insecure-registries": [
    "${VM1_IP}:5050"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
echo -e "${GREEN}✓ ตั้งค่า Docker Daemon สำเร็จ${NC}"

# สร้าง directories
mkdir -p mosquitto/config mosquitto/data mosquitto/log init-db nodered uploads

# ตั้ง permission
chmod -R 755 mosquitto/
chmod +x setup.sh

# Test login to registry
echo -e "\n${YELLOW}ทดสอบ login เข้า GitLab Registry...${NC}"
echo -e "${YELLOW}กรุณาใส่ GitLab credentials:${NC}"
echo -e "${YELLOW}Username: root${NC}"
echo -e "${YELLOW}Password: DevOps@2024!${NC}"
docker login ${VM1_IP}:5050

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Login Registry สำเร็จ${NC}"
else
    echo -e "${RED}✗ Login ไม่สำเร็จ - ตรวจสอบ credentials${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup เสร็จสมบูรณ์!                   ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}ขั้นตอนต่อไป:${NC}"
echo "1. Push images จาก GitLab CI/CD ไปที่ Registry ก่อน"
echo "2. รัน: docker compose up -d"
echo ""
echo -e "${YELLOW}หรือถ้าต้องการ test ก่อน push images:${NC}"
echo "docker compose up -d db phpmyadmin mqtt nodered"
echo ""
echo -e "URLs หลัง start:"
echo -e "  Main App:    ${BLUE}http://${VM2_IP}${NC}"
echo -e "  phpMyAdmin:  ${BLUE}http://${VM2_IP}:8081${NC}"
echo -e "  Node-RED:    ${BLUE}http://${VM2_IP}:1880${NC}"
echo -e "  MQTT:        ${BLUE}${VM2_IP}:1883${NC}"
