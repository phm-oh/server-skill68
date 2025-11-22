#!/bin/bash

# ===========================================
# 🖥️ Production Server Setup - VM2
# ===========================================
# IP: 192.168.100.102
# Domain: it.udvc.it (หรือเข้าผ่าน IP ตรงๆ)
#
# VM นี้จะรับ deployment จาก GitLab Runner
# ===========================================

set -e

echo ""
echo "=========================================="
echo "  🖥️ Production Server Setup - VM2"
echo "=========================================="
echo ""

VM1_IP="192.168.100.101"
VM2_IP="192.168.100.102"

# ===========================================
# Step 1: Update System
# ===========================================
echo "[1/5] 📦 อัพเดท System..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nano

# ===========================================
# Step 2: Install Docker
# ===========================================
echo "[2/5] 🐳 ติดตั้ง Docker..."

if command -v docker &> /dev/null; then
    echo "  Docker ติดตั้งแล้ว ข้าม..."
else
    sudo apt install -y ca-certificates curl gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
fi

# ===========================================
# Step 3: Configure Docker for insecure registry
# ===========================================
echo "[3/5] ⚙️ ตั้งค่า Docker daemon..."

sudo mkdir -p /etc/docker
cat << EOF | sudo tee /etc/docker/daemon.json
{
  "insecure-registries": ["192.168.100.101:5000", "registry.local:5000"]
}
EOF

sudo systemctl restart docker

# ===========================================
# Step 4: Add hosts entry
# ===========================================
echo "[4/5] 📝 เพิ่ม hosts entry..."

if ! grep -q "gitlab.local" /etc/hosts; then
    echo "192.168.100.101 gitlab.local registry.local" | sudo tee -a /etc/hosts
fi

# ===========================================
# Step 5: Create app directory
# ===========================================
echo "[5/5] 📁 สร้างโฟลเดอร์สำหรับ App..."

sudo mkdir -p /opt/app
sudo chown $USER:$USER /opt/app

# Create docker network
sudo docker network create app_net 2>/dev/null || true

# ===========================================
# Done!
# ===========================================
echo ""
echo "=========================================="
echo "  ✅ VM2 Setup Complete!"
echo "=========================================="
echo ""
echo "📋 ข้อมูล Server:"
echo "  - IP: 192.168.100.102"
echo "  - App Directory: /opt/app"
echo "  - Registry: 192.168.100.101:5000 (insecure)"
echo ""
echo "📌 ทดสอบ pull image จาก Registry:"
echo "  docker pull 192.168.100.101:5000/test-image:latest"
echo ""
echo "⚠️ ถ้าใช้ docker ไม่ได้ ให้ logout แล้ว login ใหม่!"
echo ""
