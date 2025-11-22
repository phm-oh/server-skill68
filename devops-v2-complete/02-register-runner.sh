#!/bin/bash

# ===========================================
# 🏃 Register GitLab Runner
# ===========================================
# รันหลังจาก GitLab พร้อมแล้ว
# 
# วิธีใช้:
# 1. เข้า GitLab http://192.168.100.101
# 2. ไป Admin Area > CI/CD > Runners > New instance runner
# 3. Copy token มา
# 4. รัน: ./02-register-runner.sh YOUR_TOKEN
# ===========================================

if [ -z "$1" ]; then
    echo ""
    echo "❌ กรุณาใส่ Runner Token!"
    echo ""
    echo "วิธีใช้: ./02-register-runner.sh YOUR_TOKEN"
    echo ""
    echo "วิธีหา Token:"
    echo "  1. เข้า http://192.168.100.101 (GitLab)"
    echo "  2. Login ด้วย root"
    echo "  3. ไป Admin Area (ไอคอน 🔧)"
    echo "  4. เลือก CI/CD > Runners"
    echo "  5. คลิก 'New instance runner'"
    echo "  6. Copy token (glrt-xxxxxxxxxx)"
    echo ""
    exit 1
fi

RUNNER_TOKEN="$1"
GITLAB_URL="http://192.168.100.101"

echo ""
echo "🏃 Registering GitLab Runner..."
echo "  GitLab URL: $GITLAB_URL"
echo "  Token: $RUNNER_TOKEN"
echo ""

docker exec -it gitlab-runner gitlab-runner register \
  --non-interactive \
  --url "$GITLAB_URL" \
  --token "$RUNNER_TOKEN" \
  --executor "docker" \
  --docker-image "docker:latest" \
  --docker-privileged \
  --docker-network-mode "app_net" \
  --docker-volumes "/var/run/docker.sock:/var/run/docker.sock" \
  --docker-extra-hosts "gitlab.local:192.168.100.101" \
  --docker-extra-hosts "192.168.100.101:192.168.100.101" \
  --description "docker-runner"

echo ""
echo "✅ Runner registered!"
echo ""
echo "ตรวจสอบ:"
echo "  docker exec -it gitlab-runner gitlab-runner verify"
echo ""
