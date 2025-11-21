#!/bin/bash
###############################################################################
# GitLab DevOps Stack - Auto Setup Script (ใช้ Docker จาก Ubuntu)
# สำหรับการแข่งขัน DevOps - เรียบง่าย รวดเร็ว
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GitLab DevOps Stack Setup Script     ${NC}"
echo -e "${BLUE}========================================${NC}"

VM_IP="192.168.100.101"

echo -e "${GREEN}✓ ใช้ IP: $VM_IP${NC}"

# ติดตั้ง Docker จาก Ubuntu repository (ง่าย เร็ว)
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

# ตั้งค่า Docker Daemon
echo -e "\n${YELLOW}กำลังตั้งค่า Docker Daemon...${NC}"
sudo tee /etc/docker/daemon.json > /dev/null << EOF
{
  "insecure-registries": [
    "${VM_IP}:5050",
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

sudo systemctl restart docker
echo -e "${GREEN}✓ ตั้งค่า Docker Daemon สำเร็จ${NC}"

# เริ่ม services
echo -e "\n${YELLOW}กำลังเริ่ม Services...${NC}"
docker compose up -d

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ติดตั้งสำเร็จ!                        ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}GitLab กำลัง boot (รอ 5-10 นาที)${NC}"
echo ""
echo -e "URLs:"
echo -e "  GitLab:      ${BLUE}http://${VM_IP}${NC}"
echo -e "  Portainer:   ${BLUE}http://${VM_IP}:9000${NC}"
echo -e "  Registry UI: ${BLUE}http://${VM_IP}:8080${NC}"
echo -e "  Grafana:     ${BLUE}http://${VM_IP}:3000${NC}"
echo -e "  Prometheus:  ${BLUE}http://${VM_IP}:9090${NC}"
echo ""
echo -e "GitLab Login:"
echo -e "  Username: ${GREEN}root${NC}"
echo -e "  Password: ${GREEN}DevOps@2024!${NC}"
echo ""
echo -e "${YELLOW}ตรวจสอบ status:${NC}"
echo "  docker compose ps"
echo "  docker compose logs -f gitlab"
echo ""
echo -e "${YELLOW}หลัง GitLab พร้อม ให้ register runner:${NC}"
echo "  1. ไปที่ GitLab → Admin → CI/CD → Runners → New instance runner"
echo "  2. รัน: docker exec -it gitlab-runner gitlab-runner register"
