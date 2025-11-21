-- init.sql - Database Initialization
-- สำหรับระบบ IoT Room Monitoring (3 ห้อง, ESP32, User Management)
-- จะถูกรันอัตโนมัติเมื่อ MariaDB container เริ่มครั้งแรก

-- สร้าง Database
CREATE DATABASE IF NOT EXISTS devops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE devops_db;

-- ==========================================================================
-- ตาราง Users (สำหรับ Authentication)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- ==========================================================================
-- ตาราง Rooms (3 ห้อง)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    esp32_device_id VARCHAR(50) NOT NULL UNIQUE,
    image_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_device_id (esp32_device_id)
) ENGINE=InnoDB;

-- ==========================================================================
-- ตาราง User_Rooms (User เห็นห้องไหนบ้าง)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS user_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_room (user_id, room_id),
    INDEX idx_user_id (user_id),
    INDEX idx_room_id (room_id)
) ENGINE=InnoDB;

-- ==========================================================================
-- ตาราง Temperatures (เก็บค่าอุณหภูมิจาก ESP32)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS temperatures (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    temperature DECIMAL(5, 2) NOT NULL,
    humidity DECIMAL(5, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB;

-- ==========================================================================
-- ตาราง Room_Images (รูปภาพประจำห้อง)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS room_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_room_id (room_id)
) ENGINE=InnoDB;

-- ==========================================================================
-- Insert Default Data
-- ==========================================================================

-- Default Users (password: admin123 และ user123)
-- ใช้ bcrypt hash (ง่ายๆ ใช้ plain text สำหรับแข่ง - ไม่ปลอดภัยแต่เร็ว)
-- ใน production ควร hash จริงๆ
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@devops.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
('user1', 'user1@devops.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user'),
('user2', 'user2@devops.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user')
ON DUPLICATE KEY UPDATE username=username;

-- 3 ห้อง (ESP32 3 ตัว)
INSERT INTO rooms (name, description, esp32_device_id) VALUES
('Room 1', 'ห้องที่ 1', 'ESP32-ROOM1'),
('Room 2', 'ห้องที่ 2', 'ESP32-ROOM2'),
('Room 3', 'ห้องที่ 3', 'ESP32-ROOM3')
ON DUPLICATE KEY UPDATE name=name;

-- User เห็นห้อง (Admin เห็นทุกห้อง, User1 เห็น Room1,2, User2 เห็น Room2,3)
INSERT INTO user_rooms (user_id, room_id) VALUES
(1, 1), (1, 2), (1, 3),  -- Admin เห็นทุกห้อง
(2, 1), (2, 2),          -- User1 เห็น Room1,2
(3, 2), (3, 3)            -- User2 เห็น Room2,3
ON DUPLICATE KEY UPDATE user_id=user_id;

-- Sample Temperature Data
INSERT INTO temperatures (room_id, temperature, humidity) VALUES
(1, 25.5, 60.0),
(1, 26.0, 61.0),
(2, 24.8, 58.0),
(2, 25.2, 59.0),
(3, 27.1, 65.0),
(3, 26.8, 64.0);

-- Grant permissions
GRANT ALL PRIVILEGES ON devops_db.* TO 'devops'@'%';
FLUSH PRIVILEGES;
