CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_access (
    user_id INT,
    room_id INT,
    PRIMARY KEY (user_id, room_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    temp FLOAT,
    humid FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- New Table for Discovery
CREATE TABLE IF NOT EXISTS device_log (
    topic VARCHAR(255) PRIMARY KEY,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 1. Insert Users (Admin: 1234, User: 1234)
INSERT IGNORE INTO users (username, password, role) VALUES 
('admin', '$2a$10$x.pb.x/x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.', 'admin'),
('user1', '$2a$10$x.pb.x/x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.', 'user'),
('user3', '$2a$10$x.pb.x/x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.x.pb.', 'user');

-- 2. Insert Rooms
INSERT IGNORE INTO rooms (name, image) VALUES 
('Server Room A', ''), 
('Server Room B', '');

-- 3. Assign Access (User1 sees Room A)
INSERT IGNORE INTO room_access (user_id, room_id) 
SELECT u.id, r.id FROM users u, rooms r WHERE u.username='user1' AND r.name='Server Room A';

-- 4. Mock Sensor Data (Last 24 Hours)
-- PROCEDURE to generate dummy data
DELIMITER $$
CREATE PROCEDURE GenerateData()
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE roomA_id INT;
  DECLARE roomB_id INT;
  SELECT id INTO roomA_id FROM rooms WHERE name='Server Room A';
  SELECT id INTO roomB_id FROM rooms WHERE name='Server Room B';
  
  WHILE i < 100 DO
    INSERT INTO sensor_data (room_id, temp, humid, timestamp) VALUES 
    (roomA_id, 20 + RAND()*5, 40 + RAND()*10, DATE_SUB(NOW(), INTERVAL i*15 MINUTE)),
    (roomB_id, 22 + RAND()*5, 45 + RAND()*10, DATE_SUB(NOW(), INTERVAL i*15 MINUTE));
    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;

CALL GenerateData();
