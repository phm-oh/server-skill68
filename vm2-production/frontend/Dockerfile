# Dockerfile - Frontend (Vue.js)
# ใช้ Caddy แทน Nginx - สั้นกว่า ง่ายกว่า

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production with Caddy
FROM caddy:2.8-alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/caddy

# Caddy config (สั้นมาก!)
RUN echo ':80 { \
    root * /usr/share/caddy \
    file_server \
    try_files {path} /index.html \
}' > /etc/caddy/Caddyfile

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1


