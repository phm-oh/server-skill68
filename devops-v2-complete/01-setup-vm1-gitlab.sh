#!/bin/bash

# ===========================================
# 🚀 DevOps Server Setup - VM1 (GitLab Server)
# ===========================================
# IP: 192.168.100.101
# ไม่ใช้ HTTPS - ง่ายและเร็ว!
# 
# วิธีใช้:
# 1. SSH เข้า server: ssh user@192.168.100.101
# 2. Copy script นี้ทั้งหมด
# 3. Paste ลง terminal แล้ว Enter
# ===========================================

set -e

echo ""
echo "=========================================="
echo "  🚀 DevOps Server Setup - VM1"
echo "  GitLab + Runner + Registry"
echo "=========================================="
echo ""

# ===========================================
# Configuration
# ===========================================
VM1_IP="192.168.100.101"
VM2_IP="192.168.100.102"

# ===========================================
# Step 1: Update System
# ===========================================
echo "[1/7] 📦 อัพเดท System..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nano

# ===========================================
# Step 2: Install Docker
# ===========================================
echo "[2/7] 🐳 ติดตั้ง Docker..."

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
# Step 3: Create Network and Volumes
# ===========================================
echo "[3/7] 📁 สร้าง Network และ Volumes..."

sudo docker network create app_net 2>/dev/null || true

for vol in gitlab_config gitlab_logs gitlab_data gitlab_runner_config registry_data portainer_data; do
    sudo docker volume create $vol 2>/dev/null || true
done

# ===========================================
# Step 4: Create docker-compose files
# ===========================================
echo "[4/7] 📝 สร้างไฟล์ Docker Compose..."

mkdir -p ~/devops-setup
cd ~/devops-setup

# --- GitLab ---
cat > docker-compose.gitlab.yml << 'GITLAB_EOF'
services:
  gitlab:
    image: 'gitlab/gitlab-ce:latest'
    container_name: gitlab
    restart: always
    hostname: 'gitlab.local'
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'http://192.168.100.101'
        gitlab_rails['gitlab_shell_ssh_port'] = 2222
        # Performance tuning
        puma['worker_processes'] = 2
        sidekiq['concurrency'] = 10
        prometheus_monitoring['enable'] = false
        gitlab_rails['time_zone'] = 'Asia/Bangkok'
    ports:
      - '80:80'
      - '2222:22'
    shm_size: "512m"
    volumes:
      - 'gitlab_config:/etc/gitlab'
      - 'gitlab_logs:/var/log/gitlab'
      - 'gitlab_data:/var/opt/gitlab'
    networks:
      - app_net

networks:
  app_net:
    external: true

volumes:
  gitlab_config:
    external: true
  gitlab_logs:
    external: true
  gitlab_data:
    external: true
GITLAB_EOF

# --- GitLab Runner ---
cat > docker-compose.runner.yml << 'RUNNER_EOF'
services:
  gitlab-runner:
    image: gitlab/gitlab-runner:alpine
    container_name: gitlab-runner
    restart: always
    privileged: true
    environment:
      - TZ=Asia/Bangkok
    volumes:
      - gitlab_runner_config:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    extra_hosts:
      - "gitlab.local:192.168.100.101"
    networks:
      - app_net

networks:
  app_net:
    external: true

volumes:
  gitlab_runner_config:
    external: true
RUNNER_EOF

# --- Registry ---
cat > docker-compose.registry.yml << 'REGISTRY_EOF'
services:
  registry:
    image: registry:2
    container_name: registry
    restart: always
    ports:
      - "5000:5000"
    environment:
      REGISTRY_STORAGE_DELETE_ENABLED: 'true'
    volumes:
      - registry_data:/var/lib/registry
    networks:
      - app_net

  registry-ui:
    image: joxit/docker-registry-ui:main
    container_name: registry-ui
    restart: always
    ports:
      - "8080:80"
    environment:
      - SINGLE_REGISTRY=true
      - REGISTRY_TITLE=Docker Registry
      - DELETE_IMAGES=true
      - SHOW_CONTENT_DIGEST=true
      - NGINX_PROXY_PASS_URL=http://registry:5000
      - REGISTRY_SECURED=false
    depends_on:
      - registry
    networks:
      - app_net

networks:
  app_net:
    external: true

volumes:
  registry_data:
    external: true
REGISTRY_EOF

# --- Portainer ---
cat > docker-compose.portainer.yml << 'PORTAINER_EOF'
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - app_net

networks:
  app_net:
    external: true

volumes:
  portainer_data:
    external: true
PORTAINER_EOF

# ===========================================
# Step 5: Start Services
# ===========================================
echo "[5/7] 🚀 เริ่ม Services..."

cd ~/devops-setup

echo "  Starting Registry..."
sudo docker compose -f docker-compose.registry.yml up -d

echo "  Starting Portainer..."
sudo docker compose -f docker-compose.portainer.yml up -d

echo "  Starting GitLab (รอ 3-5 นาที)..."
sudo docker compose -f docker-compose.gitlab.yml up -d

echo "  Starting GitLab Runner..."
sudo docker compose -f docker-compose.runner.yml up -d

# ===========================================
# Step 6: Configure Docker for insecure registry
# ===========================================
echo "[6/7] ⚙️ ตั้งค่า Docker daemon..."

sudo mkdir -p /etc/docker
cat << EOF | sudo tee /etc/docker/daemon.json
{
  "insecure-registries": ["192.168.100.101:5000", "registry.local:5000"]
}
EOF

sudo systemctl restart docker

# Restart containers after docker restart
sleep 5
cd ~/devops-setup
sudo docker compose -f docker-compose.registry.yml up -d
sudo docker compose -f docker-compose.portainer.yml up -d
sudo docker compose -f docker-compose.gitlab.yml up -d
sudo docker compose -f docker-compose.runner.yml up -d

# ===========================================
# Step 7: Add hosts entry
# ===========================================
echo "[7/7] 📝 เพิ่ม hosts entry..."

if ! grep -q "gitlab.local" /etc/hosts; then
    echo "192.168.100.101 gitlab.local registry.local" | sudo tee -a /etc/hosts
fi

# ===========================================
# Done!
# ===========================================
echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📋 Services:"
echo "  - GitLab:       http://192.168.100.101"
echo "  - Registry:     http://192.168.100.101:5000"
echo "  - Registry UI:  http://192.168.100.101:8080"
echo "  - Portainer:    http://192.168.100.101:9000"
echo ""
echo "⏳ รอ GitLab พร้อม (3-5 นาที):"
echo "  sudo docker logs -f gitlab"
echo ""
echo "🔑 ดู GitLab Root Password:"
echo "  sudo docker exec -it gitlab grep 'Password:' /etc/gitlab/initial_root_password"
echo ""
echo "📌 ขั้นตอนถัดไป:"
echo "  1. รอ GitLab พร้อม แล้วเข้า http://192.168.100.101"
echo "  2. Login ด้วย root + password ที่ได้"
echo "  3. รัน script register runner (ดูไฟล์ register-runner.sh)"
echo ""
echo "⚠️ ถ้าใช้ docker ไม่ได้ ให้ logout แล้ว login ใหม่!"
echo ""
