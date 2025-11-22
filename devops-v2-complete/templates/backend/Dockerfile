# ===========================================
# Dockerfile สำหรับ Backend (Node.js + Express)
# ===========================================
# วางไฟล์นี้ที่: backend/Dockerfile
# ===========================================

FROM node:18-alpine

# สร้าง app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
