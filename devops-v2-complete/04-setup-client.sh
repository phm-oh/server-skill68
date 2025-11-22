#!/bin/bash

# ===========================================
# 💻 Client Setup (เครื่องนักเรียน)
# ===========================================
# สำหรับเครื่องที่จะเขียน Code และ Push ไป GitLab
#
# รองรับ: Ubuntu / WSL / Git Bash
# ===========================================

echo ""
echo "=========================================="
echo "  💻 Client Setup (เครื่องนักเรียน)"
echo "=========================================="
echo ""

VM1_IP="192.168.100.101"
VM2_IP="192.168.100.102"

# ===========================================
# Step 1: Configure Git
# ===========================================
echo "[1/3] ⚙️ ตั้งค่า Git..."

# Skip SSL verification (เพราะใช้ HTTP อยู่แล้ว แต่เผื่อไว้)
git config --global http.sslVerify false

# ตั้งค่า user (ให้นักเรียนแก้เอง)
echo ""
echo "📝 ตั้งค่า Git user (แก้ไขตามชื่อจริง):"
echo "  git config --global user.name \"Your Name\""
echo "  git config --global user.email \"your@email.com\""
echo ""

# ===========================================
# Step 2: Add hosts entry
# ===========================================
echo "[2/3] 📝 เพิ่ม hosts entry..."

# Check if running as admin/root
if [ "$EUID" -eq 0 ] || [ -w /etc/hosts ]; then
    if ! grep -q "gitlab.local" /etc/hosts; then
        echo "$VM1_IP gitlab.local registry.local" | sudo tee -a /etc/hosts
        echo "$VM2_IP prod.local" | sudo tee -a /etc/hosts
    fi
    echo "  ✅ เพิ่ม hosts entry แล้ว"
else
    echo ""
    echo "  ⚠️ ไม่สามารถแก้ไข /etc/hosts ได้"
    echo "  กรุณาเพิ่มบรรทัดนี้ใน /etc/hosts หรือ C:\\Windows\\System32\\drivers\\etc\\hosts:"
    echo ""
    echo "  $VM1_IP gitlab.local registry.local"
    echo "  $VM2_IP prod.local"
    echo ""
fi

# ===========================================
# Step 3: Configure Docker (if installed)
# ===========================================
echo "[3/3] 🐳 ตั้งค่า Docker (ถ้ามี)..."

if command -v docker &> /dev/null; then
    echo ""
    echo "  พบ Docker! กรุณาเพิ่ม insecure registry:"
    echo ""
    echo "  สำหรับ Linux: แก้ไข /etc/docker/daemon.json"
    echo "  สำหรับ Docker Desktop: Settings > Docker Engine"
    echo ""
    echo '  {
    "insecure-registries": ["192.168.100.101:5000"]
  }'
    echo ""
else
    echo "  ไม่พบ Docker (ข้ามขั้นตอนนี้)"
fi

# ===========================================
# Summary
# ===========================================
echo ""
echo "=========================================="
echo "  ✅ Client Setup Complete!"
echo "=========================================="
echo ""
echo "📋 URLs:"
echo "  - GitLab:       http://192.168.100.101"
echo "  - Registry UI:  http://192.168.100.101:8080"
echo "  - Production:   http://192.168.100.102"
echo ""
echo "📌 ขั้นตอนถัดไป:"
echo "  1. เข้า GitLab แล้วสร้าง account หรือ login"
echo "  2. สร้าง Project ใหม่"
echo "  3. Clone repo มาเครื่อง:"
echo "     git clone http://192.168.100.101/username/project.git"
echo "  4. เขียน code แล้ว push:"
echo "     git add ."
echo "     git commit -m \"First commit\""
echo "     git push origin main"
echo ""
